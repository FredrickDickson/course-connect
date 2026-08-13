import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Attempt to charge members who opted into auto-renew.
 * Uses Paystack charge authorization API with saved `authorization_code`.
 */
export async function processAutoRenewals(): Promise<{ processed: number; charged: number; failed: number; skipped: number }> {
  const stats = { processed: 0, charged: 0, failed: 0, skipped: 0 };

  // Find members who opted into auto_renew and are expired or expiring today
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const { data: members, error } = await supabaseAdmin
    .from("members")
    .select("id, member_id, user_id, full_name, expiry_date, income_tier, part")
    .eq("auto_renew", true)
    .in("status", ["expiring", "expired", "active"])
    .lte("expiry_date", todayStr)
    .limit(200);

  if (error) {
    console.error("processAutoRenewals: failed to fetch members", error);
    return stats;
  }

  for (const m of (members || [])) {
    stats.processed++;

    try {
      // Get user paystack authorization
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("id, email, paystack_authorization_code, paystack_authorization_reusable")
        .eq("id", m.user_id)
        .single();

      if (!userRow || !userRow.paystack_authorization_code || !userRow.paystack_authorization_reusable) {
        stats.skipped++;
        continue;
      }

      // Get pricing for member (reuse existing endpoint logic via query)
      const { data: pricingRes } = await supabaseAdmin.rpc("get_renewal_price_for_member", { p_member_id: m.member_id });
      // Fallback: call pricing endpoint would be better, but RPC expected to exist in your DB.

      const amountToCharge = pricingRes?.ghs_amount || 0;
      if (!amountToCharge || amountToCharge <= 0) {
        stats.skipped++;
        continue;
      }

      // Call Paystack charge authorization API
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
      const chargeResp = await fetch("https://api.paystack.co/transaction/charge_authorization", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userRow.email,
          amount: Math.round(Number(amountToCharge) * 100),
          currency: "GHS",
          authorization_code: userRow.paystack_authorization_code,
          metadata: {
            type: "renewal",
            member_id: m.member_id,
          },
        }),
      });

      const chargeJson = await chargeResp.json().catch(() => ({}));
      if (!chargeResp.ok || !chargeJson.status) {
        console.error("Auto-renew charge failed for", m.member_id, chargeJson);
        stats.failed++;
        // Log failed attempt
        await supabaseAdmin.from("activity_log").insert({
          user_id: m.user_id,
          event_type: "auto_renew_charge_failed",
          event_data: { member_id: m.member_id, response: chargeJson },
        });
        continue;
      }

      // Success — Paystack returns data.reference; but webhook will still arrive.
      stats.charged++;
      await supabaseAdmin.from("activity_log").insert({
        user_id: m.user_id,
        event_type: "auto_renew_charge_initiated",
        event_data: { member_id: m.member_id, reference: chargeJson.data?.reference },
      });

    } catch (err) {
      console.error("Auto-renew error for member", m.member_id, err);
      stats.failed++;
    }
  }

  return stats;
}
