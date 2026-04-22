/**
 * Eligibility Engine for Multi-Track Qualification System
 * Implements the logic from full logic.md for determining user eligibility
 * across Arbitration and Mediation tracks
 */

import { createClient } from "@supabase/supabase-js";
import {
  TrackProgress,
  EligibilityState,
  TrackEligibility,
  UserQualificationState,
} from "../../shared/schema";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Get user's complete qualification state across all tracks
 */
export async function getUserQualificationState(
  userId: string
): Promise<UserQualificationState | null> {
  // Get track progress for both tracks
  const { data: trackProgress, error } = await supabaseAdmin
    .from("user_track_progress")
    .select("*")
    .eq("user_id", userId);

  if (error || !trackProgress) {
    return null;
  }

  // Get user's global role and experience
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("years_adr_experience, years_legal_experience, role")
    .eq("id", userId)
    .single();

  if (!user) {
    return null;
  }

  // Build track progress object
  const tracks: {
    arbitration: Partial<TrackProgress> & { track: "ARBITRATION" };
    mediation: Partial<TrackProgress> & { track: "MEDIATION" };
  } = {
    arbitration: {
      track: "ARBITRATION",
      level: "NONE",
      pathway: null,
    },
    mediation: {
      track: "MEDIATION",
      level: "NONE",
      pathway: null,
    },
  };

  // Populate track progress from database
  trackProgress.forEach((progress) => {
    if (progress.track === "ARBITRATION") {
      tracks.arbitration = {
        track: "ARBITRATION",
        level: progress.level,
        pathway: progress.pathway,
        id: progress.id,
        userId: progress.user_id,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      };
    } else if (progress.track === "MEDIATION") {
      tracks.mediation = {
        track: "MEDIATION",
        level: progress.level,
        pathway: progress.pathway,
        id: progress.id,
        userId: progress.user_id,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      };
    }
  });

  // Determine global role (STUDENT if they have verified student membership)
  const { data: studentMembership } = await supabaseAdmin
    .from("student_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "verified")
    .single();

  const globalRole =
    studentMembership &&
    (!studentMembership.expires_at ||
      new Date(studentMembership.expires_at) > new Date())
    ? "STUDENT"
    : "PROFESSIONAL";

  // Get completed courses
  const { data: completions } = await supabaseAdmin
    .from("course_completion_records")
    .select("course_id")
    .eq("user_id", userId)
    .eq("assessment_passed", true);

  const completedCourses = completions?.map((c) => c.course_id) || [];

  return {
    tracks,
    globalRole,
    completedCourses,
    hasLegalExperience: (user.years_legal_experience || 0) >= 3,
    hasLLM: false, // TODO: Add LLM field to users table if needed
    hasExperience: (user.years_adr_experience || 0) >= 3,
  } as UserQualificationState;
}

/**
 * Calculate eligibility for a single track based on progression and experience
 */
function calculateTrackEligibility(
  trackProgress: TrackProgress,
  hasLegalExperience: boolean,
  hasExperience: boolean,
  isArbitration: boolean
): TrackEligibility {
  const level = trackProgress.level;

  return {
    // Part I (Associate) - always available
    canTakePart1: level === "NONE" || level === "STUDENT",

    // Part II (Member) - requires Associate level
    canTakePart2: level === "ASSOCIATE",

    // Fellowship - requires Member level
    canApplyFellow: level === "MEMBER",

    // Expedited - only for Arbitration track, requires experience
    canUseExpedited: isArbitration && (hasLegalExperience || hasExperience),

    // Associate course (for Mediation track terminology)
    canTakeAssociate: level === "NONE" || level === "STUDENT",

    // Member course (for Mediation track terminology)
    canTakeMember:
      level === "ASSOCIATE" || (level === "NONE" && hasExperience),
  };
}

/**
 * Get complete eligibility state for a user across all tracks
 */
export async function getEligibilityState(
  userId: string
): Promise<EligibilityState | null> {
  const state = await getUserQualificationState(userId);

  if (!state) {
    return null;
  }

  // Get user experience data
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("years_adr_experience, years_legal_experience")
    .eq("id", userId)
    .single();

  const hasLegalExperience = (user?.years_legal_experience || 0) >= 3;
  const hasExperience = (user?.years_adr_experience || 0) >= 3;

  // Calculate eligibility for each track
  const arbitration = calculateTrackEligibility(
    state.tracks.arbitration as TrackProgress,
    hasLegalExperience,
    hasExperience,
    true
  );

  const mediation = calculateTrackEligibility(
    state.tracks.mediation as TrackProgress,
    hasLegalExperience,
    hasExperience,
    false
  );

  return {
    arbitration,
    mediation,
  };
}

/**
 * Check if user can take a specific course
 */
export async function canTakeCourse(
  userId: string,
  courseId: string
): Promise<{ canTake: boolean; reason?: string }> {
  // Get course metadata to determine track and level
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("track, level")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { canTake: false, reason: "Course not found" };
  }

  const eligibility = await getEligibilityState(userId);

  if (!eligibility) {
    return { canTake: false, reason: "Could not determine eligibility" };
  }

  const trackEligibility =
    course.track === "ARBITRATION" ? eligibility.arbitration : eligibility.mediation;

  // Check based on course level
  if (course.level === "ASSOCIATE" || course.level === "associate") {
    if (!trackEligibility.canTakeAssociate && !trackEligibility.canTakePart1) {
      return {
        canTake: false,
        reason: "You must complete prerequisites before taking this course",
      };
    }
  } else if (course.level === "MEMBER" || course.level === "member") {
    if (!trackEligibility.canTakeMember && !trackEligibility.canTakePart2) {
      return {
        canTake: false,
        reason: "You must complete the Associate level before taking this course",
      };
    }
  } else if (course.level === "FELLOW" || course.level === "fellow") {
    if (!trackEligibility.canApplyFellow) {
      return {
        canTake: false,
        reason: "You must complete the Member level before applying for Fellowship",
      };
    }
  }

  return { canTake: true };
}

