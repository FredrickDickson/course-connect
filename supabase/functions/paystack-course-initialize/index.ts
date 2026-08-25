import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
// Supabase automatically provides these environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("VITE_APP_URL") || "http://localhost:5173";

// Exchange rate for USD to GHS conversion
const USD_TO_GHS_RATE = parseFloat(Deno.env.get("USD_TO_GHS_RATE") || "14.75");

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

/**
 * Resolve the amount to actually charge via Paystack (always GHS) given the
 * course's native currency (trusted DB value, not client-supplied). GHS-
 * priced courses are charged as-is; anything else (USD, or a legacy/missing
 * currency value) is treated as USD and converted via the fixed rate.
 */
function resolveChargeAmount(price: number, courseCurrency: string | null | undefined) {
  const normalized = (courseCurrency || "USD").toUpperCase();
  if (normalized === "GHS") {
    return {
      amountGHS: price,
      amountUSD: null as number | null,
      exchangeRate: 1,
      originalCurrency: "GHS",
    };
  }
  return {
    amountGHS: convertUSDtoGHS(price),
    amountUSD: price,
    exchangeRate: USD_TO_GHS_RATE,
    originalCurrency: "USD",
  };
}

interface CoursePaymentRequest {
  courseId: string;
  userId: string;
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW" | null;
  programmeType?: "PROFESSIONAL_PROGRAMME" | "ADJUNCT_COURSE";
  paymentType: "individual" | "company_invoice";
  companyName?: string;
  companyEmail?: string;
  vatId?: string;
  amount: number;
  currency: string;
  email: string;
  /** Optional coupon code for a partial percentage discount. 100%-off
   * access tokens are never sent here — the client routes those to the
   * redeem-access-token function instead, since a free enrollment never
   * goes through Paystack. */
  accessCode?: string;
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

    // Verify the caller's identity matches the userId they're asking us to
    // charge/enroll — without this, any caller holding a valid Supabase JWT
    // (including the public anon key) could enroll an arbitrary victim once
    // the resulting transaction is paid.
    const authHeader = req.headers.get("Authorization");
    const callerToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!callerToken) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerData, error: callerError } = await authClient.auth.getUser(callerToken);
    if (callerError || !callerData?.user || callerData.user.id !== body.userId) {
      return new Response(
        JSON.stringify({ error: "Caller does not match userId" }),
        {
          status: 403,
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
      .select("id, title, price, currency, level, track, programme_type")
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

    // Optional coupon support (percentage discount < 100%; 100%-off access
    // tokens never reach this endpoint — they're redeemed for free via the
    // redeem-access-token function instead). When no accessCode is sent,
    // expectedAmount is exactly the course price, identical to before.
    let expectedAmount = parseFloat(course.price);
    let accessTokenId: string | null = null;

    if (body.accessCode) {
      const { data: validation, error: validationError } = await supabase.rpc(
        "validate_course_access_token",
        { _token: body.accessCode, _course_id: body.courseId },
      );
      const v = Array.isArray(validation) ? validation[0] : validation;
      if (validationError || !v?.valid) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired code" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }
      if (v.discounted_amount <= 0) {
        // Defensive: a 100%-off token should never reach this endpoint.
        return new Response(
          JSON.stringify({ error: "This code grants free access — use the redeem-access-token endpoint" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }
      expectedAmount = v.discounted_amount;

      const { data: tokenRow } = await supabase
        .from("course_access_tokens")
        .select("id")
        .eq("token", body.accessCode.toUpperCase().trim())
        .single();
      accessTokenId = tokenRow?.id ?? null;
    }

    // Verify amount matches course price (or the validated discounted price)
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

    // Charge in GHS for Paystack (Ghana merchant). expectedAmount is already
    // in the course's native currency: GHS-priced courses are charged as-is,
    // USD-priced ones are converted via the fixed exchange rate.
    const { amountGHS, amountUSD, exchangeRate, originalCurrency } = resolveChargeAmount(
      expectedAmount,
      course.currency,
    );

    console.log(
      amountUSD !== null
        ? `Currency conversion: $${amountUSD} USD -> ¢${amountGHS} GHS (Rate: ${exchangeRate})`
        : `Charging GHS as-is: ¢${amountGHS} GHS (no conversion, course.currency=GHS)`,
    );

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
          programmeType: course.programme_type || "PROFESSIONAL_PROGRAMME",
          userId: body.userId,
          enrollmentLevel: body.enrollmentLevel,
          paymentType: body.paymentType,
          // Currency conversion details
          amountUSD: amountUSD,
          amountGHS: amountGHS,
          exchangeRate: exchangeRate,
          originalCurrency: originalCurrency,
          chargedCurrency: "GHS",
          ...(accessTokenId && { accessTokenId, accessCode: body.accessCode }),
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
              value: body.enrollmentLevel || "N/A",
            },
            {
              display_name: `Original Amount (${originalCurrency})`,
              variable_name: "original_amount",
              value: (amountUSD ?? amountGHS).toString(),
            },
            {
              display_name: "Charged Amount (GHS)",
              variable_name: "charged_amount_ghs",
              value: amountGHS.toString(),
            },
            {
              display_name: "Exchange Rate",
              variable_name: "exchange_rate",
              value: exchangeRate.toString(),
            },
          ],
        },
        callback_url: `${APP_URL}/payment-success`,
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
