import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { applyMembershipRenewal } from "../_shared/renewal-effects.ts";
import { applyCourseEnrollment } from "../_shared/course-enrollment-effects.ts";
import { triggerCoursePurchaseProvisioning } from "../_shared/course-purchase-provisioning.ts";
import { applyExpeditedPayment } from "../_shared/expedited-payment-effects.ts";
import { logWebhookEvent } from "../_shared/webhook-audit.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Constant-time comparison — a plain `===` on the signature short-circuits
// on the first mismatched character, letting a network-timing attacker
// discover the correct HMAC byte-by-byte.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.text();

  try {
    // Verify Paystack signature. Paystack signs the raw request body with
    // HMAC-SHA512 using the secret key (not a plain digest of body+secret
    // concatenated — that construction is not HMAC and doesn't match what
    // Paystack computes).
    const signature = req.headers.get("x-paystack-signature");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hashHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!signature || !timingSafeEqual(signature, hashHex)) {
      // Log every signature failure, even before we trust anything in the
      // body — this is exactly the failure mode (a stale/mismatched
      // PAYSTACK_SECRET_KEY) that previously left zero trace anywhere.
      let attemptedReference: string | null = null;
      let attemptedEventType = "unknown";
      try {
        const parsed = JSON.parse(body);
        attemptedReference = parsed?.data?.reference ?? null;
        attemptedEventType = parsed?.event ?? "unknown";
      } catch {
        // body wasn't even valid JSON — leave attempted* as-is
      }
      await logWebhookEvent(supabase, {
        eventType: attemptedEventType,
        reference: attemptedReference,
        signatureValid: false,
        status: "failed",
        errorMessage: "Invalid Paystack signature — check PAYSTACK_SECRET_KEY matches the key used for this transaction (live vs test mismatch is the usual cause)",
      });
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event !== "charge.success") {
      await logWebhookEvent(supabase, {
        eventType: event.event,
        reference: event.data?.reference ?? null,
        signatureValid: true,
        status: "skipped",
        errorMessage: "Event type not handled",
      });
      return new Response("Webhook received", { status: 200 });
    }

    const metadata = event.data.metadata || {};
    const reference = event.data.reference;

    // ------------------------------------------------------------------
    // Expedited application payment
    // ------------------------------------------------------------------
    if (metadata.expeditedApplicationId) {
      const result = await applyExpeditedPayment(supabase, reference);
      await logWebhookEvent(supabase, {
        eventType: event.event,
        reference,
        signatureValid: true,
        status: result.success ? (result.alreadyProcessed ? "already_processed" : "processed") : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "expedited", applicationId: result.applicationId },
      });
      if (!result.success) {
        return new Response(result.error || "Expedited update failed", { status: 500 });
      }
      console.log(`Expedited application ${result.applicationId} submitted after payment ${reference}`);
      return new Response("Expedited payment recorded", { status: 200 });
    }

    // ------------------------------------------------------------------
    // Membership renewal payment
    // ------------------------------------------------------------------
    if (metadata.type === "renewal" && metadata.member_id) {
      try {
        const authorization = event.data.authorization;
        if (authorization?.authorization_code) {
          const { data: memberRow } = await supabase
            .from("members")
            .select("user_id")
            .eq("member_id", metadata.member_id)
            .single();

          if (memberRow?.user_id) {
            await supabase.from("users").update({
              paystack_authorization_code: authorization.authorization_code,
              paystack_authorization_reusable: !!authorization.reusable,
              updated_at: new Date().toISOString(),
            }).eq("id", memberRow.user_id);
          }
        }
      } catch (err) {
        console.error("Failed to persist Paystack authorization:", err);
      }

      const result = await applyMembershipRenewal(supabase, {
        memberId: metadata.member_id,
        paymentMethod: "paystack",
        amountPaid: event.data.amount / 100,
        currency: "GHS", // this merchant always settles Paystack charges in GHS
        displayAmount: metadata.display_amount || (event.data.amount / 100),
        displayCurrency: metadata.currency || "USD",
        paymentReference: reference,
        incomeTier: metadata.income_tier || null,
      });

      await logWebhookEvent(supabase, {
        eventType: event.event,
        reference,
        signatureValid: true,
        status: result.success ? (result.alreadyProcessed ? "already_processed" : "processed") : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "renewal", memberId: metadata.member_id },
      });

      if (!result.success) {
        return new Response(result.error || "Renewal failed", {
          status: result.error === "Member not found" ? 404 : 500,
        });
      }

      console.log(`Renewal processed for member ${metadata.member_id}, ref ${reference}`);
      return new Response("Renewal processed", { status: 200 });
    }

    // ------------------------------------------------------------------
    // Course purchase
    // ------------------------------------------------------------------
    if (metadata.courseId) {
      const result = await applyCourseEnrollment(supabase, {
        userId: metadata.userId,
        courseId: metadata.courseId,
        paystackReference: reference,
        amount: event.data.amount / 100,
        currency: event.data.currency,
        amountUSD: metadata.amountUSD,
        amountGhs: metadata.amountGhs,
        exchangeRate: metadata.exchangeRate,
        originalCurrency: metadata.originalCurrency,
        chargedCurrency: metadata.chargedCurrency,
        enrollmentLevel: metadata.enrollmentLevel,
        paymentType: metadata.paymentType,
        companyName: metadata.companyName,
        companyEmail: metadata.companyEmail,
        vatId: metadata.vatId,
        accessTokenId: metadata.accessTokenId,
      });

      await logWebhookEvent(supabase, {
        eventType: event.event,
        reference,
        signatureValid: true,
        status: result.success ? (result.alreadyEnrolled ? "already_processed" : "processed") : "failed",
        errorMessage: result.error ?? null,
        metadata: { kind: "course", courseId: metadata.courseId, userId: metadata.userId, orderId: result.orderId, enrollmentId: result.enrollmentId },
      });

      if (!result.success) {
        console.error("Course enrollment failed:", result.error);
        return new Response(result.error || "Enrollment creation failed", { status: 500 });
      }

      if (result.alreadyEnrolled) {
        console.log("Enrollment already exists, skipping");
        return new Response("Enrollment already exists", { status: 200 });
      }

      // Trigger immediate provisioning (best-effort; failures are logged
      // inside triggerCoursePurchaseProvisioning and don't affect the
      // webhook's response).
      await triggerCoursePurchaseProvisioning(supabase, {
        userId: metadata.userId,
        courseId: metadata.courseId,
        programmeType: metadata.programmeType || "PROFESSIONAL_PROGRAMME",
        enrollmentLevel: result.isAdjunctCourse ? null : (metadata.enrollmentLevel || "ASSOCIATE"),
        paymentType: metadata.paymentType || "individual",
        companyName: metadata.companyName,
        companyEmail: metadata.companyEmail,
        vatId: metadata.vatId,
      });

      console.log("Enrollment created successfully:", result.enrollmentId);
      return new Response("Webhook received", { status: 200 });
    }

    // charge.success with none of the known metadata shapes — log it so
    // it's visible instead of silently falling through.
    await logWebhookEvent(supabase, {
      eventType: event.event,
      reference,
      signatureValid: true,
      status: "skipped",
      errorMessage: "charge.success with no recognized metadata shape (expected expeditedApplicationId, renewal type+member_id, or courseId)",
      metadata,
    });

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    try {
      await logWebhookEvent(supabase, {
        eventType: "unknown",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // best-effort only
    }
    return new Response("Internal server error", { status: 500 });
  }
});
