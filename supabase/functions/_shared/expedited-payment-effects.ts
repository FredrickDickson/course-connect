// deno-lint-ignore-file no-explicit-any
// Shared by paystack-webhook and paystack-reconcile for expedited
// qualification application payments.

export interface ExpeditedPaymentResult {
  success: boolean;
  error?: string;
  applicationId?: string;
  alreadyProcessed?: boolean;
}

export async function applyExpeditedPayment(
  supabase: any,
  paystackReference: string,
): Promise<ExpeditedPaymentResult> {
  const { data: existing } = await supabase
    .from("expedited_applications")
    .select("id, status, paid_at")
    .eq("paystack_reference", paystackReference)
    .maybeSingle();

  // `paid_at` is set exactly once, by this function — a durable idempotency
  // marker unlike `status`, which can move on to "approved"/"rejected" after
  // submission and would otherwise let a redelivered webhook re-run this
  // update and stomp submitted_at/paid_at again.
  if (existing?.paid_at) {
    return { success: true, alreadyProcessed: true, applicationId: existing.id };
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from("expedited_applications")
    .update({
      status: "submitted",
      paid_at: now,
      submitted_at: now,
    })
    .eq("paystack_reference", paystackReference)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error("applyExpeditedPayment: failed to mark application paid", updateErr, paystackReference);
    return { success: false, error: "Expedited application not found or update failed" };
  }

  await supabase.from("activity_log").insert({
    user_id: updated.user_id,
    event_type: "expedited_payment_succeeded",
    description: `Expedited application ${updated.id} submitted after payment`,
    entity_type: "expedited_application",
    entity_id: updated.id,
    metadata: {
      application_id: updated.id,
      track: updated.track,
      target_level: updated.target_level,
      reference: paystackReference,
    },
  });

  return { success: true, applicationId: updated.id };
}
