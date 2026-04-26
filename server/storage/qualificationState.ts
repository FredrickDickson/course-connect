import { createClient } from "@supabase/supabase-js";
import type {
  EligibilityState,
  TrackEligibility,
  TrackProgress,
  UserQualificationState,
  ProfessionalProfile,
} from "@shared/schema";
import type { TrackLevel, EnrollmentLevel } from "@shared/enrollmentEligibility";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TRACKS = ["ARBITRATION", "MEDIATION"] as const;
type TrackType = (typeof TRACKS)[number];
type ReviewStatus = ProfessionalProfile["reviewStatus"];
type TrackSnapshot<T extends TrackType = TrackType> = Partial<TrackProgress> & {
  track: T;
};

type PathwayOption = {
  type: "STANDARD" | "EXPEDITED";
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  name: string;
  description: string;
  action: "enroll" | "apply" | "apply_expedited";
};

interface TrackProfileSummary {
  id: string;
  track: TrackType;
  reviewStatus: ReviewStatus;
  assignedLevel?: TrackLevel | null;
  updatedAt?: string | null;
}

function normalizeCourseLevel(value?: string | null): EnrollmentLevel | null {
  if (!value) return null;
  const normalized = value.toString().toUpperCase();
  if (normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized as EnrollmentLevel;
  }
  return null;
}

export async function canTakeCourse(
  userId: string,
  courseId: string,
): Promise<{ canTake: boolean; reason?: string }> {
  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .select("id, track, level")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) {
    return { canTake: false, reason: "Course not found" };
  }

  const context = await buildQualificationContext(userId);
  if (!context) {
    return { canTake: false, reason: "Could not determine eligibility" };
  }

  const trackType: TrackType = course.track === "MEDIATION" ? "MEDIATION" : "ARBITRATION";
  const trackKey = trackType === "ARBITRATION" ? "arbitration" : "mediation";
  const trackEligibility = deriveTrackEligibility(
    context.state.tracks[trackKey],
    context.profiles[trackType],
  );

  const level = normalizeCourseLevel(course.level);
  if (!level) {
    return { canTake: true };
  }

  if (level === "ASSOCIATE") {
    if (trackEligibility.canTakeAssociate || trackEligibility.canTakePart1) {
      return { canTake: true };
    }
    return {
      canTake: false,
      reason: "You must complete prerequisites before taking this course",
    };
  }

  if (level === "MEMBER") {
    if (trackEligibility.canTakeMember || trackEligibility.canTakePart2) {
      return { canTake: true };
    }
    return {
      canTake: false,
      reason: "You must complete the Associate level before taking this course",
    };
  }

  if (level === "FELLOW") {
    if (trackEligibility.canApplyFellow) {
      return { canTake: true };
    }
    return {
      canTake: false,
      reason: "You must complete the Member level before applying for Fellowship",
    };
  }

  return { canTake: true };
}

interface QualificationContext {
  state: UserQualificationState & {
    tracks: {
      arbitration: TrackSnapshot<"ARBITRATION">;
      mediation: TrackSnapshot<"MEDIATION">;
    };
  };
  profiles: Record<TrackType, TrackProfileSummary | null>;
}

const LEVEL_ORDER: Record<TrackLevel, number> = {
  NONE: 0,
  STUDENT: 1,
  ASSOCIATE: 2,
  MEMBER: 3,
  FELLOW: 4,
};

export function normalizeTrackLevel(level?: string | null): TrackLevel {
  if (!level) return "NONE";
  const normalized = level.toUpperCase();
  if (normalized === "STUDENT" || normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized as TrackLevel;
  }
  return "NONE";
}

export async function getUserQualificationState(userId: string): Promise<UserQualificationState | null> {
  const context = await buildQualificationContext(userId);
  return context?.state ?? null;
}

export async function getEligibilityState(userId: string): Promise<EligibilityState | null> {
  const context = await buildQualificationContext(userId);
  if (!context) return null;

  return {
    arbitration: deriveTrackEligibility(
      context.state.tracks.arbitration,
      context.profiles["ARBITRATION"],
    ),
    mediation: deriveTrackEligibility(
      context.state.tracks.mediation,
      context.profiles["MEDIATION"],
    ),
  } satisfies EligibilityState;
}

