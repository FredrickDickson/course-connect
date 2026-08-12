import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_API_KEY = Deno.env.get("INTERNAL_API_KEY")!;

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

async function sendViaSharedEmailFunction(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const emailFrom = Deno.env.get("EMAIL_FROM") || "noreply@thecima.org";
    const emailFromName = Deno.env.get("EMAIL_FROM_NAME") || "CIMA Learn";

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${INTERNAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        from: `${emailFromName} <${emailFrom}>`,
      }),
    });
    if (!resp.ok) {
      return { ok: false, error: await resp.text() };
    }
    const data = await resp.json().catch(() => ({}));
    return { ok: true, id: (data as { id?: string }).id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://cima-learn.vercel.app";
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // sync_membership_statuses() runs just before this on the cron schedule, so a
    // member can already be 'expiring'/'expired' by the time this executes — filter
    // broadly rather than just 'active' or the -30 (overdue) threshold would never match.
    const { data: members, error: fetchErr } = await supabase
      .from("members")
      .select("id, member_id, user_id, full_name, email, expiry_date, last_reminder_sent")
      .in("status", ["active", "expiring", "expired"])
      .not("expiry_date", "is", null);

    if (fetchErr || !members) {
      console.error("Failed to fetch members:", fetchErr);
      return new Response("Failed to fetch members", { status: 500 });
    }

    console.log(`Fetched ${members.length} members`);

    // Batch-fetch notification preferences; default to "send" when a member has no
    // preference row yet (matches how NotificationContext seeds defaults on login).
    const userIds = members.map((m) => m.user_id).filter(Boolean) as string[];
    const prefsByUser = new Map<string, boolean>();
    if (userIds.length > 0) {
      const { data: prefs, error: prefsErr } = await supabase
        .from("notification_preferences")
        .select("user_id, email_administrative")
        .in("user_id", userIds);
      if (prefsErr) {
        console.error("Failed to fetch notification preferences:", prefsErr);
      } else {
        for (const p of prefs ?? []) {
          prefsByUser.set(p.user_id, p.email_administrative !== false);
        }
      }
    }

    let sent = 0;
    let skipped = 0;
    let optedOut = 0;

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

      // Respect explicit opt-out of administrative emails
      if (member.user_id && prefsByUser.get(member.user_id) === false) {
        optedOut++;
        continue;
      }

      const reminderType = getReminderType(daysUntilExpiry);
      const expiryDateFormatted = expiryDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const renewalUrl = `${appUrl}/renew-membership`;
      const subject = REMINDER_TEMPLATES[daysUntilExpiry]?.subject ||
        "CIMA Membership Renewal Reminder";
      const html = buildEmailHtml(
        member.full_name,
        member.member_id,
        daysUntilExpiry,
        expiryDateFormatted,
        renewalUrl,
      );

      const result = await sendViaSharedEmailFunction(member.email, subject, html);
      if (!result.ok) {
        console.error(`Failed to send reminder to ${member.email}:`, result.error);
        await supabase.from("email_logs").insert({
          member_id: member.id,
          template_type: `renewal_reminder_${reminderType}`,
          email_to: member.email,
          subject,
          status: "failed",
          provider: "brevo",
          error_message: result.error || "Unknown email error",
          sent_at: new Date().toISOString(),
        });
        continue;
      }

      // Update member reminder status
      await supabase
        .from("members")
        .update({ last_reminder_sent: todayStr })
        .eq("id", member.id);

      // Log email (real email_logs columns: member_id, template_type, email_to, subject, sent_at)
      const { error: logErr } = await supabase.from("email_logs").insert({
        member_id: member.id,
        template_type: `renewal_reminder_${reminderType}`,
        email_to: member.email,
        subject,
        status: "sent",
        provider: "brevo",
        provider_message_id: result.id || null,
        sent_at: new Date().toISOString(),
      });
      if (logErr) {
        console.error(`Failed to log email for ${member.email}:`, logErr);
      }

      sent++;
      console.log(`Reminder sent to ${member.email} (${reminderType})`);
    }

    console.log(`Done. Sent: ${sent}, Skipped (already sent today): ${skipped}, Opted out: ${optedOut}`);
    return new Response(
      JSON.stringify({ success: true, sent, skipped, optedOut, total: members.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Renewal reminders error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
