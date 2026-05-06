import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const THRESHOLDS = [60, 30, 7, 0, -30];

const REMINDER_TEMPLATES: Record<number, { subject: string; heading: string }> = {
  60: {
    subject: "Your CIMA Membership Expires in 60 Days",
    heading: "Membership Expiring in 60 Days",
  },
  30: {
    subject: "Your CIMA Membership Expires in 30 Days — Renew Now",
    heading: "Membership Expiring in 30 Days",
  },
  7: {
    subject: "Urgent: Your CIMA Membership Expires in 7 Days",
    heading: "Membership Expiring in 7 Days",
  },
  0: {
    subject: "Your CIMA Membership Expires Today",
    heading: "Membership Expires Today",
  },
  [-30]: {
    subject: "Your CIMA Membership Has Expired — Reinstate Now",
    heading: "Membership Expired 30 Days Ago",
  },
};

function getReminderType(daysUntilExpiry: number): string {
  if (daysUntilExpiry > 0) return `${daysUntilExpiry}days`;
  if (daysUntilExpiry === 0) return "today";
  return `${Math.abs(daysUntilExpiry)}days_overdue`;
}

function buildEmailHtml(
  fullName: string,
  memberId: string,
  daysUntilExpiry: number,
  expiryDate: string,
  renewalUrl: string,
): string {
  const template = REMINDER_TEMPLATES[daysUntilExpiry] || {
    subject: "CIMA Membership Renewal Reminder",
    heading: "Membership Renewal Reminder",
  };

  const isOverdue = daysUntilExpiry < 0;
  const isToday = daysUntilExpiry === 0;

  let urgencyBlock = "";
  if (isOverdue) {
    urgencyBlock = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #991b1b; margin: 0; font-weight: bold;">⚠️ Your membership has expired. Your post-nominals and panel listing are at risk.</p>
      </div>`;
  } else if (isToday) {
    urgencyBlock = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #92400e; margin: 0; font-weight: bold;">⚠️ Your membership expires today. Renew now to avoid interruption.</p>
      </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a365d;">${template.heading}</h2>
    <p>Dear ${fullName},</p>
    ${urgencyBlock}
    <p>Your CIMA membership (ID: <strong>${memberId}</strong>) ${isOverdue ? "expired on" : "expires on"} <strong>${expiryDate}</strong>.</p>
    <p>Renew now to maintain your post-nominals, panel listing, and access to all member benefits.</p>
    <p style="margin: 24px 0;">
      <a href="${renewalUrl}"
         style="background: #1a365d; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
        Renew Your Membership
      </a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="font-size: 12px; color: #718096;">
      CIMA — The Center for International Mediators and Arbitrators<br>
      Company No.: 16140063 Registered in England & Wales
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://cima-learn.vercel.app";
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch all active members
    const { data: members, error: fetchErr } = await supabase
      .from("members")
      .select("id, member_id, full_name, email, expiry_date, last_reminder_sent, reminder_type")
      .eq("status", "active")
      .not("expiry_date", "is", null);

    if (fetchErr || !members) {
      console.error("Failed to fetch members:", fetchErr);
      return new Response("Failed to fetch members", { status: 500 });
    }

    console.log(`Fetched ${members.length} active members`);

    let sent = 0;
    let skipped = 0;

    for (const member of members) {
      const expiryDate = new Date(member.expiry_date);
      const daysUntilExpiry = Math.round(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Only process threshold days
      if (!THRESHOLDS.includes(daysUntilExpiry)) {
        continue;
      }

      // Skip if already sent a reminder today
      if (member.last_reminder_sent) {
        const lastSent = new Date(member.last_reminder_sent).toISOString().split("T")[0];
        if (lastSent === todayStr) {
          skipped++;
          continue;
        }
      }

      const reminderType = getReminderType(daysUntilExpiry);
      const expiryDateFormatted = expiryDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const renewalUrl = `${appUrl}/renew-membership`;

      // Send email via Resend
      try {
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CIMA <info@thecima.org>",
            to: member.email,
            subject: REMINDER_TEMPLATES[daysUntilExpiry]?.subject ||
              "CIMA Membership Renewal Reminder",
            html: buildEmailHtml(
              member.full_name,
              member.member_id,
              daysUntilExpiry,
              expiryDateFormatted,
              renewalUrl,
            ),
          }),
        });

        if (!resendResp.ok) {
          const errText = await resendResp.text();
          console.error(`Failed to send reminder to ${member.email}:`, errText);
          continue;
        }

        // Update member reminder status
        await supabase
          .from("members")
          .update({
            last_reminder_sent: todayStr,
            reminder_type: reminderType,
          })
          .eq("id", member.id);

        // Log email
        await supabase.from("email_logs").insert({
          member_id: member.id,
          email_type: `renewal_reminder_${reminderType}`,
          recipient: member.email,
          subject: REMINDER_TEMPLATES[daysUntilExpiry]?.subject || "Renewal Reminder",
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        sent++;
        console.log(`Reminder sent to ${member.email} (${reminderType})`);
      } catch (emailErr) {
        console.error(`Error sending to ${member.email}:`, emailErr);
      }
    }

    console.log(`Done. Sent: ${sent}, Skipped (already sent today): ${skipped}`);
    return new Response(
      JSON.stringify({ success: true, sent, skipped, total: members.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Renewal reminders error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
