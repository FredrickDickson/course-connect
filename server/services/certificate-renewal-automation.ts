/**
 * Certificate Renewal Automation Service
 * Enterprise-grade automatic renewal system with email notifications
 * 
 * Features:
 * - Automated expiry tracking and reminder scheduling
 * - Multi-stage email notifications (60, 30, 7, 0, -30 days)
 * - Automatic certificate generation on successful payment
 * - Comprehensive logging and error handling
 * - Tiered pricing support
 * - Organization discount handling
 */

import { createClient } from "@supabase/supabase-js";
import { formatPrice, type Currency } from "../../shared/renewal-pricing";
import { sendRawEmail } from "../utils/email";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email templates configuration
export const RENEWAL_STAGES = {
  DAYS_60: {
    key: "60days",
    name: "First Reminder",
    subject: "CIMA Membership Renewal Reminder - 60 Days",
  },
  DAYS_30: {
    key: "30days",
    name: "Second Reminder",
    subject: "CIMA Membership Renewal - 30 Days Remaining",
  },
  DAYS_7: {
    key: "7days",
    name: "Urgent Reminder",
    subject: "URGENT: CIMA Membership Expires in 7 Days",
  },
  DAYS_0: {
    key: "today",
    name: "Expiry Notice",
    subject: "IMPORTANT: CIMA Membership Expires Today",
  },
  DAYS_NEG_30: {
    key: "30days_overdue",
    name: "Overdue Notice",
    subject: "OVERDUE: CIMA Membership Renewal Required",
  },
} as const;

interface Member {
  id: string;
  user_id: string;
  member_id: string;
  full_name: string;
  email: string;
  part: "associate" | "member" | "fellow";
  expiry_date: string;
  status: string;
  income_tier: string;
  organization_id: string | null;
  renewal_count: number;
  last_renewal_at: string | null;
}

interface RenewalPricing {
  income_tier: string;
  membership_level: string;
  currency: Currency;
  base_amount: number;
  late_surcharge_percentage: number;
}

interface EmailLog {
  member_id: string;
  template_type: string;
  email_to: string;
  subject: string;
  status?: "sent" | "failed" | "pending";
  provider?: string;
  provider_message_id?: string | null;
  error_message?: string | null;
}

/**
 * Get members due for renewal at specific day offset
 */
export async function getMembersDueForRenewal(daysOffset: number): Promise<Member[]> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysOffset);
  
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const statuses =
    daysOffset >= 0 ? ["active", "expiring"] : ["expired", "expiring"];

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("*")
    .in("status", statuses)
    .gte("expiry_date", `${targetDateStr}T00:00:00`)
    .lte("expiry_date", `${targetDateStr}T23:59:59`);

  if (error) {
    console.error("Error fetching members due for renewal:", error);
    return [];
  }

  return (data || []) as Member[];
}

/**
 * Get members expiring within the next N days (inclusive)
 */
export async function getUpcomingRenewals(withinDays: number): Promise<Member[]> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + withinDays);

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("*")
    .in("status", ["active", "expiring", "expired"])
    .gte("expiry_date", now.toISOString())
    .lte("expiry_date", endDate.toISOString())
    .order("expiry_date", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming renewals:", error);
    return [];
  }

  return (data || []) as Member[];
}

/**
 * Check if email was already sent to member for this stage
 */
