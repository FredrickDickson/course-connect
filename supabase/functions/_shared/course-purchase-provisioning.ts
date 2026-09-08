// deno-lint-ignore-file no-explicit-any
// Post-enrollment provisioning (welcome email, community access, CRM stub,
// company invoice) for PAID course purchases — extracted from
// paystack-webhook so paystack-reconcile can trigger the same side effects
// for a payment the webhook never saw.
//
// Deliberately a separate module from _shared/course-provisioning.ts, which
// is an independent, minimal copy used only by the $0 access-token
// redemption path (see that file's own header comment) — this one carries
// the full paid-purchase feature set (company invoices, payment_type
// variants) that the access-token path intentionally does not need.

export interface CoursePurchaseProvisioningContext {
  userId: string;
  courseId: string;
  programmeType: string;
  enrollmentLevel: string | null;
  paymentType: string;
  companyName?: string;
  companyEmail?: string;
  vatId?: string;
}

export async function triggerCoursePurchaseProvisioning(supabase: any, context: CoursePurchaseProvisioningContext) {
  const [{ data: user }, { data: course }] = await Promise.all([
    supabase.from("users").select("*").eq("id", context.userId).single(),
    supabase.from("courses").select("*").eq("id", context.courseId).single(),
  ]);

  if (!user || !course) {
    console.error("triggerCoursePurchaseProvisioning: user or course not found", context.userId, context.courseId);
    return;
  }

  const isAdjunctCourse = context.programmeType === "ADJUNCT_COURSE";

  console.log(
    `Provisioning triggered for user ${context.userId}, course ${context.courseId}, level ${context.enrollmentLevel ?? "N/A (adjunct)"}`,
  );

  try {
    await sendWelcomeEmail(supabase, user, course, context, isAdjunctCourse);
    await addCommunityAccess(supabase, user, course, context, isAdjunctCourse);
    await updateCRM(supabase, user, course, context);

    if (context.paymentType === "company_invoice") {
      await generateCompanyInvoice(supabase, user, course, context);
    }

    await supabase.from("activity_log").insert({
      user_id: context.userId,
      event_type: "provisioning_completed",
      description: `Provisioning completed for ${course.title}`,
      entity_type: "enrollment",
      metadata: {
        ...context,
        completed_steps: [
          "welcome_email",
          "community_access",
          "crm_update",
          ...(context.paymentType === "company_invoice" ? ["company_invoice"] : []),
        ],
      },
    });

    console.log(`Provisioning completed for user ${context.userId}`);
  } catch (error) {
    console.error("Provisioning error:", error);
    await supabase.from("activity_log").insert({
      user_id: context.userId,
      event_type: "provisioning_failed",
      description: `Provisioning failed for ${course.title}`,
      entity_type: "enrollment",
      metadata: {
        ...context,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function sendWelcomeEmail(
  supabase: any,
  user: any,
  course: any,
  context: CoursePurchaseProvisioningContext,
  isAdjunctCourse: boolean,
) {
  const templates: Record<string, string> = {
    ASSOCIATE: "welcome_associate",
    MEMBER: "welcome_member",
    FELLOW: "welcome_fellow",
  };

  const template = isAdjunctCourse
    ? "welcome_adjunct_course"
    : templates[context.enrollmentLevel as keyof typeof templates] || templates.ASSOCIATE;

  try {
    const internalApiKey = Deno.env.get("INTERNAL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${internalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: isAdjunctCourse
          ? `Welcome to ${course.title}`
          : `Welcome to ${course.title} - ${context.enrollmentLevel} Enrollment`,
        html: isAdjunctCourse
          ? generateAdjunctWelcomeEmailHTML(user, course)
          : generateWelcomeEmailHTML(user, course, context.enrollmentLevel || "ASSOCIATE"),
        from: "CIMA Learn <noreply@thecima.org>",
        tags: [
          { name: "type", value: "welcome" },
          { name: "course", value: String(course.id) },
          ...(isAdjunctCourse ? [] : [{ name: "level", value: context.enrollmentLevel }]),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email function error: ${error}`);
    }

    console.log(`Welcome email sent to ${user.email} for course ${course.title}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw - email failure shouldn't break the enrollment flow
  }

  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "email_sent",
    description: `Welcome email sent for ${course.title}`,
    entity_type: "enrollment",
    metadata: {
      template,
      recipient: user.email,
      course_name: course.title,
    },
  });
}

function generateWelcomeEmailHTML(user: any, course: any, level: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to ${course.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a365d;">Welcome to CIMA Learn, ${user.first_name || 'Student'}!</h2>

    <p>You've successfully enrolled in <strong>${course.title}</strong> at the <strong>${level}</strong> level.</p>

    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">What's Next?</h3>
      <ul>
        <li>Access your course materials in your dashboard</li>
        <li>Join the community discussions</li>
        <li>Start with the first module</li>
      </ul>
    </div>

    <p><a href="https://cima-learn.vercel.app/dashboard"
          style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Go to Dashboard
    </a></p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="font-size: 12px; color: #718096;">
      If you have questions, reply to this email or contact support.
    </p>
  </div>
</body>
</html>`;
}

function generateAdjunctWelcomeEmailHTML(user: any, course: any) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to ${course.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a365d;">Welcome to CIMA Learn, ${user.first_name || 'Student'}!</h2>

    <p>You've successfully enrolled in <strong>${course.title}</strong>.</p>

    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">What's Next?</h3>
      <ul>
        <li>Access your course materials in your dashboard</li>
        <li>Work through the lessons at your own pace</li>
        <li>Earn a Certificate of Completion when you finish</li>
      </ul>
    </div>

    <p><a href="https://cima-learn.vercel.app/dashboard"
          style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Go to Dashboard
    </a></p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="font-size: 12px; color: #718096;">
      If you have questions, reply to this email or contact support.
    </p>
  </div>
</body>
</html>`;
}

async function addCommunityAccess(
  supabase: any,
  user: any,
  course: any,
  context: CoursePurchaseProvisioningContext,
  isAdjunctCourse: boolean,
) {
  const communityChannels = [
    `course-${course.id}-general`,
    `course-${course.id}-announcements`,
    ...(isAdjunctCourse ? [] : [`${(context.enrollmentLevel || "associate").toLowerCase()}-members`]),
  ];

  console.log(`Adding user ${user.email} to channels: ${communityChannels.join(", ")}`);

  for (const channel of communityChannels) {
    await supabase.from("community_memberships").upsert({
      user_id: context.userId,
      channel_name: channel,
      course_id: context.courseId,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'user_id,channel_name' });
  }

  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "community_access_granted",
    description: `Community access granted for ${course.title}`,
    entity_type: "enrollment",
    metadata: {
      channels: communityChannels,
      course_id: context.courseId,
    },
  });
}

async function updateCRM(supabase: any, user: any, course: any, context: CoursePurchaseProvisioningContext) {
  const crmData = {
    user_id: context.userId,
    email: user.email,
    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
    course_enrolled: course.title,
    enrollment_level: context.enrollmentLevel,
    enrollment_date: new Date().toISOString(),
    payment_type: context.paymentType,
    ...(context.paymentType === "company_invoice" && {
      company_name: context.companyName,
      company_email: context.companyEmail,
      vat_id: context.vatId,
    }),
  };

  console.log(`Updating CRM for user ${user.email} with data:`, crmData);

  await supabase.from("crm_updates").insert({
    user_id: context.userId,
    crm_data: crmData,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "crm_update_queued",
    description: `CRM update queued for ${course.title}`,
    entity_type: "enrollment",
    metadata: crmData,
  });
}

async function generateCompanyInvoice(supabase: any, user: any, course: any, context: CoursePurchaseProvisioningContext) {
  const invoiceData = {
    invoice_number: `INV-${Date.now()}`,
    user_id: context.userId,
    course_id: context.courseId,
    company_name: context.companyName,
    company_email: context.companyEmail,
    vat_id: context.vatId,
    amount: course.price,
    currency: course.currency || "USD",
    issue_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "issued",
  };

  console.log(`Generating company invoice for ${context.companyName}:`, invoiceData);

  await supabase.from("invoices").insert(invoiceData);

  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "company_invoice_generated",
    description: `Company invoice generated for ${course.title}`,
    entity_type: "enrollment",
    metadata: invoiceData,
  });
}
