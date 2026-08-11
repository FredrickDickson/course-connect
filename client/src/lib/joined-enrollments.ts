import { supabase } from "@/integrations/supabase/client";

export interface JoinedEnrollment {
  id: string;
  user_id: string | null;
  course_id: string;
  enrollment_level: string | null;
  status: string;
  enrolled_at: string;
  course?: { title: string; cohort_id?: string } | null;
  order: {
    id: string;
    user_id: string | null;
    course_id: string;
    booking_ref: string | null;
    amount: number;
    currency: string | null;
    status: string;
    paystack_reference: string | null;
    created_at: string;
    enrollment_metadata: {
      email?: string;
      full_name?: string;
      phone?: string;
      whatsapp?: string;
      country?: string;
      institution?: string;
      address?: string;
      programme_selected?: string;
      personal_statement?: string;
      admin_notes?: string;
      notes_updated_at?: string;
    } | null;
  } | null;
}

/**
 * public.enrollments and public.orders have no foreign key between them
 * (each independently references courses), so PostgREST can't embed one
 * through the other. Join them client-side on (user_id, course_id),
 * preferring the most recently created order per pair.
 */
export async function fetchJoinedEnrollments(filters?: { userId?: string }): Promise<JoinedEnrollment[]> {
  let enrollmentQuery = (supabase as any)
    .from("enrollments")
    .select("*, course:courses(title, cohort_id)")
    .order("enrolled_at", { ascending: false });
  if (filters?.userId) enrollmentQuery = enrollmentQuery.eq("user_id", filters.userId);

  let orderQuery = (supabase as any)
    .from("orders")
    .select("id, user_id, course_id, booking_ref, amount, currency, status, paystack_reference, created_at, enrollment_metadata")
    .order("created_at", { ascending: false });
  if (filters?.userId) orderQuery = orderQuery.eq("user_id", filters.userId);

  const [{ data: enrollments, error: enrollError }, { data: orders, error: orderError }] = await Promise.all([
    enrollmentQuery,
    orderQuery,
  ]);
  if (enrollError) throw enrollError;
  if (orderError) throw orderError;

  const orderMap = new Map<string, any>();
  (orders || []).forEach((o: any) => {
    const key = `${o.user_id}::${o.course_id}`;
    if (!orderMap.has(key)) orderMap.set(key, o); // orders sorted desc by created_at, first wins
  });

  return (enrollments || []).map((e: any) => ({
    ...e,
    order: orderMap.get(`${e.user_id}::${e.course_id}`) || null,
  }));
}
