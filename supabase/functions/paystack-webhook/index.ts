import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    // Verify the webhook signature for security
    const encoder = new TextEncoder();
    const data = encoder.encode(body + PAYSTACK_SECRET_KEY);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (signature !== hashHex) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === "charge.success") {
      const metadata = event.data.metadata;

      // ------------------------------------------------------------------
      // Expedited application payment: flip status draft -> submitted
      // ------------------------------------------------------------------
      if (metadata && metadata.expeditedApplicationId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const now = new Date().toISOString();

        const { data: updated, error: updateErr } = await supabase
          .from("expedited_applications")
          .update({
            status: "submitted",
            paid_at: now,
            submitted_at: now,
          })
          .eq("paystack_reference", event.data.reference)
          .select()
          .single();

        if (updateErr || !updated) {
          console.error(
            "Failed to mark expedited application paid",
            updateErr,
            event.data.reference,
          );
          return new Response("Expedited update failed", { status: 500 });
        }

        await supabase.from("activity_log").insert({
          user_id: updated.user_id,
          event_type: "expedited_payment_succeeded",
          event_data: {
            application_id: updated.id,
            track: updated.track,
            target_level: updated.target_level,
            reference: event.data.reference,
            amount: event.data.amount / 100,
            currency: event.data.currency,
          },
        });

        console.log(
          `Expedited application ${updated.id} submitted after payment ${event.data.reference}`,
        );
        return new Response("Expedited payment recorded", { status: 200 });
      }

      // ------------------------------------------------------------------
      // Membership renewal payment
      // ------------------------------------------------------------------
      if (metadata && metadata.type === "renewal" && metadata.member_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const today = new Date();
        const newExpiry = new Date(today);
        newExpiry.setDate(newExpiry.getDate() + 365);
        const todayStr = today.toISOString().split("T")[0];
        const expiryStr = newExpiry.toISOString().split("T")[0];

        // Fetch member to get current state
        const { data: member, error: memberErr } = await supabase
          .from("members")
          .select("id, renewal_count, renewal_anniversary, issue_date, organization_id")
          .eq("member_id", metadata.member_id)
          .single();

        if (memberErr || !member) {
          console.error("Member not found for renewal", metadata.member_id, memberErr);
          return new Response("Member not found", { status: 404 });
        }

        const anniversary = member.renewal_anniversary || member.issue_date || todayStr;
        const newRenewalCount = (member.renewal_count || 0) + 1;

        // Update member record
        const { error: updateErr } = await supabase
          .from("members")
          .update({
            issue_date: todayStr,
            expiry_date: expiryStr,
            status: "active",
            renewal_count: newRenewalCount,
            last_renewal_at: todayStr,
            renewal_anniversary: anniversary,
            income_tier: metadata.income_tier || null,
            is_suspended: false,
            suspension_date: null,
          })
          .eq("member_id", metadata.member_id);

        if (updateErr) {
          console.error("Member update error:", updateErr);
          return new Response("Member update failed", { status: 500 });
        }

        // Insert renewal history
        const displayCurrency = metadata.currency || "USD";
        const displayAmount = metadata.display_amount || (event.data.amount / 100);
        const ghsAmount = event.data.amount / 100;

        const { error: historyErr } = await supabase
          .from("renewal_history")
          .insert({
            member_id: member.id,
            renewal_date: todayStr,
            new_expiry_date: expiryStr,
            amount_paid: ghsAmount,
            currency: "GHS",
            payment_method: "paystack",
            payment_reference: event.data.reference,
            status: "confirmed",
            confirmed_at: todayStr,
            income_tier: metadata.income_tier || null,
            currency_used: displayCurrency,
            base_amount: displayAmount,
            surcharge_amount: 0,
            discount_amount: 0,
            discount_percentage: 0,
            is_late: false,
          });

        if (historyErr) {
          console.error("Renewal history insert error:", historyErr);
        }

        // Log activity
        await supabase.from("activity_log").insert({
          user_id: member.id,
          event_type: "renewal_payment_succeeded",
          event_data: {
            member_id: metadata.member_id,
            reference: event.data.reference,
            amount: event.data.amount / 100,
            currency: metadata.currency || event.data.currency,
            income_tier: metadata.income_tier,
            new_expiry: expiryStr,
          },
        });

        // Call certificate generation API
        const certApiKey = Deno.env.get("CERTIFICATE_API_KEY");
        const appUrl = Deno.env.get("VITE_APP_URL") || "https://cima-learn.vercel.app";

        try {
          const certResponse = await fetch(`${appUrl}/api/certificates/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${certApiKey}`,
            },
            body: JSON.stringify({
              member_id: metadata.member_id,
              full_name: metadata.full_name || "Member",
              membership_level: metadata.membership_level || "member",
              issue_date: todayStr,
              expiry_date: expiryStr,
              renewal_count: newRenewalCount,
            }),
          });

          if (!certResponse.ok) {
            const certErr = await certResponse.text();
            console.error("Certificate generation failed:", certErr);
          } else {
            console.log("Certificate generated for", metadata.member_id);
          }
        } catch (certError) {
          console.error("Certificate API call failed:", certError);
        }

        console.log(`Renewal processed for member ${metadata.member_id}, ref ${event.data.reference}`);
        return new Response("Renewal processed", { status: 200 });
      }

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
        const { data: courseRow } = await supabase
          .from("courses")
          .select("enrollment_count")
          .eq("id", metadata.courseId)
          .single();

        await supabase
          .from("courses")
          .update({ enrollment_count: (courseRow?.enrollment_count || 0) + 1 })
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

  // Send email via send-email Edge Function
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
        subject: `Welcome to ${course.title} - ${context.enrollmentLevel} Enrollment`,
        html: generateWelcomeEmailHTML(user, course, context.enrollmentLevel),
        from: "CIMA Learn <noreply@thecima.org>",
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
    // Use upsert to ignore duplicates based on user_id and channel_name
    await supabase.from("community_memberships").upsert({
      user_id: context.userId,
      channel_name: channel,
      course_id: context.courseId,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'user_id,channel_name' });
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
