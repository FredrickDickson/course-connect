// deno-lint-ignore-file no-explicit-any
// Persistent audit trail for Paystack webhook/reconciliation activity, so a
// failure is always visible somewhere durable instead of only in ephemeral
// Supabase/Vercel function logs. See migration
// 20260908120000_add_payment_webhook_events.sql for the table shape.

export type WebhookEventStatus =
  | "processed"
  | "already_processed"
  | "failed"
  | "duplicate"
  | "skipped"
  | "reconciled_by_cron";

export interface LogWebhookEventInput {
  provider?: string; // defaults to "paystack"
  eventType: string; // e.g. "charge.success", "signature_verification"
  reference?: string | null;
  signatureValid?: boolean | null;
  status: WebhookEventStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  rawPayload?: unknown;
}

export async function logWebhookEvent(
  supabase: any,
  input: LogWebhookEventInput,
): Promise<void> {
  const { error } = await supabase.from("payment_webhook_events").insert({
    provider: input.provider || "paystack",
    event_type: input.eventType,
    reference: input.reference ?? null,
    signature_valid: input.signatureValid ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
    metadata: input.metadata ?? null,
    raw_payload: input.rawPayload ?? null,
  });

  if (error) {
    // Logging must never be the reason a payment fails to process — this is
    // the last line of defense, so it only console.errors, never throws.
    console.error("logWebhookEvent: failed to write audit row", error);
  }
}