export async function getAvailablePathwaysForTrack(
  userId: string,
  track: TrackType,
): Promise<PathwayOption[]> {
  const context = await buildQualificationContext(userId);
  if (!context) return [];

  const key = track === "ARBITRATION" ? "arbitration" : "mediation";
  const snapshot = context.state.tracks[key];
  const profile = context.profiles[track];
  const level = normalizeTrackLevel(snapshot.level);
  const pathways: PathwayOption[] = [];

  if (LEVEL_ORDER[level] <= LEVEL_ORDER.STUDENT) {
    pathways.push({
      type: "STANDARD",
      level: "ASSOCIATE",
      name: track === "ARBITRATION" ? "Associate (ACIMArb)" : "Associate (ACIMed)",
      description:
        track === "ARBITRATION"
          ? "Foundation course covering arbitration law, practice, and procedure."
          : "Foundation course in mediation skills, law, and simulations.",
      action: "enroll",
    });
  }

  if (LEVEL_ORDER[level] === LEVEL_ORDER.ASSOCIATE) {
    pathways.push({
      type: "STANDARD",
      level: "MEMBER",
      name: track === "ARBITRATION" ? "Member (MCIMArb)" : "Member (MCIMed)",
      description:
        track === "ARBITRATION"
          ? "Advanced arbitration practice with case management workshops."
          : "Advanced mediation techniques with supervised simulations.",
      action: "enroll",
    });
  }

  if (LEVEL_ORDER[level] === LEVEL_ORDER.MEMBER) {
    pathways.push({
      type: "STANDARD",
      level: "FELLOW",
      name: track === "ARBITRATION" ? "Fellow (FCIMArb)" : "Fellow (FCIMed)",
      description:
        track === "ARBITRATION"
          ? "Mastery level culminating in dissertation and award-writing."
          : "Fellowship pathway with dissertation and supervised practice.",
      action: "apply",
    });
  }

  if (track === "ARBITRATION" && hasExpeditedAccess(snapshot, profile)) {
    const expeditedReason = describeExpeditedAccess(snapshot, profile);
    if (LEVEL_ORDER[level] < LEVEL_ORDER.MEMBER) {
      pathways.push({
        type: "EXPEDITED",
        level: "MEMBER",
        name: "Expedited Member (MCIMArb)",
        description: expeditedReason,
        action: "apply_expedited",
      });
    }
    if (LEVEL_ORDER[level] >= LEVEL_ORDER.MEMBER && LEVEL_ORDER[level] < LEVEL_ORDER.FELLOW) {
      pathways.push({
        type: "EXPEDITED",
        level: "FELLOW",
        name: "Expedited Fellow (FCIMArb)",
        description: expeditedReason,
        action: "apply_expedited",
      });
    }
  }

  return pathways;
}

export async function canApplyExpeditedMember(
  userId: string,
  track: TrackType,
): Promise<{ canApply: boolean; reason?: string; eligibilityType?: string }> {
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited routes are only available on the Arbitration track.",
    };
  }

  const trackContext = await getTrackContext(userId, track);
  if (!trackContext) {
    return { canApply: false, reason: "Unable to load qualification state" };
  }

  const level = normalizeTrackLevel(trackContext.snapshot.level);
  if (LEVEL_ORDER[level] >= LEVEL_ORDER.MEMBER) {
    return {
      canApply: false,
      reason: "You already hold Member standing.",
    };
  }

  return evaluateProfileEligibility(trackContext.profile, "MEMBER");
}

export async function canApplyExpeditedFellow(
  userId: string,
  track: TrackType,
): Promise<{ canApply: boolean; reason?: string; eligibilityType?: string }> {
  if (track === "MEDIATION") {
    return {
      canApply: false,
      reason: "Expedited routes are only available on the Arbitration track.",
    };
  }

  const trackContext = await getTrackContext(userId, track);
  if (!trackContext) {
    return { canApply: false, reason: "Unable to load qualification state" };
  }

  const level = normalizeTrackLevel(trackContext.snapshot.level);
  if (LEVEL_ORDER[level] < LEVEL_ORDER.MEMBER) {
    return {
      canApply: false,
      reason: "You must complete the Member level before applying for Fellowship.",
    };
  }

  if (LEVEL_ORDER[level] >= LEVEL_ORDER.FELLOW) {
    return { canApply: false, reason: "You already hold Fellowship standing." };
  }

  return evaluateProfileEligibility(trackContext.profile, "FELLOW");
}

