// deno-lint-ignore-file no-explicit-any
// Independent, minimal copy of paystack-webhook's triggerProvisioning() for
// the access-token ($0) enrollment path. Deliberately NOT shared with the
// webhook module — the webhook is the live Paystack payment path and must
// not be touched by this feature, so this is a bounded, one-directional
// duplication (welcome email + community access + CRM update; no
// company-invoice branch, since token redemptions are always "individual").
// Deno-only module (Edge Function runtime).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

export interface CourseProvisioningContext {
  userId: string;
  courseId: string;
  programmeType: string;
  enrollmentLevel: string | null;
}

export async function triggerCourseProvisioning(supabase: any, ctx: CourseProvisioningContext) {
  const [{ data: user }, { data: course }] = await Promise.all([
    supabase.from("users").select("*").eq("id", ctx.userId).single(),
    supabase.from("courses").select("*").eq("id", ctx.courseId).single(),
  ]);

  if (!user || !course) {
    console.error("User or course not found for provisioning");
    return;
  }

  const isAdjunctCourse = ctx.programmeType === "ADJUNCT_COURSE";

  try {
    await sendWelcomeEmail(user, course, ctx, isAdjunctCourse);
    await addCommunityAccess(supabase, user, course, ctx, isAdjunctCourse);
    await updateCRM(supabase, user, course, ctx);

    await supabase.from("activity_log").insert({
      user_id: ctx.userId,
      event_type: "provisioning_completed",
      event_data: {
        ...ctx,
        payment_type: "access_token",
        completed_steps: ["welcome_email", "community_access", "crm_update"],
      },
    });
  } catch (error) {
    console.error("Provisioning error (access token path):", error);
    await supabase.from("activity_log").insert({
      user_id: ctx.userId,
      event_type: "provisioning_failed",
      event_data: {
        ...ctx,
        payment_type: "access_token",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function sendWelcomeEmail(user: any, course: any, ctx: CourseProvisioningContext, isAdjunctCourse: boolean) {
  const templates: Record<string, string> = {
    ASSOCIATE: "welcome_associate",
    MEMBER: "welcome_member",
    FELLOW: "welcome_fellow",
  };
  const template = isAdjunctCourse
    ? "welcome_adjunct_course"
    : templates[ctx.enrollmentLevel || "ASSOCIATE"] || templates.ASSOCIATE;

  try {
    const internalApiKey = Deno.env.get("INTERNAL_API_KEY");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${internalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: isAdjunctCourse
          ? `Welcome to ${course.title}`
          : `Welcome to ${course.title} - ${ctx.enrollmentLevel} Enrollment`,
        html: isAdjunctCourse
          ? generateAdjunctWelcomeEmailHTML(user, course)
          : generateWelcomeEmailHTML(user, course, ctx.enrollmentLevel || "ASSOCIATE"),
        from: "CIMA Learn <noreply@thecima.org>",
        tags: [
          { name: "type", value: "welcome" },
          { name: "course", value: String(course.id) },
          ...(isAdjunctCourse ? [] : [{ name: "level", value: ctx.enrollmentLevel || "ASSOCIATE" }]),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email function error: ${error}`);
    }
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw — email failure shouldn't break the enrollment flow
  }
}

function generateWelcomeEmailHTML(user: any, course: any, level: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to ${course.title}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a365d;">Welcome to CIMA Learn, ${user.first_name || "Student"}!</h2>
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
    <p style="font-size: 12px; color: #718096;">If you have questions, reply to this email or contact support.</p>
  </div>
</body>
</html>`;
}

function generateAdjunctWelcomeEmailHTML(user: any, course: any) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to ${course.title}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a365d;">Welcome to CIMA Learn, ${user.first_name || "Student"}!</h2>
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
    <p style="font-size: 12px; color: #718096;">If you have questions, reply to this email or contact support.</p>
  </div>
</body>
</html>`;
}

async function addCommunityAccess(supabase: any, user: any, course: any, ctx: CourseProvisioningContext, isAdjunctCourse: boolean) {
  const communityChannels = [
    `course-${course.id}-general`,
    `course-${course.id}-announcements`,
    ...(isAdjunctCourse ? [] : [`${(ctx.enrollmentLevel || "ASSOCIATE").toLowerCase()}-members`]),
  ];

  for (const channel of communityChannels) {
    await supabase.from("community_memberships").upsert(
      {
        user_id: ctx.userId,
        channel_name: channel,
        course_id: ctx.courseId,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "user_id,channel_name" },
    );
  }

  await supabase.from("activity_log").insert({
    user_id: ctx.userId,
    event_type: "community_access_granted",
    event_data: { channels: communityChannels, course_id: ctx.courseId },
  });
}

async function updateCRM(supabase: any, user: any, course: any, ctx: CourseProvisioningContext) {
  const crmData = {
    user_id: ctx.userId,
    email: user.email,
    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
    course_enrolled: course.title,
    enrollment_level: ctx.enrollmentLevel,
    enrollment_date: new Date().toISOString(),
    payment_type: "access_token",
  };

  await supabase.from("crm_updates").insert({
    user_id: ctx.userId,
    crm_data: crmData,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  await supabase.from("activity_log").insert({
    user_id: ctx.userId,
    event_type: "crm_update_queued",
    event_data: crmData,
  });
}
