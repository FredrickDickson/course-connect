/**
 * Enrollment Storage Module
 * Implements eligibility-driven enrollment flow as per course enrollment.md
 */

import { createClient } from "@supabase/supabase-js";
import type { User, Course, Enrollment } from "@shared/schema";
import type { EligibilityResponse } from "@shared/eligibility-engine";
import { evaluateEligibilityWithContext } from "./eligibility-evaluation";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Check if user is eligible to enroll in a course
 * Implements the eligibility logic from course enrollment.md
 */
export async function checkEligibility(
  user: User,
  course: Course,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
): Promise<EligibilityResponse> {
  return evaluateEligibilityWithContext({
    supabaseClient: supabaseAdmin,
    user,
    course,
    enrollmentLevel,
  });
}

/**
 * Create a course enrollment
 */
export async function createEnrollment(
  userId: string,
  courseId: string,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
  enrollmentType: "COURSE" | "APPLICATION" | "ASSESSMENT" = "COURSE"
): Promise<Enrollment> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      enrollment_type: enrollmentType,
      enrollment_level: enrollmentLevel,
      status: enrollmentType === "APPLICATION" ? "PENDING_APPROVAL" : "ACTIVE",
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a fellowship application
 */
export async function createFellowshipApplication(
  userId: string,
  track: "ARBITRATION" | "MEDIATION",
  cvUrl?: string,
  experienceSummary?: string
): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("fellowship_applications")
    .insert({
      user_id: userId,
      track,
      cv_url: cvUrl,
      experience_summary: experienceSummary,
      status: "pending",
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get enrollment by user and course
 */
export async function getEnrollment(
  userId: string,
  courseId: string
): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update enrollment status
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ACTIVE" | "COMPLETED" | "FAILED"
): Promise<Enrollment> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .update({ status })
    .eq("id", enrollmentId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
