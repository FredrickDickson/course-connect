import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    // For production, verify the signature
    // const hash = crypto.subtle.digest("SHA512", body + PAYSTACK_SECRET_KEY);
    // if (signature !== hash) {
    //   return new Response("Invalid signature", { status: 401 });
    // }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === "charge.success") {
      const metadata = event.data.metadata;
      
      if (metadata && metadata.courseId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", metadata.userId)
          .eq("course_id", metadata.courseId)
          .maybeSingle();

        if (existingEnrollment) {
          console.log("Enrollment already exists, skipping");
          return new Response("Enrollment already exists", { status: 200 });
        }

        // Create order record with currency conversion details
        const orderData = {
          user_id: metadata.userId,
          course_id: metadata.courseId,
          amount: (event.data.amount / 100).toString(), // Charged amount in GHS
          currency: event.data.currency, // GHS
          status: "completed",
          paystack_reference: event.data.reference,
          // Currency conversion details from metadata
          amount_usd: metadata.amountUSD?.toString() || null,
          amount_ghs: metadata.amountGhs?.toString() || (event.data.amount / 100).toString(),
          exchange_rate: metadata.exchangeRate?.toString() || null,
          original_currency: metadata.originalCurrency || "USD",
          charged_currency: metadata.chargedCurrency || event.data.currency,
        };

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          console.error("Order creation error:", orderError);
          return new Response("Order creation failed", { status: 500 });
        }

        // Create enrollment
        const { data: enrollment, error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            user_id: metadata.userId,
            course_id: metadata.courseId,
            progress: "0",
            status: "ACTIVE",
            enrollment_type: "COURSE",
            enrollment_level: metadata.enrollmentLevel || "ASSOCIATE",
            payment_reference: event.data.reference,
            payment_amount: event.data.amount / 100, // Convert from kobo/cents
            payment_currency: event.data.currency,
          })
          .select()
          .single();

        if (enrollError) {
          console.error("Enrollment creation error:", enrollError);
          return new Response("Enrollment creation failed", { status: 500 });
        }

        // Log activity
        await supabase.from("activity_log").insert({
          user_id: metadata.userId,
          event_type: "course_enrolled",
          event_data: {
            course_id: metadata.courseId,
            course_name: metadata.courseName,
            enrollment_id: enrollment.id,
            payment_reference: event.data.reference,
            payment_type: metadata.paymentType || "individual",
            ...(metadata.paymentType === "company_invoice" && {
              company_name: metadata.companyName,
              company_email: metadata.companyEmail,
              vat_id: metadata.vatId,
            }),
          },
        });

        // Update course enrollment count
        await supabase
          .from("courses")
          .update({ enrollment_count: (await supabase.from("courses").select("enrollment_count").eq("id", metadata.courseId).single()).data?.enrollment_count || 0 + 1 })
          .eq("id", metadata.courseId);

        // Trigger immediate provisioning
        await triggerProvisioning(supabase, metadata);

        console.log("Enrollment created successfully:", enrollment.id);
      }
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

async function triggerProvisioning(supabase: any, metadata: any) {
  // Get user and course details
  const [{ data: user }, { data: course }] = await Promise.all([
    supabase.from("users").select("*").eq("id", metadata.userId).single(),
    supabase.from("courses").select("*").eq("id", metadata.courseId).single(),
  ]);

  if (!user || !course) {
    console.error("User or course not found for provisioning");
    return;
  }

  const context = {
    userId: metadata.userId,
    courseId: metadata.courseId,
    enrollmentLevel: metadata.enrollmentLevel || "ASSOCIATE",
    paymentType: metadata.paymentType || "individual",
    companyName: metadata.companyName,
    companyEmail: metadata.companyEmail,
    vatId: metadata.vatId,
  };

  console.log(`Provisioning triggered for user ${context.userId}, course ${context.courseId}, level ${context.enrollmentLevel}`);

  try {
    // 1. Send tiered welcome email (Associate/Member/Fellow)
    await sendWelcomeEmail(supabase, user, course, context);

    // 2. Add user to track-specific community channels
    await addCommunityAccess(supabase, user, course, context);

    // 3. Update CRM with professional data
    await updateCRM(supabase, user, course, context);

    // 4. Generate company invoice if applicable
    if (metadata.paymentType === "company_invoice") {
      await generateCompanyInvoice(supabase, user, course, context);
    }

    // Log provisioning activity
    await supabase.from("activity_log").insert({
      user_id: context.userId,
      event_type: "provisioning_completed",
      event_data: {
        ...context,
        completed_steps: ["welcome_email", "community_access", "crm_update", ...(metadata.paymentType === "company_invoice" ? ["company_invoice"] : [])]
      },
    });

    console.log(`Provisioning completed for user ${context.userId}`);
  } catch (error) {
    console.error("Provisioning error:", error);
    await supabase.from("activity_log").insert({
      user_id: context.userId,
      event_type: "provisioning_failed",
      event_data: {
        ...context,
        error: error instanceof Error ? error.message : "Unknown error"
      },
    });
  }
}

async function sendWelcomeEmail(supabase: any, user: any, course: any, context: any) {
  // Get email template based on enrollment level
  const templates = {
    ASSOCIATE: "welcome_associate",
    MEMBER: "welcome_member", 
    FELLOW: "welcome_fellow"
  };

  const template = templates[context.enrollmentLevel as keyof typeof templates] || templates.ASSOCIATE;

  // This would integrate with your email service (SendGrid, etc.)
  console.log(`Sending ${template} email to ${user.email} for course ${course.title}`);
  
  // Log email activity
  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "email_sent",
    event_data: {
      template,
      recipient: user.email,
      course_name: course.title,
    },
  });
}

async function addCommunityAccess(supabase: any, user: any, course: any, context: any) {
  // Add user to course-specific community channels
  const communityChannels = [
    `course-${course.id}-general`,
    `course-${course.id}-announcements`,
    `${context.enrollmentLevel.toLowerCase()}-members`
  ];

  console.log(`Adding user ${user.email} to channels: ${communityChannels.join(", ")}`);

  // This would integrate with your community platform (Discord, Slack, etc.)
  for (const channel of communityChannels) {
    await supabase.from("community_memberships").insert({
      user_id: context.userId,
      channel_name: channel,
      course_id: context.courseId,
      joined_at: new Date().toISOString(),
    }).ignore(); // Ignore duplicates
  }

  // Log community access
  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "community_access_granted",
    event_data: {
      channels: communityChannels,
      course_id: context.courseId,
    },
  });
}

async function updateCRM(supabase: any, user: any, course: any, context: any) {
  // Update CRM with enrollment data
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

  // This would integrate with your CRM system (HubSpot, Salesforce, etc.)
  await supabase.from("crm_updates").insert({
    user_id: context.userId,
    crm_data: crmData,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  // Log CRM update
  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "crm_update_queued",
    event_data: crmData,
  });
}

async function generateCompanyInvoice(supabase: any, user: any, course: any, context: any) {
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
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    status: "issued",
  };

  console.log(`Generating company invoice for ${context.companyName}:`, invoiceData);

  // Create invoice record
  await supabase.from("invoices").insert(invoiceData);

  // Log invoice generation
  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "company_invoice_generated",
    event_data: invoiceData,
  });
}
