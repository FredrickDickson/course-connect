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
  ASSOCIATE: 1,
  MEMBER: 2,
  FELLOW: 3,
};

const LEVEL_LABELS: Record<TrackLevel | EnrollmentLevel, string> = {
  NONE: "No level assigned",
  ASSOCIATE: "Associate (Part I)",
  MEMBER: "Member (Part II)",
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
    normalized === "ASSOCIATE" ||
    normalized === "MEMBER" ||
    normalized === "FELLOW"
  ) {
    return normalized as TrackLevel;
  }
  return "NONE";
}

/**
 * Get blocking message for UX
 */
function getBlockingMessage(userLevel: TrackLevel, courseLevel: EnrollmentLevel): string {
  if (courseLevel === "MEMBER") {
    return "You must complete Associate (Part I) first";
  }
  if (courseLevel === "FELLOW") {
    return "You must complete Member (Part II) first";
  }
  return "You are not eligible for this course yet";
}

/**
 * Get next step for blocked users
 */
function getNextStep(courseLevel: EnrollmentLevel): "ASSOCIATE" | "MEMBER" | null {
  if (courseLevel === "MEMBER") {
    return "ASSOCIATE";
  }
  if (courseLevel === "FELLOW") {
    return "MEMBER";
  }
  return null;
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

  const userIndex = LEVEL_ORDER[currentLevel];
  const courseIndex = LEVEL_ORDER[requiredLevel];

  // Rule 1: Anyone can take Associate (entry point)
  if (requiredLevel === "ASSOCIATE") {
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

  // Rule 2: Must have completed previous level (userIndex >= courseIndex - 1)
  if (userIndex < courseIndex - 1) {
    const blockingMessage = getBlockingMessage(currentLevel, requiredLevel);
    const nextStep = getNextStep(requiredLevel);

    return {
      status: "BLOCKED",
      reasonCode: "MISSING_PREREQ",
      ui: {
        title: `Complete ${nextStep} first`,
        message: `${blockingMessage}. Complete the ${levelLabel(nextStep!)} pathway to unlock this course.`,
        action: {
          label: nextStep === "ASSOCIATE" ? "Start with Associate" : "Continue to Member",
          actionType: "REDIRECT",
          actionTarget: "/qualification-pathway",
        },
      },
      progression: {
        ...progressionBase,
        requiredLevel: nextStep || undefined,
      },
      reason: blockingMessage,
      next_step: nextStep,
    };
  }

  // Pure progression model - no approval gates
  // If user has completed the previous level, they can enroll
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
