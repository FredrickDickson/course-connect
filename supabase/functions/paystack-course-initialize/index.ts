import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Exchange rate for USD to GHS conversion
const USD_TO_GHS_RATE = 15.50; // Update this rate as needed

/**
 * Convert USD amount to GHS
 * @param usdAmount - Amount in USD
 * @returns Amount in GHS (rounded to 2 decimal places)
 */
function convertUSDtoGHS(usdAmount: number): number {
  if (usdAmount <= 0) return 0;
  const ghsAmount = usdAmount * USD_TO_GHS_RATE;
  return Math.round(ghsAmount * 100) / 100;
}

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
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: CoursePaymentRequest = await req.json();

    // Validate required fields
    if (!body.courseId || !body.userId || !body.email || !body.amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
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
        { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify amount matches course price
    const expectedAmount = parseFloat(course.price);
    if (Math.abs(body.amount - expectedAmount) > 0.01) {
      return new Response(
        JSON.stringify({ error: "Amount mismatch" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Convert USD to GHS for Paystack (always charge in GHS for Ghana merchant)
    const amountUSD = body.amount;
    const amountGHS = convertUSDtoGHS(amountUSD);
    
    console.log(`Currency conversion: $${amountUSD} USD -> ¢${amountGHS} GHS (Rate: ${USD_TO_GHS_RATE})`);

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount: Math.round(amountGHS * 100), // Convert to pesewas (GHS smallest unit)
        currency: "GHS", // Always GHS for Ghana merchant
        metadata: {
          courseId: body.courseId,
          courseName: course.title,
          courseLevel: course.level,
          courseTrack: course.track,
          userId: body.userId,
          enrollmentLevel: body.enrollmentLevel,
          paymentType: body.paymentType,
          // Currency conversion details
          amountUSD: amountUSD,
          amountGHS: amountGHS,
          exchangeRate: USD_TO_GHS_RATE,
          originalCurrency: body.currency || "USD",
          chargedCurrency: "GHS",
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
            {
              display_name: "Original Amount (USD)",
              variable_name: "original_amount_usd",
              value: amountUSD.toString(),
            },
            {
              display_name: "Charged Amount (GHS)",
              variable_name: "charged_amount_ghs",
              value: amountGHS.toString(),
            },
            {
              display_name: "Exchange Rate",
              variable_name: "exchange_rate",
              value: USD_TO_GHS_RATE.toString(),
            },
          ],
        },
        callback_url: `${new URL(req.url).origin}/payment-success`,
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Paystack initialization failed", details: paystackData }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error?.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
