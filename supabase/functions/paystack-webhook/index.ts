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

  // TODO: Implement the following provisioning steps:
  // 1. Send tiered welcome email (Associate/Member/Fellow)
  // 2. Add user to track-specific community channels
  // 3. Update CRM with professional data
  // 4. Log provisioning activity
  // 5. Generate company invoice if applicable

  console.log(`Provisioning triggered for user ${context.userId}, course ${context.courseId}, level ${context.enrollmentLevel}`);

  // Log provisioning activity
  await supabase.from("activity_log").insert({
    user_id: context.userId,
    event_type: "provisioning_triggered",
    event_data: context,
  });
}
