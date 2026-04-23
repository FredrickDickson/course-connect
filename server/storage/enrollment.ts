/**
 * Enrollment Storage Module
 * Implements eligibility-driven enrollment flow as per course enrollment.md
 */

import { createClient } from "@supabase/supabase-js";
import type { User, Course, Enrollment } from "@shared/schema";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Eligibility check result types
export type EligibilityStatus = "ELIGIBLE" | "REQUIRES_APPROVAL" | "BLOCKED";

export interface EligibilityResult {
  status: EligibilityStatus;
  reason?: string;
  nextCourseId?: string;
  nextCourseTitle?: string;
}

/**
 * Check if user is eligible to enroll in a course
 * Implements the eligibility logic from course enrollment.md
 */
export async function checkEligibility(
  user: User,
  course: Course,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW"
): Promise<EligibilityResult> {
  const track = course.track || "ARBITRATION";
  
  // Get user's current track progress
  const { data: trackProgress } = await supabaseAdmin
    .from("user_track_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", track)
    .maybeSingle();

  const currentLevel = trackProgress?.level || "NONE";

  // Check for existing active enrollment
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .in("status", ["ACTIVE", "PENDING_APPROVAL"])
    .maybeSingle();

  if (existingEnrollment) {
    return {
      status: "BLOCKED",
      reason: "You already have an active enrollment in this course",
    };
  }

  // Track-specific eligibility logic
  if (track === "ARBITRATION") {
    return checkArbitrationEligibility(currentLevel, enrollmentLevel, course, user);
  } else {
    return checkMediationEligibility(currentLevel, enrollmentLevel, course, user);
  }
}

/**
 * Arbitration track eligibility rules
 */
function checkArbitrationEligibility(
  currentLevel: string,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
  course: Course,
  user: User
): EligibilityResult {
  // Part I (Associate) - Always eligible
  if (enrollmentLevel === "ASSOCIATE") {
    return { status: "ELIGIBLE" };
  }

  // Part II (Member) - Requires Associate level
  if (enrollmentLevel === "MEMBER") {
    if (currentLevel === "ASSOCIATE" || currentLevel === "MEMBER" || currentLevel === "FELLOW") {
      return { status: "ELIGIBLE" };
    }
    return {
      status: "BLOCKED",
      reason: "You must complete the Associate level first",
      nextCourseId: course.id, // Would be the associate course ID in production
      nextCourseTitle: "Associate Course",
    };
  }

  // Part III (Fellow) - Requires Member level + experience verification
  if (enrollmentLevel === "FELLOW") {
    if (currentLevel !== "MEMBER" && currentLevel !== "FELLOW") {
      return {
        status: "BLOCKED",
        reason: "You must complete the Member level first",
        nextCourseId: course.id, // Would be the member course ID in production
        nextCourseTitle: "Member Course",
      };
    }
    // Fellow always requires approval for experience verification
    return {
      status: "REQUIRES_APPROVAL",
      reason: "Fellowship requires experience verification",
    };
  }

  return { status: "BLOCKED", reason: "Invalid enrollment level" };
}

/**
 * Mediation track eligibility rules
 */
function checkMediationEligibility(
  currentLevel: string,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
  course: Course,
  user: User
): EligibilityResult {
  // ACIMed (Associate) - Always eligible
  if (enrollmentLevel === "ASSOCIATE") {
    return { status: "ELIGIBLE" };
  }

  // MCIMed (Member) - Dual entry: Associate level OR relevant experience
  if (enrollmentLevel === "MEMBER") {
    const hasExperience = (user.years_adr_experience || 0) >= 3 || (user.years_legal_experience || 0) >= 3;
    
    if (currentLevel === "ASSOCIATE" || currentLevel === "MEMBER" || currentLevel === "FELLOW" || hasExperience) {
      return { status: "ELIGIBLE" };
    }
    
    return {
      status: "BLOCKED",
      reason: "You need either Associate level or 3+ years of ADR/legal experience",
      nextCourseId: course.id, // Would be the associate course ID in production
      nextCourseTitle: "Associate Course",
    };
  }

  // FCIMed (Fellow) - Requires Member level + experience verification
  if (enrollmentLevel === "FELLOW") {
    if (currentLevel !== "MEMBER" && currentLevel !== "FELLOW") {
      return {
        status: "BLOCKED",
        reason: "You must complete the Member level first",
        nextCourseId: course.id, // Would be the member course ID in production
        nextCourseTitle: "Member Course",
      };
    }
    // Fellow always requires approval for experience verification
    return {
      status: "REQUIRES_APPROVAL",
      reason: "Fellowship requires experience verification",
    };
  }

  return { status: "BLOCKED", reason: "Invalid enrollment level" };
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
    .single();

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
    .single();

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
    .single();

  if (error) throw error;
  return data;
}
