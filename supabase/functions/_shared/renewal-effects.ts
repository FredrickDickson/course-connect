// deno-lint-ignore-file no-explicit-any
// Shared by paystack-webhook (Paystack-paid renewals) and
// confirm-manual-renewal (admin bank-transfer/waived renewals) so both
// paths produce identical member/renewal_history/certificate/email effects
// instead of drifting copies. Deno-only module (Edge Function runtime).

export interface RenewalEffectsInput {
  memberId: string; // members.member_id (human-readable code)
  paymentMethod: "paystack" | "waived";
  /** Amount actually charged, in `currency` (e.g. GHS for Paystack — this
   * merchant always settles in GHS regardless of what the member saw). */
  amountPaid: number;
  currency: string;
  /** What the member saw/selected at checkout, if different from the
   * settlement currency/amount above (defaults to amountPaid/currency). */
  displayAmount?: number;
  displayCurrency?: string;
  paymentReference?: string;
  incomeTier?: string | null;
  notes?: string;
  createdBy?: string; // admin user id, for manual renewals
}

export interface RenewalEffectsResult {
  success: boolean;
  certificateUrl?: string;
  error?: string;
}

export async function applyMembershipRenewal(
  supabase: any,
  input: RenewalEffectsInput,
): Promise<RenewalEffectsResult> {
  const {
    memberId,
    paymentMethod,
    amountPaid,
    currency,
    displayAmount = amountPaid,
    displayCurrency = currency,
    paymentReference,
    incomeTier,
    notes,
    createdBy,
  } = input;

  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("id, full_name, part, primary_pathway, renewal_count, renewal_anniversary, issue_date, organization_id")
    .eq("member_id", memberId)
    .single();

  if (memberErr || !member) {
    console.error("applyMembershipRenewal: member not found", memberId, memberErr);
    return { success: false, error: "Member not found" };
  }

  const today = new Date();
  const newExpiry = new Date(today);
  newExpiry.setDate(newExpiry.getDate() + 365);
  const todayStr = today.toISOString().split("T")[0];
  const expiryStr = newExpiry.toISOString().split("T")[0];

  const anniversary = member.renewal_anniversary || member.issue_date || todayStr;
  const newRenewalCount = (member.renewal_count || 0) + 1;

  const { error: updateErr } = await supabase
    .from("members")
    .update({
      issue_date: todayStr,
      expiry_date: expiryStr,
      status: "active",
      renewal_count: newRenewalCount,
      last_renewal_at: todayStr,
      renewal_anniversary: anniversary,
      income_tier: incomeTier || null,
      is_suspended: false,
      suspension_date: null,
    })
    .eq("member_id", memberId);

  if (updateErr) {
    console.error("applyMembershipRenewal: member update error", updateErr);
    return { success: false, error: "Member update failed" };
  }

  const { error: historyErr } = await supabase
    .from("renewal_history")
    .insert({
      member_id: member.id,
      renewal_date: todayStr,
      new_expiry_date: expiryStr,
      amount_paid: amountPaid,
      currency,
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      status: "confirmed",
      confirmed_at: todayStr,
      income_tier: incomeTier || null,
      currency_used: displayCurrency,
      base_amount: displayAmount,
      surcharge_amount: 0,
      discount_amount: 0,
      discount_percentage: 0,
      is_late: false,
      notes: notes || null,
      created_by: createdBy || null,
    });

  if (historyErr) {
    console.error("applyMembershipRenewal: renewal_history insert error", historyErr);
  }

  // activity_log's real columns are user_id/event_type/description/metadata/
  // entity_type/entity_id — the pre-existing code (in both the original
  // webhook and elsewhere) wrote a non-existent `event_data` column and
  // never set `description` (NOT NULL, no default), so this insert has
  // always failed silently. Using the real schema here, not the broken one.
  const eventType = paymentMethod === "paystack"
    ? "renewal_payment_succeeded"
    : "renewal_manual_confirmed";
  const { error: activityErr } = await supabase.from("activity_log").insert({
    user_id: member.id,
    event_type: eventType,
    description: `Membership ${memberId} renewed via ${paymentMethod} (new expiry ${expiryStr})`,
    entity_type: "member",
    entity_id: member.id,
    metadata: {
      member_id: memberId,
      reference: paymentReference || null,
      amount: amountPaid,
      currency,
      income_tier: incomeTier,
      new_expiry: expiryStr,
      created_by: createdBy || null,
    },
  });
  if (activityErr) {
    console.error("applyMembershipRenewal: activity_log insert error", activityErr);
  }

  // Regenerate the certificate using the member's own stored details (not
  // caller-supplied metadata) so this stays correct regardless of what the
  // Paystack transaction metadata happened to contain.
  const certApiKey = Deno.env.get("CERTIFICATE_API_KEY");
  const appUrl = Deno.env.get("VITE_APP_URL") || "https://cima-learn.vercel.app";
  let certificateUrl: string | undefined;

  try {
    const certResponse = await fetch(`${appUrl}/api/certificates/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${certApiKey}`,
      },
      body: JSON.stringify({
        member_id: memberId,
        full_name: member.full_name || "Member",
        membership_level: (member.part || "member").toLowerCase(),
        issue_date: todayStr,
        expiry_date: expiryStr,
        renewal_count: newRenewalCount,
        pathway: member.primary_pathway || "ARBITRATION",
      }),
    });

    if (!certResponse.ok) {
      const certErr = await certResponse.text();
      console.error("applyMembershipRenewal: certificate generation failed", certErr);
    } else {
      const certData = await certResponse.json();
      certificateUrl = certData.certificate_url;
      console.log("applyMembershipRenewal: certificate generated for", memberId);
    }
  } catch (certError) {
    console.error("applyMembershipRenewal: certificate API call failed", certError);
  }

  console.log(`Renewal processed for member ${memberId} via ${paymentMethod}`);
  return { success: true, certificateUrl };
}
