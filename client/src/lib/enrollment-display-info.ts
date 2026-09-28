import { supabase } from "@/integrations/supabase/client";
import type { JoinedEnrollment } from "./joined-enrollments";

export interface ProfileLite {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
}

export interface UserLite {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Bulk-fetches profiles/users once so callers can resolve a student's real
 * contact info without an N+1 query per enrollment row.
 */
export async function fetchProfilesAndUsersMaps() {
  const [{ data: profiles }, { data: users }] = await Promise.all([
    (supabase as any).from("profiles").select("user_id, full_name, phone, country"),
    (supabase as any).from("users").select("id, email, first_name, last_name"),
  ]);
  const profileByUserId = new Map<string, ProfileLite>(
    (profiles || []).map((p: ProfileLite) => [p.user_id, p]),
  );
  const userByUserId = new Map<string, UserLite>(
    (users || []).map((u: UserLite) => [u.id, u]),
  );
  return { profileByUserId, userByUserId };
}

/**
 * Prefer the checkout-time metadata snapshot when present (legacy/migrated
 * enrollments), otherwise fall back to the live profiles/users rows — the
 * snapshot is empty for every enrollment made through the current checkout
 * flow, so the live-row fallback is what actually resolves most students.
 */
export function getEnrollmentDisplayInfo(
  e: JoinedEnrollment,
  profileByUserId: Map<string, ProfileLite>,
  userByUserId: Map<string, UserLite>,
) {
  const metadata = e.order?.enrollment_metadata;
  const profile = e.user_id ? profileByUserId.get(e.user_id) : undefined;
  const user = e.user_id ? userByUserId.get(e.user_id) : undefined;
  return {
    full_name: metadata?.full_name || profile?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || undefined,
    email: metadata?.email || user?.email || undefined,
    phone: metadata?.phone || profile?.phone || undefined,
    country: metadata?.country || profile?.country || undefined,
  };
}
