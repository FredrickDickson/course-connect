/**
 * Read-only audit: finds Paystack transactions marked successful that have
 * no matching row in orders / renewal_history / expedited_applications.
 *
 * Makes no writes anywhere — no Supabase inserts/updates, no Paystack
 * mutations. Safe to run repeatedly.
 *
 * Usage:
 *   PAYSTACK_SECRET_KEY=sk_live_... npx tsx scripts/audit-missing-payments.ts [--days=30]
 *
 * PAYSTACK_SECRET_KEY is read only from the environment at invocation —
 * intentionally not sourced from .env, so a live key never has to be added
 * to the shared dev config.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Set PAYSTACK_SECRET_KEY inline for this command, e.g.\n  PAYSTACK_SECRET_KEY=sk_live_... npx tsx scripts/audit-missing-payments.ts");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
}

const daysArg = process.argv.find((a) => a.startsWith("--days="));
const DAYS = daysArg ? Number(daysArg.split("=")[1]) : 30;
const PER_PAGE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PaystackTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string;
  created_at?: string;
  customer?: { email?: string };
  metadata: Record<string, unknown> | string | null;
}

function parseMetadata(raw: PaystackTransaction["metadata"]): Record<string, unknown> {
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

function guessKind(metadata: Record<string, unknown>): string {
  if (metadata.expeditedApplicationId) return "expedited";
  if (metadata.type === "renewal" && metadata.member_id) return "renewal";
  if (metadata.courseId) return "course";
  return "unrecognized";
}

async function fetchSuccessfulTransactions(sinceIso: string): Promise<PaystackTransaction[]> {
  const all: PaystackTransaction[] = [];
  for (let page = 1; ; page++) {
    const url = `https://api.paystack.co/transaction?status=success&from=${encodeURIComponent(sinceIso)}&perPage=${PER_PAGE}&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    if (!response.ok) {
      throw new Error(`Paystack list-transactions failed: ${response.status} ${await response.text()}`);
    }
    const json = await response.json();
    const data: PaystackTransaction[] = json.data || [];
    all.push(...data);
    console.log(`  fetched page ${page} (${data.length} txns, ${all.length} total so far)`);
    if (data.length < PER_PAGE) break;
  }
  return all;
}

async function alreadyRecorded(reference: string): Promise<boolean> {
  const [orderRes, renewalRes, expeditedRes] = await Promise.all([
    supabase.from("orders").select("id").eq("paystack_reference", reference).maybeSingle(),
    supabase.from("renewal_history").select("id").eq("payment_reference", reference).maybeSingle(),
    supabase.from("expedited_applications").select("id").eq("paystack_reference", reference).maybeSingle(),
  ]);
  return !!(orderRes.data || renewalRes.data || expeditedRes.data);
}

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  console.log(`Fetching successful Paystack transactions since ${since} (last ${DAYS} days)...`);

  const transactions = await fetchSuccessfulTransactions(since);
  console.log(`\nScanned ${transactions.length} successful transactions. Cross-checking against the database (read-only)...\n`);

  const missing: Array<{
    reference: string;
    amount: string;
    currency: string;
    paidAt?: string;
    email?: string;
    kind: string;
  }> = [];

  for (const txn of transactions) {
    if (!txn.reference) continue;
    // TOKEN- pseudo-references are 100%-off coupon redemptions handled
    // outside Paystack entirely (see the unique-index migration comment in
    // 20260908120000_add_payment_webhook_events.sql) — real currency never
    // moved, so they're not a "missing payment" in the sense this audit
    // cares about.
    if (txn.reference.startsWith("TOKEN-")) continue;

    const recorded = await alreadyRecorded(txn.reference);
    if (recorded) continue;

    const metadata = parseMetadata(txn.metadata);
    missing.push({
      reference: txn.reference,
      amount: (txn.amount / 100).toFixed(2),
      currency: txn.currency,
      paidAt: txn.paid_at || txn.created_at,
      email: txn.customer?.email,
      kind: guessKind(metadata),
    });
  }

  console.log(`\n=== Report: ${missing.length} unrecorded successful payment(s) in the last ${DAYS} days ===\n`);
  if (missing.length === 0) {
    console.log("No gaps found. Everything Paystack marked successful has a matching local record.");
  } else {
    for (const m of missing) {
      console.log(`- ${m.reference}  ${m.currency} ${m.amount}  kind=${m.kind}  email=${m.email || "?"}  paid_at=${m.paidAt || "?"}`);
    }
  }
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