export async function canApplyFellowship(
  userId: string,
  track: TrackType,
): Promise<{ canApply: boolean; reason?: string }> {
  const trackContext = await getTrackContext(userId, track);
  if (!trackContext) {
    return { canApply: false, reason: "Unable to load qualification state" };
  }

  const level = normalizeTrackLevel(trackContext.snapshot.level);
  if (LEVEL_ORDER[level] < LEVEL_ORDER.MEMBER) {
    return {
      canApply: false,
      reason: "Complete the Member pathway before applying for Fellowship.",
    };
  }

  return { canApply: true };
}

export function deriveTrackEligibility(
  snapshot: TrackSnapshot,
  profile?: TrackProfileSummary | null,
): TrackEligibility {
  const level = normalizeTrackLevel(snapshot.level);
  const waivedLevels = new Set((snapshot.waivedLevels ?? []).map((lvl) => lvl.toUpperCase()));
  const hasAssociateStanding = LEVEL_ORDER[level] >= LEVEL_ORDER.ASSOCIATE || waivedLevels.has("ASSOCIATE");
  const hasMemberStanding = LEVEL_ORDER[level] >= LEVEL_ORDER.MEMBER || waivedLevels.has("MEMBER");

  return {
    canTakePart1: LEVEL_ORDER[level] <= LEVEL_ORDER.STUDENT,
    canTakePart2: hasAssociateStanding,
    canApplyFellow: hasMemberStanding,
    canUseExpedited: snapshot.track === "ARBITRATION" && hasExpeditedAccess(snapshot, profile),
    canTakeAssociate: LEVEL_ORDER[level] <= LEVEL_ORDER.STUDENT,
    canTakeMember: hasAssociateStanding,
  } satisfies TrackEligibility;
}

async function buildQualificationContext(userId: string): Promise<QualificationContext | null> {
  const [userResult, trackResult, studentMembership, completions, profilesResult] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, years_adr_experience, years_legal_experience")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_track_progress")
      .select("id, user_id, track, level, pathway, waived_levels, waiver_metadata, waiver_last_granted_at, created_at, updated_at")
      .eq("user_id", userId),
    supabaseAdmin
      .from("student_memberships")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("status", "verified")
      .maybeSingle(),
    supabaseAdmin
      .from("course_completion_records")
      .select("course_id")
      .eq("user_id", userId)
      .eq("assessment_passed", true),
    supabaseAdmin
      .from("professional_profiles")
      .select("id, track, review_status, assigned_level, updated_at, submitted_at, decision_at")
      .eq("user_id", userId)
      .eq("is_current", true),
  ]);

  if (userResult.error || !userResult.data) {
    console.error("Failed to load user for qualification state", userResult.error);
    return null;
  }

  const trackRows = trackResult.data ?? [];
  const trackMap: Record<TrackType, any | undefined> = {
    ARBITRATION: trackRows.find((row) => row.track === "ARBITRATION"),
    MEDIATION: trackRows.find((row) => row.track === "MEDIATION"),
  };

  const tracks: {
    arbitration: TrackSnapshot<"ARBITRATION">;
    mediation: TrackSnapshot<"MEDIATION">;
  } = {
    arbitration: buildTrackSnapshot("ARBITRATION", trackMap.ARBITRATION),
    mediation: buildTrackSnapshot("MEDIATION", trackMap.MEDIATION),
  };

  const yearsAdrExperience = userResult.data.years_adr_experience ?? 0;
  const yearsLegalExperience = userResult.data.years_legal_experience ?? 0;

  const state: UserQualificationState = {
    tracks,
    globalRole: determineGlobalRole(studentMembership.data),
    completedCourses: (completions.data ?? []).map((row) => row.course_id),
    hasLegalExperience: yearsLegalExperience >= 3,
    hasLLM: false,
    hasExperience: yearsAdrExperience >= 3,
    hasBarAdmission: false,
    hasPortfolio: false,
    llmSpecialization: null,
    currentEmployer: null,
    jobTitle: null,
    yearsAdrExperience,
    yearsLegalExperience,
    awardWritingSamples: [],
  };

  return {
    state,
    profiles: buildProfileMap(profilesResult.data ?? []),
  };
}

