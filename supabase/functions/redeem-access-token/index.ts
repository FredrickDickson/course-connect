import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { triggerCourseProvisioning } from "../_shared/course-provisioning.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedeemRequest {
  courseId: string;
  userId: string;
  token: string;
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW" | null;
}

const ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  invalid_token: { status: 400, message: "This code is not valid." },
  token_disabled: { status: 400, message: "This code has been disabled." },
  token_course_mismatch: { status: 400, message: "This code is not valid for this course." },
  token_expired: { status: 400, message: "This code has expired." },
  token_exhausted: { status: 400, message: "This code has already been used." },
  already_enrolled: { status: 409, message: "You are already enrolled in this course." },
  course_not_found: { status: 404, message: "Course not found." },
  not_authenticated: { status: 401, message: "Please sign in to redeem this code." },
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body: RedeemRequest = await req.json();
    if (!body.courseId || !body.userId || !body.token) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Verify the caller's identity matches the userId being enrolled —
    // same pattern as paystack-course-initialize, so a valid Supabase JWT
    // can only ever redeem a code for the account that issued it.
    const authHeader = req.headers.get("Authorization");
    const callerToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!callerToken) {
      return json({ error: "Missing authorization" }, 401);
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerData, error: callerError } = await authClient.auth.getUser(callerToken);
    if (callerError || !callerData?.user || callerData.user.id !== body.userId) {
      return json({ error: "Caller does not match userId" }, 403);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.rpc("redeem_course_access_token", {
      p_token: body.token,
      p_user_id: body.userId,
      p_course_id: body.courseId,
      p_enrollment_level: body.enrollmentLevel,
    });

    if (error) {
      const mapped = ERROR_MESSAGES[error.message] ?? { status: 500, message: "Failed to redeem code." };
      return json({ error: mapped.message, code: error.message }, mapped.status);
    }

    const result = Array.isArray(data) ? data[0] : data;

    // Fetch programme_type for provisioning context (not returned by the RPC).
    const { data: course } = await supabase
      .from("courses")
      .select("programme_type")
      .eq("id", body.courseId)
      .single();

    // Best-effort provisioning parity with the paid flow — failure here
    // must NOT unwind the enrollment (matches webhook's try/catch semantics).
    try {
      await triggerCourseProvisioning(supabase, {
        userId: body.userId,
        courseId: body.courseId,
        programmeType: course?.programme_type || "PROFESSIONAL_PROGRAMME",
        enrollmentLevel: body.enrollmentLevel,
      });
    } catch (e) {
      console.error("Provisioning error (non-fatal):", e);
    }

    await supabase.from("activity_log").insert({
      user_id: body.userId,
      event_type: "course_enrolled",
      event_data: {
        course_id: body.courseId,
        enrollment_id: result?.enrollment_id,
        payment_method: "access_token",
        order_id: result?.order_id,
      },
    });

    return json(
      {
        success: true,
        enrollmentId: result?.enrollment_id,
        orderId: result?.order_id,
        free: true,
      },
      200,
    );
  } catch (error: any) {
    return json({ error: "Internal server error", message: error?.message }, 500);
  }
});
