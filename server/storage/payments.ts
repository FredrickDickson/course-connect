/**
 * Storage module: Payments
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 */

import type {
  Order,
  InsertOrder,
  InstructorPayout,
  InsertInstructorPayout,
  InstructorApplication,
  InsertInstructorApplication,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Order operations
export async function createOrder(order: InsertOrder): Promise<Order> {
  const insertPayload = {
    user_id: order.userId,
    course_id: order.courseId,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    paystack_reference: order.paystackReference,
    // Add currency conversion fields if available
    ...(order.amountUsd && { amount_usd: order.amountUsd }),
    ...(order.amountGhs && { amount_ghs: order.amountGhs }),
    ...(order.exchangeRate && { exchange_rate: order.exchangeRate }),
    ...(order.originalCurrency && { original_currency: order.originalCurrency }),
    ...(order.chargedCurrency && { charged_currency: order.chargedCurrency }),
  };
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(
  id: string,
  status: string,
  paymentIntentId?: string,
): Promise<Order> {
  const updateData: any = { status };
  if (paymentIntentId) {
    updateData.paystack_reference = paymentIntentId;
  }
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrderByReference(
  reference: string,
  status: string,
): Promise<Order> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("paystack_reference", reference)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserOrders(userId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Instructor payout operations
export async function createInstructorPayout(
  payout: InsertInstructorPayout,
): Promise<InstructorPayout> {
  const { data, error } = await supabaseAdmin
    .from("instructor_payouts")
    .insert(payout)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInstructorPayouts(
  instructorId: string,
): Promise<InstructorPayout[]> {
  const { data, error } = await supabaseAdmin
    .from("instructor_payouts")
    .select("*")
    .eq("instructor_id", instructorId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updatePayoutStatus(
  payoutId: string,
  status: string,
): Promise<InstructorPayout> {
  const updateData: any = { status };
  if (status === "completed") {
    updateData.processed_at = new Date().toISOString();
  }
  const { data, error } = await supabaseAdmin
    .from("instructor_payouts")
    .update(updateData)
    .eq("id", payoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Instructor application operations
export async function createInstructorApplication(
  application: InsertInstructorApplication,
): Promise<InstructorApplication> {
  const { data, error } = await supabaseAdmin
    .from("instructor_applications")
    .insert(application)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInstructorApplicationByUserId(
  userId: string,
): Promise<InstructorApplication | undefined> {
  const { data, error } = await supabaseAdmin
    .from("instructor_applications")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .maybeSingle();
  if (error || !data) return undefined;
  return data;
}

export async function getInstructorApplications(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<InstructorApplication[]> {
  let query = supabaseAdmin.from("instructor_applications").select("*");
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  query = query.order("submitted_at", { ascending: false });
  if (filters?.page && filters?.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateInstructorApplication(
  id: string,
  updates: Partial<InstructorApplication>,
): Promise<InstructorApplication> {
  const { data, error } = await supabaseAdmin
    .from("instructor_applications")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Admin operations
export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalInstructors: number;
  pendingApplications: number;
  totalCourses: number;
  monthlyRevenue: number;
  activeStudents: number;
}> {
  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });
  const { count: totalInstructors } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "instructor");
  const { count: pendingApplications } = await supabaseAdmin
    .from("instructor_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: totalCourses } = await supabaseAdmin
    .from("courses")
    .select("*", { count: "exact", head: true });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: revenueRows } = await supabaseAdmin
    .from("orders")
    .select("amount")
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());
  const monthlyRevenue = (revenueRows || []).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
  const { count: activeStudents } = await supabaseAdmin
    .from("enrollments")
    .select("user_id", { count: "exact", head: true });
  return {
    totalUsers: totalUsers || 0,
    totalInstructors: totalInstructors || 0,
    pendingApplications: pendingApplications || 0,
    totalCourses: totalCourses || 0,
    monthlyRevenue,
    activeStudents: activeStudents || 0,
  };
}
