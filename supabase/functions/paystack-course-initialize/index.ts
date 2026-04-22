import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CoursePaymentRequest {
  courseId: string;
  userId: string;
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW";
  paymentType: "individual" | "company_invoice";
  companyName?: string;
  companyEmail?: string;
  vatId?: string;
  amount: number;
  currency: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: CoursePaymentRequest = await req.json();

    // Validate required fields
    if (!body.courseId || !body.userId || !body.email || !body.amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, price, currency, level, track")
      .eq("id", body.courseId)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches course price
    const expectedAmount = parseFloat(course.price);
    if (Math.abs(body.amount - expectedAmount) > 0.01) {
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount: Math.round(body.amount * 100), // Convert to kobo/cents
        currency: body.currency || "GHS",
        metadata: {
          courseId: body.courseId,
          courseName: course.title,
          courseLevel: course.level,
          courseTrack: course.track,
          userId: body.userId,
          enrollmentLevel: body.enrollmentLevel,
          paymentType: body.paymentType,
          ...(body.paymentType === "company_invoice" && {
            companyName: body.companyName,
            companyEmail: body.companyEmail,
            vatId: body.vatId,
          }),
          custom_fields: [
            {
              display_name: "Course ID",
              variable_name: "course_id",
              value: body.courseId,
            },
            {
              display_name: "Enrollment Level",
              variable_name: "enrollment_level",
              value: body.enrollmentLevel,
            },
          ],
        },
        callback_url: `${new URL(req.url).origin}/checkout/${body.courseId}?status=success`,
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Paystack initialization failed", details: paystackData }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
