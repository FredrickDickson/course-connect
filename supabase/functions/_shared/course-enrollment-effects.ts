// deno-lint-ignore-file no-explicit-any
// Shared by paystack-webhook and paystack-reconcile so both paths create
// identical orders/enrollments/activity_log rows for a course purchase
// instead of drifting copies (the reason the pre-refactor webhook and
// api/verify-payment.ts silently diverged from each other).

export interface CourseEnrollmentInput {
  userId: string;
  courseId: string;
  paystackReference: string;
  /** Amount actually charged, in `currency` (this merchant always settles
   * Paystack charges in GHS regardless of what the buyer saw at checkout). */
  amount: number;
  currency: string;
  amountUSD?: number | string | null;
  amountGhs?: number | string | null;
  exchangeRate?: number | string | null;
  originalCurrency?: string;
  chargedCurrency?: string;
  enrollmentLevel?: string;
  paymentType?: string;
  companyName?: string;
  companyEmail?: string;
  vatId?: string;
  accessTokenId?: string;
}

export interface CourseEnrollmentResult {
  success: boolean;
  error?: string;
  alreadyEnrolled?: boolean;
  orderId?: string;
  enrollmentId?: string;
  courseTitle?: string;
  isAdjunctCourse?: boolean;
}

export async function applyCourseEnrollment(
  supabase: any,
  input: CourseEnrollmentInput,
): Promise<CourseEnrollmentResult> {
  const { userId, courseId } = input;

  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingEnrollment) {
    return { success: true, alreadyEnrolled: true, enrollmentId: existingEnrollment.id };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, programme_type")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return { success: false, error: `Course not found: ${courseId}` };
  }

  const isAdjunctCourse = course.programme_type === "ADJUNCT_COURSE";

  const orderData = {
    user_id: userId,
    course_id: courseId,
    amount: input.amount.toString(),
    currency: input.currency,
    status: "completed",
    paystack_reference: input.paystackReference,
    amount_usd: input.amountUSD != null ? input.amountUSD.toString() : null,
    amount_ghs: input.amountGhs != null ? input.amountGhs.toString() : input.amount.toString(),
    exchange_rate: input.exchangeRate != null ? input.exchangeRate.toString() : null,
    original_currency: input.originalCurrency || "USD",
    charged_currency: input.chargedCurrency || input.currency,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();

  if (orderError) {
    if (orderError.code === "23505") {
      // Another invocation (the webhook firing at the same moment as a
      // reconcile sweep, or two redelivered webhooks racing each other)
      // already inserted an order for this exact reference — that
      // invocation owns enrollment creation for it. Treat as already-handled
      // rather than a real failure so a benign race doesn't show up as
      // "failed" in the payment audit log.
      console.error("applyCourseEnrollment: duplicate order reference (race)", input.paystackReference);
      return { success: true, alreadyEnrolled: true };
    }
    return { success: false, error: `Order creation failed: ${orderError.message}` };
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      progress: "0",
      status: "ACTIVE",
      enrollment_type: "COURSE",
      // Adjunct Courses have no qualification level - standalone, independent
      // of the CIMA professional pathway.
      enrollment_level: isAdjunctCourse ? null : (input.enrollmentLevel || "ASSOCIATE"),
    })
    .select()
    .single();

  if (enrollError) {
    return {
      success: false,
      error: `Enrollment creation failed: ${enrollError.message}`,
      orderId: order.id,
    };
  }

  // courses.enrollment_count is kept in sync automatically by the
  // enrollments_sync_course_count trigger (20260811160000) — do NOT
  // increment it manually here (the old inline webhook code did, which
  // double-counted every course purchase after that trigger was added).

  await supabase.from("activity_log").insert({
    user_id: userId,
    event_type: "course_enrolled",
    description: `Enrolled in course: ${course.title}`,
    entity_type: "enrollment",
    entity_id: enrollment.id,
    metadata: {
      course_id: courseId,
      course_name: course.title,
      enrollment_id: enrollment.id,
      payment_reference: input.paystackReference,
      payment_type: input.paymentType || "individual",
      ...(input.paymentType === "company_invoice" && {
        company_name: input.companyName,
        company_email: input.companyEmail,
        vat_id: input.vatId,
      }),
    },
  });

  // If a partial-percentage coupon (access token) was used to reach this
  // discounted Paystack charge, record its usage against the order now that
  // payment is confirmed. 100%-off access tokens never reach this path —
  // they're redeemed directly, without Paystack, by redeem-course-access-token.
  if (input.accessTokenId) {
    const { data: incremented, error: tokenError } = await supabase.rpc(
      "increment_access_token_usage",
      { p_access_token_id: input.accessTokenId },
    );
    if (tokenError || !incremented) {
      console.error("applyCourseEnrollment: failed to increment coupon usage (non-fatal)", tokenError);
    } else {
      await supabase
        .from("orders")
        .update({ payment_method: "access_token", access_token_id: input.accessTokenId })
        .eq("id", order.id);
    }
  }

  return {
    success: true,
    orderId: order.id,
    enrollmentId: enrollment.id,
    courseTitle: course.title,
    isAdjunctCourse,
  };
}
