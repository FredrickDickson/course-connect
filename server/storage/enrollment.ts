/**
 * Enrollment Storage Module
 * Implements eligibility-driven enrollment flow as per course enrollment.md
 */

import { createClient } from "@supabase/supabase-js";
import type { User, Course, Enrollment } from "@shared/schema";
import type {
  EligibilityResponse,
  EnrollmentLevel,
  TrackLevel,
} from "@shared/enrollmentEligibility";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const LEVEL_ORDER: Record<TrackLevel | EnrollmentLevel, number> = {
  NONE: 0,
  STUDENT: 1,
  ASSOCIATE: 2,
  MEMBER: 3,
  FELLOW: 4,
};

const LEVEL_LABELS: Record<TrackLevel | EnrollmentLevel, string> = {
  NONE: "No level assigned",
  STUDENT: "Student",
  ASSOCIATE: "Associate",
  MEMBER: "Member",
  FELLOW: "Fellow",
};

const ACTIVE_ENROLLMENT_STATUSES = new Set([
  "ACTIVE",
  "PENDING_APPROVAL",
  "APPROVED",
]);

const DEFAULT_TRACK: Course["track"] = "ARBITRATION";

function normalizeTrackLevel(level?: string | null): TrackLevel {
  if (!level) return "NONE";
  const normalized = level.toUpperCase();
  if (
    normalized === "NONE" ||
    normalized === "STUDENT" ||
    normalized === "ASSOCIATE" ||
    normalized === "MEMBER" ||
    normalized === "FELLOW"
  ) {
    return normalized as TrackLevel;
  }
  return "NONE";
}

function normalizeEnrollmentLevel(level?: string | null): EnrollmentLevel {
  if (!level) return "ASSOCIATE";
  const normalized = level.toUpperCase();
  if (normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized as EnrollmentLevel;
  }
  return "ASSOCIATE";
}

function resolveTrack(track?: Course["track"] | null): Course["track"] {
  return track === "ARBITRATION" || track === "MEDIATION" ? track : DEFAULT_TRACK;
}

function levelLabel(level?: TrackLevel | EnrollmentLevel): string {
  if (!level) return "Unassigned";
  return LEVEL_LABELS[level] ?? level;
}

/**
 * Check if user is eligible to enroll in a course
 * Implements the eligibility logic from course enrollment.md
 */
export async function checkEligibility(
  user: User,
  course: Course,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
): Promise<EligibilityResponse> {
  const track = resolveTrack(course.track as Course["track"] | null);
  const currentLevel = normalizeTrackLevel(
    (user.assigned_level ?? user.current_level) as string | null,
  );
  const requiredLevel = normalizeEnrollmentLevel(
    (course.level as string | null) ?? enrollmentLevel,
  );
  const progressionBase: EligibilityResponse["progression"] = {
    track,
    currentLevel,
    targetLevel: requiredLevel,
  };

  const existingEnrollment = await getEnrollment(user.id, course.id);
  if (
    existingEnrollment &&
    ACTIVE_ENROLLMENT_STATUSES.has(
      (existingEnrollment.status ?? "ACTIVE").toUpperCase(),
    )
  ) {
    return {
      status: "BLOCKED",
      reasonCode: "ALREADY_ENROLLED",
      existingEnrollmentId: existingEnrollment.id,
      ui: {
        title: "You're already enrolled",
        message: "Head to your dashboard to continue learning.",
        action: {
          label: "Go to dashboard",
          actionType: "VIEW_ENROLLMENT",
          actionTarget: "/dashboard",
        },
      },
      progression: progressionBase,
    };
  }

  const currentOrder = LEVEL_ORDER[currentLevel];
  const requiredOrder = LEVEL_ORDER[requiredLevel];

  if (currentOrder < requiredOrder) {
    return {
      status: "BLOCKED",
      reasonCode: "MISSING_PREREQ",
      ui: {
        title: `Unlock ${levelLabel(requiredLevel)} access first`,
        message: `Your current standing is ${levelLabel(
          currentLevel,
        )}. Complete the ${levelLabel(requiredLevel)} pathway to enroll in ${
          course.title ?? "this course"
        }.`,
        action: {
          label: "View qualification pathway",
          actionType: "REDIRECT",
          actionTarget: "/qualification-pathway",
        },
      },
      progression: {
        ...progressionBase,
        requiredLevel,
      },
    };
  }

  const requiresApproval = Boolean(
    (course as any).requiresApproval ?? (course as any).requires_approval ?? false,
  );
  const needsManualApproval = requiresApproval || requiredLevel === "FELLOW";

  if (needsManualApproval) {
    return {
      status: "REQUIRES_APPROVAL",
      reasonCode: "NEEDS_APPROVAL",
      ui: {
        title: "Approval needed",
        message: `${levelLabel(requiredLevel)} courses require a short review. Submit your application and we'll notify you once approved.`,
        action: {
          label: "Submit application",
          actionType: "APPLY",
          actionTarget: `/enroll/${course.id}/status`,
        },
      },
      progression: progressionBase,
    };
  }

  return {
    status: "ELIGIBLE",
    reasonCode: "OK",
    ui: {
      title: "You're cleared to enroll",
      message: `Continue to checkout to confirm your seat for ${course.title ?? "this course"}.`,
      action: {
        label: "Continue to checkout",
        actionType: "ENROLL",
        actionTarget: `/checkout/${course.id}`,
      },
    },
    progression: progressionBase,
  };
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
