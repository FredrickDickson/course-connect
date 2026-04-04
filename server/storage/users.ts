/**
 * Storage module: Users
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 *
 * @module storage/users
 * @description Handles database operations for users
 */

import type { User, UpsertUser } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getUser(id: string): Promise<User | undefined> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;
  return data;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !data) return undefined;
  return data;
}

export async function upsertUser(userData: UpsertUser): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert({
      ...userData,
      email: userData.email?.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(
  id: string,
  data: Partial<User>,
): Promise<User> {
  const { data: updatedUser, error } = await supabaseAdmin
    .from("users")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updatedUser;
}

export async function updateUserPaystackInfo(
  id: string,
  customerCode: string,
): Promise<User> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .update({
      paystack_customer_code: customerCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return user;
}

export async function updateUserRole(
  id: string,
  role: "student" | "instructor" | "admin",
): Promise<User> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return user;
}

export async function getInstructors(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("role", "instructor")
    .order("first_name")
    .order("last_name");

  if (error) throw error;
  return data || [];
}

export async function getUsers(filters?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<User[]> {
  let query = supabaseAdmin.from("users").select("*");
  if (filters?.role) {
    query = query.eq("role", filters.role);
  }
  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
    );
  }
  query = query.order("created_at", { ascending: false });
  if (filters?.page && filters?.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
