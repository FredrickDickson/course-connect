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

  // Get user's global role and experience.
  // Use SELECT * + safe fallbacks so missing optional columns (e.g. has_llm_degree,
  // bar_admission_number) never cause a 500 — they just default to falsy.
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow) {
    return null;
  }

  const user: any = userRow;

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
    .maybeSingle();

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
    hasLLM: user.has_llm_degree || false,
    hasExperience: (user.years_adr_experience || 0) >= 3,
    hasBarAdmission: !!user.bar_admission_number,
    hasPortfolio: !!user.professional_portfolio_url,
    llmSpecialization: user.llm_specialization,
    currentEmployer: user.current_employer,
    jobTitle: user.job_title,
    yearsAdrExperience: user.years_adr_experience || 0,
    yearsLegalExperience: user.years_legal_experience || 0,
    awardWritingSamples: [],
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

    // Expedited - available on both tracks for experienced professionals
    canUseExpedited: hasLegalExperience || hasExperience,

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
 * Enhanced eligibility check for expedited member route (MCIMArb)
 * Based on guide requirements: LL.M holders, ACIMArb members, or experienced legal professionals
 */
export async function canApplyExpeditedMember(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{ canApply: boolean; reason?: string; eligibilityType?: string }> {
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited routes are currently available only on the Arbitration track.",
    };
  }

  const state = await getUserQualificationState(userId);
  if (!state) {
    return { canApply: false, reason: "Could not determine eligibility" };
  }

  const trackProgress =
    track === "ARBITRATION" ? state.tracks.arbitration : state.tracks.mediation;
  const associatePostNominal = track === "ARBITRATION" ? "ACIMArb" : "ACIMed";

  // Check eligibility criteria based on guide requirements
  const eligibilityChecks = [
    {
      type: "LLM_HOLDER",
      eligible: state.hasLLM,
      reason: state.hasLLM ? undefined : "LL.M degree required for this pathway",
    },
    {
      type: "ASSOCIATE_MEMBER",
      eligible: trackProgress.level === "ASSOCIATE",
      reason: trackProgress.level === "ASSOCIATE" ? undefined : `${associatePostNominal} membership required for this pathway`,
    },
    {
      type: "EXPERIENCED_LEGAL",
      eligible: state.hasLegalExperience && state.hasBarAdmission,
      reason: state.hasLegalExperience && state.hasBarAdmission ? undefined : "3+ years legal experience and bar admission required",
    },
    {
      type: "EXPERIENCED_ADR",
      eligible: state.hasExperience && state.yearsAdrExperience >= 5,
      reason: state.hasExperience && state.yearsAdrExperience >= 5 ? undefined : "5+ years ADR experience required for this pathway",
    },
  ];

  // User is eligible if ANY of the criteria are met
  const eligibleCheck = eligibilityChecks.find(check => check.eligible);
  
  if (eligibleCheck) {
    return { 
      canApply: true, 
      eligibilityType: eligibleCheck.type 
    };
  }

  // If not eligible, provide comprehensive feedback
  const reasons = eligibilityChecks
    .filter(check => !check.eligible && check.reason)
    .map(check => check.reason)
    .filter(Boolean);

  return {
    canApply: false,
    reason: `You may be eligible if you: ${reasons.join(" or ")}. Alternatively, we recommend starting with Part I (Associate) training.`,
  };
}

/**
 * Enhanced eligibility check for expedited fellow route (FCIMArb)
 * Based on guide requirements: MCIMArb or equivalent + 7+ years ADR / 10+ legal experience
 */
export async function canApplyExpeditedFellow(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{ canApply: boolean; reason?: string; eligibilityType?: string }> {
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited routes are currently available only on the Arbitration track.",
    };
  }

  const state = await getUserQualificationState(userId);
  if (!state) {
    return { canApply: false, reason: "Could not determine eligibility" };
  }

  const trackProgress = track === "ARBITRATION" ? state.tracks.arbitration : state.tracks.mediation;
  
  // Must have Member level first
  if (trackProgress.level !== "MEMBER") {
    return {
      canApply: false,
      reason: "You must complete the Member level before applying for Fellowship",
    };
  }

  // Check experience requirements
  const hasRequiredADRExperience = state.hasExperience && (state.yearsAdrExperience >= 7);
  const hasRequiredLegalExperience = state.hasLegalExperience && (state.yearsLegalExperience >= 10);
  const hasPortfolio = state.hasPortfolio;
  const hasAwardWritingSamples = (state.awardWritingSamples?.length || 0) > 0;

  if (hasRequiredADRExperience || hasRequiredLegalExperience) {
    const missingRequirements = [];
    if (!hasPortfolio) missingRequirements.push("professional portfolio");
    if (!hasAwardWritingSamples) missingRequirements.push("award writing samples");

    if (missingRequirements.length > 0) {
      return {
        canApply: true,
        reason: `Recommended: Upload ${missingRequirements.join(" and ")} to strengthen your application`,
        eligibilityType: hasRequiredADRExperience ? "EXPERIENCED_ADR" : "EXPERIENCED_LEGAL",
      };
    }

    return {
      canApply: true,
      eligibilityType: hasRequiredADRExperience ? "EXPERIENCED_ADR" : "EXPERIENCED_LEGAL",
    };
  }

  return {
    canApply: false,
    reason: "FCIMArb requires 7+ years ADR experience OR 10+ years legal experience. Consider gaining more experience or completing the standard fellowship pathway.",
  };
}

/**
 * Check if user can apply for expedited pathway (legacy function for backward compatibility)
 */
export async function canApplyExpedited(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{ canApply: boolean; reason?: string }> {
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited routes are currently available only on the Arbitration track.",
    };
  }

  // Use the enhanced member eligibility check
  const result = await canApplyExpeditedMember(userId, track);
  return {
    canApply: result.canApply,
    reason: result.reason,
  };
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

  if (isArbitration) {
    const memberPostNominal = "MCIMArb";
    const fellowPostNominal = "FCIMArb";

    if (level === "NONE" || level === "ASSOCIATE") {
      const memberEligibility = await canApplyExpeditedMember(userId, track);
      if (memberEligibility.canApply) {
        pathways.push({
          type: "EXPEDITED",
          level: "MEMBER",
          name: `Expedited Member (${memberPostNominal})`,
          description: `14-day assessment for ${memberEligibility.eligibilityType?.toLowerCase()?.replace('_', ' ')} professionals`,
          action: "apply_expedited",
        });
      }
    }

    if (level === "MEMBER") {
      const fellowEligibility = await canApplyExpeditedFellow(userId, track);
      if (fellowEligibility.canApply) {
        pathways.push({
          type: "EXPEDITED",
          level: "FELLOW",
          name: `Expedited Fellow (${fellowPostNominal})`,
          description: "48-hour award writing assessment for senior professionals",
          action: "apply_expedited",
        });
      }
    }
  }

  return pathways;
}