/**
 * Check if user can apply for expedited pathway
 */
export async function canApplyExpedited(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{ canApply: boolean; reason?: string }> {
  // Mediation track does not support expedited
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited pathway is only available for Arbitration track",
    };
  }

  const eligibility = await getEligibilityState(userId);

  if (!eligibility) {
    return { canApply: false, reason: "Could not determine eligibility" };
  }

  if (!eligibility.arbitration.canUseExpedited) {
    return {
      canApply: false,
      reason: "You need at least 3 years of legal or ADR experience to apply for expedited pathway",
    };
  }

  return { canApply: true };
}

/**
 * Check if user can apply for fellowship
 */
export async function canApplyFellowship(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{ canApply: boolean; reason?: string }> {
  const eligibility = await getEligibilityState(userId);

  if (!eligibility) {
    return { canApply: false, reason: "Could not determine eligibility" };
  }

  const trackEligibility =
    track === "ARBITRATION" ? eligibility.arbitration : eligibility.mediation;

  if (!trackEligibility.canApplyFellow) {
    return {
      canApply: false,
      reason: "You must complete the Member level before applying for Fellowship",
    };
  }

  return { canApply: true };
}

/**
 * Get available pathways for a user on a specific track
 */
export async function getAvailablePathwaysForTrack(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<
  Array<{
    type: "STANDARD" | "EXPEDITED";
    level: "ASSOCIATE" | "MEMBER" | "FELLOW";
    name: string;
    description: string;
    action: "enroll" | "apply" | "apply_expedited";
  }>
> {
  const state = await getUserQualificationState(userId);

  if (!state) {
    return [];
  }

  const trackProgress =
    track === "ARBITRATION" ? state.tracks.arbitration : state.tracks.mediation;
  const pathways: Array<{
    type: "STANDARD" | "EXPEDITED";
    level: "ASSOCIATE" | "MEMBER" | "FELLOW";
    name: string;
    description: string;
    action: "enroll" | "apply" | "apply_expedited";
  }> = [];

  const level = trackProgress.level;
  const isArbitration = track === "ARBITRATION";

  // Standard pathway options
  if (level === "NONE" || level === "STUDENT") {
    pathways.push({
      type: "STANDARD",
      level: "ASSOCIATE",
      name: isArbitration ? "Associate (ACIMArb)" : "Associate (ACIMed)",
      description: isArbitration
        ? "Foundation course in arbitration"
        : "Foundation course in mediation",
      action: "enroll",
    });
  }

  if (level === "ASSOCIATE") {
    pathways.push({
      type: "STANDARD",
      level: "MEMBER",
      name: isArbitration ? "Member (MCIMArb)" : "Member (MCIMed)",
      description: isArbitration
        ? "Advanced course in arbitration procedures"
        : "Advanced course in mediation techniques",
      action: "enroll",
    });
  }

  if (level === "MEMBER") {
    pathways.push({
      type: "STANDARD",
      level: "FELLOW",
      name: isArbitration ? "Fellow (FCIMArb)" : "Fellow (FCIMed)",
      description: isArbitration
        ? "Mastery level with dissertation"
        : "Mastery level with portfolio evaluation",
      action: "apply",
    });
  }

  // Expedited pathway options (Arbitration only)
  if (isArbitration && (level === "NONE" || level === "ASSOCIATE")) {
    const canExpedite = await canApplyExpedited(userId, "ARBITRATION");
    if (canExpedite.canApply) {
      pathways.push({
        type: "EXPEDITED",
        level: "MEMBER",
        name: "Expedited Member (MCIMArb)",
        description: "14-day assessment for experienced professionals",
        action: "apply_expedited",
      });
    }
  }

  if (isArbitration && level === "MEMBER") {
    // Check for fellowship expedited eligibility (requires more experience)
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("years_adr_experience, years_legal_experience")
      .eq("id", userId)
      .single();

    const yearsAdr = user?.years_adr_experience || 0;
    const yearsLegal = user?.years_legal_experience || 0;

    if (yearsAdr >= 7 || yearsLegal >= 10) {
      pathways.push({
        type: "EXPEDITED",
        level: "FELLOW",
        name: "Expedited Fellow (FCIMArb)",
        description: "48-hour assessment for senior professionals",
        action: "apply_expedited",
      });
    }
  }

  return pathways;
}