async function getTrackContext(userId: string, track: TrackType) {
  const context = await buildQualificationContext(userId);
  if (!context) {
    return null;
  }

  return {
    snapshot: track === "ARBITRATION" ? context.state.tracks.arbitration : context.state.tracks.mediation,
    profile: context.profiles[track],
  };
}

function buildTrackSnapshot<T extends TrackType>(track: T, row?: any): TrackSnapshot<T> {
  return {
    track,
    id: row?.id,
    userId: row?.user_id,
    level: normalizeTrackLevel(row?.level),
    pathway: row?.pathway ?? null,
    waivedLevels: row?.waived_levels ?? [],
    waiverMetadata: row?.waiver_metadata ?? {},
    waiverLastGrantedAt: row?.waiver_last_granted_at ?? null,
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

function determineGlobalRole(membership?: { expires_at: string | null } | null): "STUDENT" | "PROFESSIONAL" {
  if (!membership) return "PROFESSIONAL";
  if (!membership.expires_at) return "STUDENT";
  return new Date(membership.expires_at) > new Date() ? "STUDENT" : "PROFESSIONAL";
}

function buildProfileMap(rows: any[]): Record<TrackType, TrackProfileSummary | null> {
  const map: Record<TrackType, TrackProfileSummary | null> = {
    ARBITRATION: null,
    MEDIATION: null,
  };

  rows.forEach((row) => {
    const track: TrackType = row.track === "MEDIATION" ? "MEDIATION" : "ARBITRATION";
    const candidate: TrackProfileSummary = {
      id: row.id,
      track,
      reviewStatus: row.review_status,
      assignedLevel: row.assigned_level ?? null,
      updatedAt: row.updated_at ?? row.decision_at ?? row.submitted_at ?? null,
    };

    const current = map[track];
    if (!current) {
      map[track] = candidate;
      return;
    }

    const currentDate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const candidateDate = candidate.updatedAt ? new Date(candidate.updatedAt).getTime() : 0;
    if (candidateDate >= currentDate) {
      map[track] = candidate;
    }
  });

  return map;
}

function hasExpeditedAccess(snapshot: TrackSnapshot, profile?: TrackProfileSummary | null): boolean {
  if (snapshot.track !== "ARBITRATION") return false;
  if ((snapshot.waivedLevels?.length ?? 0) > 0) return true;
  return profile?.reviewStatus === "APPROVED";
}

function describeExpeditedAccess(snapshot: TrackSnapshot, profile?: TrackProfileSummary | null): string {
  if (profile?.reviewStatus === "APPROVED") {
    return "Approved professional profile unlocks expedited review.";
  }
  if ((snapshot.waivedLevels?.length ?? 0) > 0) {
    return "Admin-granted level waiver unlocks expedited review.";
  }
  return "Expedited review available.";
}

function evaluateProfileEligibility(
  profile: TrackProfileSummary | null,
  targetLevel: "MEMBER" | "FELLOW",
): { canApply: boolean; reason?: string; eligibilityType?: string } {
  if (!profile) {
    return {
      canApply: false,
      reason: "Create a professional profile to access the expedited review.",
    };
  }

  switch (profile.reviewStatus) {
    case "DRAFT":
      return {
        canApply: true,
        eligibilityType: "PROFILE_DRAFT",
        reason: "Complete and submit your professional profile to start expedited review.",
      };
    case "MORE_INFO_REQUIRED":
      return {
        canApply: true,
        eligibilityType: "PROFILE_UPDATES_REQUIRED",
        reason: "Provide the requested updates to continue your expedited application.",
      };
    case "UNDER_REVIEW":
      return {
        canApply: false,
        reason: "Your professional profile is currently under review.",
      };
    case "REJECTED":
      return {
        canApply: false,
        reason: "Your previous professional profile was rejected. Update it before reapplying.",
      };
    case "APPROVED":
      return {
        canApply: true,
        eligibilityType: targetLevel === "FELLOW" ? "PROFILE_APPROVED_FELLOW" : "PROFILE_APPROVED_MEMBER",
      };
    default:
      return { canApply: false, reason: "Unknown professional profile status." };
  }
}
