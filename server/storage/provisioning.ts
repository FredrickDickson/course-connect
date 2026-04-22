/**
 * Provisioning Service
 * Handles immediate provisioning after successful enrollment:
 * - Welcome emails
 * - Community channel access
 * - CRM updates
 * - Activity logging
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface ProvisioningContext {
  userId: string;
  courseId: string;
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW";
  paymentType: "individual" | "company_invoice";
  companyName?: string;
  companyEmail?: string;
  vatId?: string;
}

/**
 * Main provisioning function - called after successful payment
 */
export async function provisionCourseAccess(context: ProvisioningContext) {
  console.log(`Provisioning access for user ${context.userId}, course ${context.courseId}`);

  try {
    // Run all provisioning steps in parallel where possible
    await Promise.all([
      sendWelcomeEmail(context),
      updateCRM(context),
      logProvisioningActivity(context),
    ]);

    // Community channel access may depend on external services
    await grantCommunityAccess(context);

    console.log("Provisioning completed successfully");
  } catch (error) {
    console.error("Provisioning error:", error);
    // Don't throw - provisioning failures should not block enrollment
  }
}

/**
 * Send tiered welcome email based on enrollment level
 */
async function sendWelcomeEmail(context: ProvisioningContext) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email, first_name, last_name")
    .eq("id", context.userId)
    .single();

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, track")
    .eq("id", context.courseId)
    .single();

  if (!user || !course) {
    console.error("User or course not found for welcome email");
    return;
  }

  const level = context.enrollmentLevel.toLowerCase();
  const userName = user.first_name || user.email?.split("@")[0];

  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // For now, log the email content
  const emailContent = {
    to: user.email,
    subject: `Welcome to the ${level.charAt(0).toUpperCase() + level.slice(1)} Circle`,
    template: `welcome_${level}`,
    variables: {
      userName,
      courseTitle: course.title,
      track: course.track,
      enrollmentLevel: context.enrollmentLevel,
      companyName: context.companyName,
    },
  };

  console.log("Welcome email would be sent:", JSON.stringify(emailContent, null, 2));

  // Store email in activity log for tracking
  await supabaseAdmin.from("activity_log").insert({
    user_id: context.userId,
    event_type: "welcome_email_sent",
    event_data: {
      email_template: `welcome_${level}`,
      course_id: context.courseId,
      enrollment_level: context.enrollmentLevel,
    },
  });
}

/**
 * Update CRM with professional data
 */
async function updateCRM(context: ProvisioningContext) {
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", context.userId)
    .single();

  if (!user) {
    console.error("User profile not found for CRM update");
    return;
  }

  const crmData = {
    user_id: context.userId,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    enrollment_level: context.enrollmentLevel,
    payment_type: context.paymentType,
    ...(context.paymentType === "company_invoice" && {
      company_name: context.companyName,
      company_email: context.companyEmail,
      vat_id: context.vatId,
    }),
    enrolled_at: new Date().toISOString(),
  };

  // TODO: Integrate with CRM (HubSpot, Salesforce, etc.)
  console.log("CRM data would be synced:", JSON.stringify(crmData, null, 2));

  // Store CRM sync in activity log
  await supabaseAdmin.from("activity_log").insert({
    user_id: context.userId,
    event_type: "crm_updated",
    event_data: crmData,
  });
}

/**
 * Grant access to track-specific community channels
 */
async function grantCommunityAccess(context: ProvisioningContext) {
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("track")
    .eq("id", context.courseId)
    .single();

  if (!course) {
    console.error("Course not found for community access");
    return;
  }

  const track = course.track || "ARBITRATION";
  const level = context.enrollmentLevel.toLowerCase();

  // Define community channels based on track and level
  const channels = [
    `#${track.toLowerCase()}-general`, // Track-specific general channel
  ];

  // Add level-specific channels
  if (context.enrollmentLevel === "MEMBER") {
    channels.push(`#${track.toLowerCase()}-member`);
  } else if (context.enrollmentLevel === "FELLOW") {
    channels.push(`#${track.toLowerCase()}-member`);
    channels.push(`#${track.toLowerCase()}-fellow`);
  }

  // TODO: Integrate with community platform (Discord, Slack, etc.)
  console.log(`User ${context.userId} would be added to channels:`, channels);

  // Store community access in activity log
  await supabaseAdmin.from("activity_log").insert({
    user_id: context.userId,
    event_type: "community_access_granted",
    event_data: {
      track,
      enrollment_level: context.enrollmentLevel,
      channels,
    },
  });
}

/**
 * Log provisioning activity for analytics
 */
async function logProvisioningActivity(context: ProvisioningContext) {
  await supabaseAdmin.from("activity_log").insert({
    user_id: context.userId,
    event_type: "provisioning_completed",
    event_data: {
      course_id: context.courseId,
      enrollment_level: context.enrollmentLevel,
      payment_type: context.paymentType,
      completed_at: new Date().toISOString(),
    },
  });
}

/**
 * Handle company invoice generation for B2B payments
 */
export async function generateCompanyInvoice(context: ProvisioningContext) {
  if (context.paymentType !== "company_invoice") {
    return;
  }

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, price, currency")
    .eq("id", context.courseId)
    .single();

  if (!course) {
    console.error("Course not found for invoice generation");
    return;
  }

  const invoiceData = {
    company_name: context.companyName,
    company_email: context.companyEmail,
    vat_id: context.vatId,
    course_title: course.title,
    amount: course.price,
    currency: course.currency,
    invoice_date: new Date().toISOString(),
    invoice_number: `INV-${Date.now()}-${context.userId.slice(0, 8)}`,
  };

  console.log("Company invoice would be generated:", JSON.stringify(invoiceData, null, 2));

  // TODO: Generate PDF invoice and send to company email
  // Store invoice in activity log
  await supabaseAdmin.from("activity_log").insert({
    user_id: context.userId,
    event_type: "company_invoice_generated",
    event_data: invoiceData,
  });
}
