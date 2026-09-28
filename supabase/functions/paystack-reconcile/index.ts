import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { applyMembershipRenewal } from "../_shared/renewal-effects.ts";
import { applyCourseEnrollment } from "../_shared/course-enrollment-effects.ts";
import { triggerCoursePurchaseProvisioning } from "../_shared/course-purchase-provisioning.ts";
import { applyExpeditedPayment } from "../_shared/expedited-payment-effects.ts";
import { logWebhookEvent } from "../_shared/webhook-audit.ts";

// Safety net for course-purchase/renewal/expedited-application payments that
// Paystack charged successfully but that never reached this DB — because the
// webhook delivery failed, the signature check rejected it (key mismatch),
// or the handler threw partway through. Runs on a schedule (see migration
// 20260908120100_schedule_paystack_reconcile.sql) and replays the exact same
// processing logic the webhook uses, so even a total webhook outage
// self-heals within one cron interval.

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How far back to look each run. Deliberately wide relative to the cron
// interval (every 30 minutes, see the schedule migration) so a slow Paystack
// API, a missed run, or clock drift can't create a gap between sweeps.
const LOOKBACK_HOURS = 6;
const MAX_PAGES = 10;
const PER_PAGE = 100;

interface PaystackTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown> | string | null;
  authorization?: { authorization_code?: string; reusable?: boolean };
}

function parseMetadata(raw: PaystackTransaction["metadata"]): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

async function fetchRecentSuccessfulTransactions(): Promise<PaystackTransaction[]> {
  const from = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const all: PaystackTransaction[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.paystack.co/transaction?status=success&from=${encodeURIComponent(from)}&perPage=${PER_PAGE}&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    if (!response.ok) {
      throw new Error(`Paystack list-transactions failed: ${response.status} ${await response.text()}`);
    }
    const json = await response.json();
    const data: PaystackTransaction[] = json.data || [];
    all.push(...data);
    if (data.length < PER_PAGE) break;
  }

  return all;
}

async function alreadyRecorded(supabase: any, reference: string): Promise<boolean> {
  const [orderRes, renewalRes, expeditedRes] = await Promise.all([
    supabase.from("orders").select("id").eq("paystack_reference", reference).maybeSingle(),
    supabase.from("renewal_history").select("id").eq("payment_reference", reference).maybeSingle(),
    supabase.from("expedited_applications").select("id").eq("paystack_reference", reference).maybeSingle(),
  ]);
  return !!(orderRes.data || renewalRes.data || expeditedRes.data);
}

function isServiceRoleJwt(authHeader: string): boolean {
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return false;
  const token = match[1];

  // The project's publishable/legacy anon key is public (shipped in the
  // client bundle), so gateway verify_jwt=true alone isn't enough to keep
  // this restricted to trusted callers — it only proves the bearer token is
  // *some* validly-signed Supabase key for this project, not which one.
  // Support both credential shapes Supabase issues for the service role:
  // the newer opaque `sb_secret_...` key, and the legacy JWT (still what's
  // stored in Vault for pg_cron, see the schedule migration) whose payload
  // carries `role: "service_role"`.
  if (token.startsWith("sb_secret_")) {
    return token === SUPABASE_SERVICE_ROLE_KEY;
  }

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!isServiceRoleJwt(authHeader)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let transactions: PaystackTransaction[];
  try {
    transactions = await fetchRecentSuccessfulTransactions();
  } catch (error) {
    console.error("paystack-reconcile: failed to fetch transactions", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  let recovered = 0;
  let alreadyOk = 0;
  let skipped = 0;
  let failed = 0;

  for (const txn of transactions) {
    const reference = txn.reference;
    if (!reference) continue;

    if (await alreadyRecorded(supabase, reference)) {
      alreadyOk++;
      continue;
    }

    const metadata = parseMetadata(txn.metadata);

    if (metadata.expeditedApplicationId) {
      const result = await applyExpeditedPayment(supabase, reference);
      await logWebhookEvent(supabase, {
        eventType: "charge.success",
        reference,
        signatureValid: null,
        status: result.success ? "reconciled_by_cron" : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "expedited", source: "reconcile" },
      });
      if (result.success) recovered++; else failed++;
      continue;
    }

    if (metadata.type === "renewal" && metadata.member_id) {
      const result = await applyMembershipRenewal(supabase, {
        memberId: metadata.member_id as string,
        paymentMethod: "paystack",
        amountPaid: txn.amount / 100,
        currency: "GHS",
        displayAmount: (metadata.display_amount as number) || txn.amount / 100,
        displayCurrency: (metadata.currency as string) || "USD",
        paymentReference: reference,
        incomeTier: (metadata.income_tier as string) || null,
      });
      await logWebhookEvent(supabase, {
        eventType: "charge.success",
        reference,
        signatureValid: null,
        status: result.success ? "reconciled_by_cron" : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "renewal", memberId: metadata.member_id, source: "reconcile" },
      });
      if (result.success) recovered++; else failed++;
      continue;
    }

    if (metadata.courseId) {
      const result = await applyCourseEnrollment(supabase, {
        userId: metadata.userId as string,
        courseId: metadata.courseId as string,
        paystackReference: reference,
        amount: txn.amount / 100,
        currency: txn.currency,
        amountUSD: metadata.amountUSD as number | undefined,
        amountGhs: metadata.amountGhs as number | undefined,
        exchangeRate: metadata.exchangeRate as number | undefined,
        originalCurrency: metadata.originalCurrency as string | undefined,
        chargedCurrency: metadata.chargedCurrency as string | undefined,
        enrollmentLevel: metadata.enrollmentLevel as string | undefined,
        paymentType: metadata.paymentType as string | undefined,
        companyName: metadata.companyName as string | undefined,
        companyEmail: metadata.companyEmail as string | undefined,
        vatId: metadata.vatId as string | undefined,
        accessTokenId: metadata.accessTokenId as string | undefined,
      });

      await logWebhookEvent(supabase, {
        eventType: "charge.success",
        reference,
        signatureValid: null,
        status: result.success ? "reconciled_by_cron" : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "course", courseId: metadata.courseId, userId: metadata.userId, source: "reconcile" },
      });

      if (result.success && !result.alreadyEnrolled) {
        await triggerCoursePurchaseProvisioning(supabase, {
          userId: metadata.userId as string,
          courseId: metadata.courseId as string,
          programmeType: (metadata.programmeType as string) || "PROFESSIONAL_PROGRAMME",
          enrollmentLevel: result.isAdjunctCourse ? null : ((metadata.enrollmentLevel as string) || "ASSOCIATE"),
          paymentType: (metadata.paymentType as string) || "individual",
          companyName: metadata.companyName as string | undefined,
          companyEmail: metadata.companyEmail as string | undefined,
          vatId: metadata.vatId as string | undefined,
        });
      }

      if (result.success) recovered++; else failed++;
      continue;
    }

    // No recognized metadata shape (e.g. an access-token/TOKEN- pseudo
    // reference, or a transaction from a different integration entirely) —
    // nothing to recover, just note it happened.
    await logWebhookEvent(supabase, {
      eventType: "charge.success",
      reference,
      signatureValid: null,
      status: "skipped",
      errorMessage: "No recognized metadata shape",
      metadata: { source: "reconcile" },
    });
    skipped++;
  }

  const summary = { scanned: transactions.length, recovered, alreadyOk, skipped, failed };
  console.log("paystack-reconcile summary:", summary);
  return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
});