export async function wasEmailSent(
  memberId: string,
  templateType: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("email_logs")
    .select("id")
    .eq("member_id", memberId)
    .eq("template_type", templateType)
    .limit(1);

  if (error) {
    console.error("Error checking email log:", error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Log sent email
 */
export async function logEmailSent(log: EmailLog): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_logs")
    .insert(log);

  if (error) {
    console.error("Error logging email:", error);
  }
}

/**
 * Get renewal pricing for member
 */
export async function getRenewalPricing(
  incomeTier: string,
  membershipLevel: string
): Promise<RenewalPricing[]> {
  const { data, error } = await supabaseAdmin
    .from("renewal_pricing")
    .select("*")
    .eq("income_tier", incomeTier)
    .eq("membership_level", membershipLevel.toUpperCase())
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching renewal pricing:", error);
    return [];
  }

  return (data || []) as RenewalPricing[];
}

/**
 * Get organization discount if applicable
 */
export async function getOrganizationDiscount(
  organizationId: string | null
): Promise<number> {
  if (!organizationId) return 0;

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("discount_tier")
    .eq("id", organizationId)
    .single();

  if (error || !data) return 0;

  const discountMap: Record<string, number> = {
    "NONE": 0,
    "10_PERCENT": 10,
    "15_PERCENT": 15,
  };

  return discountMap[data.discount_tier] || 0;
}

/**
 * Calculate renewal amount with discounts and surcharges
 */
export function calculateRenewalAmount(
  baseAmount: number,
  isLate: boolean,
  lateSurchargePercentage: number,
  discountPercentage: number
): {
  baseAmount: number;
  lateSurcharge: number;
  discountAmount: number;
  totalAmount: number;
} {
  let total = baseAmount;
  let surcharge = 0;
  let discount = 0;

  // Apply late surcharge first
  if (isLate) {
    surcharge = (baseAmount * lateSurchargePercentage) / 100;
    total += surcharge;
  }

  // Apply organization discount
  if (discountPercentage > 0) {
    discount = (total * discountPercentage) / 100;
    total -= discount;
  }

  return {
    baseAmount,
    lateSurcharge: surcharge,
    discountAmount: discount,
    totalAmount: Math.round(total * 100) / 100,
  };
}

/**
 * Generate email content for renewal reminder
 */
export function generateRenewalEmailContent(
  member: Member,
  stage: typeof RENEWAL_STAGES[keyof typeof RENEWAL_STAGES],
  pricingOptions: Array<{
    currency: Currency;
    baseAmount: number;
    totalAmount: number;
    discountPercentage: number;
    isLate: boolean;
  }>,
  renewalUrl: string
): { subject: string; html: string } {
  const daysText = stage.key === "today" ? "TODAY" : 
                   stage.key === "30days_overdue" ? "30 days ago" :
                   `in ${stage.key.replace("days", "")} days`;

  const urgencyClass = stage.key === "7days" || stage.key === "today" ? "urgent" :
                       stage.key === "30days_overdue" ? "overdue" : "normal";

  const primaryPricing = pricingOptions.find(p => p.currency === "USD") || pricingOptions[0];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${stage.subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header .member-id { font-size: 14px; opacity: 0.9; margin-top: 5px; font-family: monospace; }
    .content { padding: 30px; }
    .alert { padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
    .alert.urgent { background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; }
    .alert.overdue { background: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; }
    .alert.normal { background: #dbeafe; border-left: 4px solid #3b82f6; color: #1e40af; }
    .member-info { background: #f9fafb; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .member-info h3 { margin: 0 0 10px 0; font-size: 16px; color: #1e40af; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { font-weight: 600; font-size: 14px; color: #111827; }
    .pricing { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .pricing h3 { margin: 0 0 10px 0; color: #15803d; font-size: 18px; }
    .pricing .amount { font-size: 36px; font-weight: bold; color: #15803d; margin: 10px 0; }
    .pricing .details { font-size: 13px; color: #166534; margin-top: 10px; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3); }
    .cta-button:hover { background: linear-gradient(135deg, #15803d 0%, #16a34a 100%); }
    .benefits { margin: 20px 0; }
    .benefit-item { display: flex; align-items: start; margin: 10px 0; }
    .benefit-icon { color: #22c55e; margin-right: 10px; font-size: 20px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .post-nominal { display: inline-block; background: #1e40af; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin: 0 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛️ CIMA Membership Renewal</h1>
      <div class="member-id">Member ID: ${member.member_id}</div>
    </div>
    
    <div class="content">
      <div class="alert ${urgencyClass}">
        ${stage.key === "30days_overdue" 
          ? `⚠️ Your CIMA membership expired ${daysText}. Please renew immediately to reinstate your post-nominals and benefits.`
          : `📅 Your CIMA membership expires ${daysText}. Renew now to maintain uninterrupted access to your professional designation.`
        }
      </div>

      <p>Dear ${member.full_name},</p>

      <div class="member-info">
        <h3>Your Membership Details</h3>
        <div class="info-row">
          <span class="info-label">Member Name</span>
          <span class="info-value">${member.full_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Membership Level</span>
          <span class="info-value">${member.part.charAt(0).toUpperCase() + member.part.slice(1)} 
            <span class="post-nominal">${getPostNominal(member.part)}</span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Expiry Date</span>
          <span class="info-value">${new Date(member.expiry_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Member ID</span>
          <span class="info-value">${member.member_id}</span>
        </div>
      </div>

      <div class="pricing">
        <h3>Annual Renewal Fee</h3>
        <div class="amount">${formatPrice(primaryPricing.totalAmount, primaryPricing.currency)}</div>
        ${pricingOptions.length > 1 ? `
          <div class="details">
            Also available in: ${pricingOptions.filter(p => p.currency !== primaryPricing.currency).map(p => `${formatPrice(p.totalAmount, p.currency)}`).join(", ")}
          </div>
        ` : ""}
        ${primaryPricing.discountPercentage > 0 ? `
          <div class="details">✨ ${primaryPricing.discountPercentage}% Organization Discount Applied</div>
        ` : ""}
        ${primaryPricing.isLate ? `
          <div class="details" style="color: #dc2626;">⚠️ Includes 15% late renewal surcharge</div>
        ` : ""}
      </div>

      <div class="cta">
        <a href="${renewalUrl}" class="cta-button">Renew Membership Now →</a>
      </div>

      <div class="benefits">
        <h3>What's Included:</h3>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <span>Membership extended for 12 months</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <span>New certificate emailed within minutes</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <span>Post-nominals maintained on all platforms</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <span>Continued panel listing</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <span>Access to member resources and network</span>
        </div>
      </div>

      ${stage.key === "30days_overdue" ? `
        <div style="background: #fff1f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #991b1b;">Important:</strong>
          <p style="color: #991b1b; margin: 5px 0 0 0;">Your post-nominals and member benefits are currently suspended. Renew immediately to reinstate your professional standing.</p>
        </div>
      ` : ""}

      <p style="margin-top: 30px;">Questions? Contact us at <a href="mailto:admin@thecima.org">admin@thecima.org</a></p>

      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Best regards,<br><strong>The CIMA Team</strong><br>Center for International Mediators and Arbitrators</p>
    </div>

    <div class="footer">
      <p>Center for International Mediators and Arbitrators<br>
      Company No.: 16140063 | Registered in England & Wales</p>
      <p style="margin-top: 10px;">
        <a href="${renewalUrl}" style="color: #1e40af; text-decoration: none;">Renew Now</a> | 
        <a href="https://thecima.org" style="color: #1e40af; text-decoration: none;">Visit Website</a> | 
        <a href="mailto:admin@thecima.org" style="color: #1e40af; text-decoration: none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: stage.subject,
    html,
  };
}

function getPostNominal(level: string): string {
  const postNominals: Record<string, string> = {
    associate: "ACIMArb",
    member: "MCIMArb",
    fellow: "FCIMArb",
  };
  return postNominals[level] || "";
}

/**
 * Process renewal reminders for a specific stage
 */
export async function processRenewalReminders(
  daysOffset: number,
  stageKey: string
): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const members = await getMembersDueForRenewal(daysOffset);
  const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };

  const renewalUrl = `${process.env.VITE_APP_URL || "https://cima-learn.vercel.app"}/renew-membership`;

  for (const member of members) {
    stats.processed++;

    // Check if email already sent
    const alreadySent = await wasEmailSent(member.id, stageKey);
    if (alreadySent) {
      stats.skipped++;
      continue;
    }

    try {
      // Get pricing options
      const pricingRecords = await getRenewalPricing(
        member.income_tier || "LOWER_MIDDLE_INCOME",
        member.part
      );

      const discountPercentage = await getOrganizationDiscount(member.organization_id);
      const isLate = daysOffset < 0;

      const pricingOptions = pricingRecords.map((pricing) => {
        const calc = calculateRenewalAmount(
          pricing.base_amount,
          isLate,
          pricing.late_surcharge_percentage,
          discountPercentage
        );

        return {
          currency: pricing.currency,
          baseAmount: calc.baseAmount,
          totalAmount: calc.totalAmount,
          discountPercentage,
          isLate,
        };
      });

      // Generate email content
      const stage = Object.values(RENEWAL_STAGES).find((s) => s.key === stageKey)!;
      const emailContent = generateRenewalEmailContent(
        member,
        stage,
        pricingOptions,
        renewalUrl
      );

      const emailResult = await sendRenewalEmail({
        to: member.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (!emailResult.success) {
        await logEmailSent({
          member_id: member.id,
          template_type: stageKey,
          email_to: member.email,
          subject: emailContent.subject,
          status: "failed",
          provider: "brevo",
          error_message: emailResult.error || "Unknown email error",
        });
        stats.errors++;
        continue;
      }

      // Log email sent
      await logEmailSent({
        member_id: member.id,
        template_type: stageKey,
        email_to: member.email,
        subject: emailContent.subject,
        status: "sent",
        provider: "brevo",
        provider_message_id: emailResult.id || null,
      });

      await supabaseAdmin
        .from("members")
        .update({ last_reminder_sent: new Date().toISOString().split("T")[0] })
        .eq("id", member.id);

      // Log activity
      await supabaseAdmin.from("activity_log").insert({
        user_id: member.user_id,
        event_type: "renewal_reminder_sent",
        description: `Renewal reminder sent (${stage.name})`,
        metadata: {
          stage: stageKey,
          days_offset: daysOffset,
          email_to: member.email,
          member_id: member.id,
        },
      });

      stats.sent++;
    } catch (error) {
      console.error(`Error processing reminder for member ${member.member_id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

async function sendRenewalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  return sendRawEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

/**
 * Update member status based on expiry date
 */
export async function updateMemberStatuses(): Promise<void> {
  const now = new Date();
  
  // Update to 'expiring' (30 days before expiry)
  const expiringDate = new Date(now);
  expiringDate.setDate(expiringDate.getDate() + 30);
  
  await supabaseAdmin
    .from("members")
    .update({ status: "expiring" })
    .eq("status", "active")
    .lte("expiry_date", expiringDate.toISOString())
    .gt("expiry_date", now.toISOString());

  // Update to 'expired'
  await supabaseAdmin
    .from("members")
    .update({ status: "expired" })
    .eq("status", "expiring")
    .lte("expiry_date", now.toISOString());
}
