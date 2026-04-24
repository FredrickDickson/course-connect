import type { Course } from "@shared/schema";

export type TrackLevel = "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
export type EnrollmentLevel = "ASSOCIATE" | "MEMBER" | "FELLOW";
export type TrackType = Course["track"];

const LEVEL_ORDER: Record<TrackLevel, number> = {
  NONE: 0,
  STUDENT: 1,
  ASSOCIATE: 2,
  MEMBER: 3,
  FELLOW: 4,
};

const LEVEL_DISPLAY: Record<EnrollmentLevel, string> = {
  ASSOCIATE: "Associate Level",
  MEMBER: "Member Level",
  FELLOW: "Fellowship",
};

export type EligibilityStatus = "ELIGIBLE" | "REQUIRES_APPROVAL" | "BLOCKED";

export type EligibilityReasonCode =
  | "OK"
  | "MISSING_PREREQ"
  | "ALREADY_ENROLLED"
  | "OVERQUALIFIED"
  | "NEEDS_APPROVAL"
  | "INVALID_LEVEL";

export type EligibilityActionType =
  | "ENROLL"
  | "APPLY"
  | "REDIRECT"
  | "VIEW_ENROLLMENT";

export interface EligibilityAction {
  label: string;
  actionType: EligibilityActionType;
  actionTarget?: string;
  description?: string;
}

export interface EligibilityUI {
  title: string;
  message: string;
  action?: EligibilityAction;
  secondaryAction?: EligibilityAction;
}

export interface EligibilityProgression {
  track: TrackType;
  currentLevel: TrackLevel;
  targetLevel: EnrollmentLevel;
  requiredLevel?: EnrollmentLevel;
  nextCourse?: RecommendedCourse;
  expeditedAvailable?: boolean;
  expeditedType?: string;
}

export interface EligibilityResponse {
  status: EligibilityStatus;
  reasonCode: EligibilityReasonCode;
  ui: EligibilityUI;
  progression: EligibilityProgression;
  existingEnrollmentId?: string;
}

export interface RecommendedCourse {
  id: string;
  title: string;
  level: EnrollmentLevel;
}

export interface ExistingEnrollmentSummary {
  id: string;
  status: string;
  type?: string | null;
}

export interface ExpeditedEligibility {
  canApply: boolean;
  eligibilityType?: string;
}

export interface EligibilityUserSnapshot {
  years_adr_experience?: number | null;
  years_legal_experience?: number | null;
  has_llm_degree?: boolean | null;
  bar_admission_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
}

export interface EligibilityEvaluationInput {
  user: EligibilityUserSnapshot;
  course: Pick<Course, "id" | "title" | "track" | "level">;
  enrollmentLevel: string;
  currentLevel?: TrackLevel | null;
  existingEnrollment?: ExistingEnrollmentSummary | null;
  trackCourses?: Partial<Record<EnrollmentLevel, RecommendedCourse>>;
  expedited?: {
    member?: ExpeditedEligibility;
    fellow?: ExpeditedEligibility;
  };
}

export function evaluateEligibility(input: EligibilityEvaluationInput): EligibilityResponse {
  const targetLevel = normalizeEnrollmentLevel(input.enrollmentLevel);
  const currentLevel = input.currentLevel ?? "NONE";
  const trackCourses = input.trackCourses ?? {};
  const memberExpedited = input.expedited?.member;
  const fellowExpedited = input.expedited?.fellow;

  if (!targetLevel) {
    return buildInvalidLevelResponse(input.course, currentLevel);
  }

  if (input.existingEnrollment) {
    return buildExistingEnrollmentResponse(input.course, targetLevel, currentLevel, input.existingEnrollment);
  }

  const currentOrder = LEVEL_ORDER[currentLevel];
  const targetOrder = LEVEL_ORDER[targetLevel];

  if (currentOrder > targetOrder) {
    return buildOverqualifiedResponse(input.course, targetLevel, currentLevel, trackCourses);
  }

  if (targetLevel === "ASSOCIATE") {
    return buildEligibleResponse(input.course, targetLevel, currentLevel);
  }

  if (targetLevel === "MEMBER") {
    if (currentOrder >= LEVEL_ORDER["ASSOCIATE"]) {
      return buildEligibleResponse(input.course, targetLevel, currentLevel);
    }

    const hasExperience = hasProfessionalExperience(input.user);
    if (input.course.track === "MEDIATION" && hasExperience) {
      return buildEligibleResponse(input.course, targetLevel, currentLevel);
    }

    if (memberExpedited?.canApply) {
      return buildExpeditedResponse(
        input.course,
        targetLevel,
        currentLevel,
        "MEMBER",
        memberExpedited,
        trackCourses,
      );
    }

    return buildMissingPrereqResponse(
      input.course,
      targetLevel,
      currentLevel,
      "ASSOCIATE",
      trackCourses,
    );
  }

  // targetLevel === "FELLOW"
  if (currentOrder >= LEVEL_ORDER["MEMBER"]) {
    return buildRequiresApprovalResponse(input.course, targetLevel, currentLevel, "experience verification");
  }

  if (fellowExpedited?.canApply) {
    return buildExpeditedResponse(
      input.course,
      targetLevel,
      currentLevel,
      "FELLOW",
      fellowExpedited,
      trackCourses,
    );
  }

  return buildMissingPrereqResponse(
    input.course,
    targetLevel,
    currentLevel,
    "MEMBER",
    trackCourses,
  );
}

function normalizeEnrollmentLevel(level?: string | null): EnrollmentLevel | null {
  if (!level) return null;
  const normalized = level.trim().toUpperCase();
  if (normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized;
  }
  return null;
}

function hasProfessionalExperience(user: EligibilityEvaluationInput["user"]): boolean {
  return (user.years_adr_experience ?? 0) >= 3 || (user.years_legal_experience ?? 0) >= 3;
}

function buildEligibleResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
): EligibilityResponse {
  return {
    status: "ELIGIBLE",
    reasonCode: "OK",
    ui: {
      title: "You're good to go",
      message: `You're cleared to enroll in ${LEVEL_DISPLAY[targetLevel]}. Continue to secure your seat.`,
      action: {
        label: "Continue to checkout",
        actionType: "ENROLL",
        actionTarget: `/checkout/${course.id}`,
      },
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
    },
  };
}

function buildExistingEnrollmentResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
  enrollment: ExistingEnrollmentSummary,
): EligibilityResponse {
  return {
    status: "BLOCKED",
    reasonCode: "ALREADY_ENROLLED",
    existingEnrollmentId: enrollment.id,
    ui: {
      title: "You already started this course",
      message: "Pick up where you left off — your enrollment is still active.",
      action: {
        label: "Go to my course",
        actionType: "VIEW_ENROLLMENT",
        actionTarget: "/dashboard",
      },
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
    },
  };
}

function buildOverqualifiedResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
  trackCourses: EligibilityEvaluationInput["trackCourses"],
): EligibilityResponse {
  const nextCourse = findNextCourseForLevel(currentLevel, trackCourses);
  return {
    status: "BLOCKED",
    reasonCode: "OVERQUALIFIED",
    ui: {
      title: "You've already completed this level",
      message: nextCourse
        ? `We recommend advancing to ${LEVEL_DISPLAY[nextCourse.level]} to keep your progression moving.`
        : "You're ahead of this course. Explore advanced offerings to stay challenged.",
      action: nextCourse
        ? {
            label: `View ${LEVEL_DISPLAY[nextCourse.level]}`,
            actionType: "REDIRECT",
            actionTarget: buildCourseHref(nextCourse),
          }
        : undefined,
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
      nextCourse,
    },
  };
}

function buildMissingPrereqResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
  requiredLevel: EnrollmentLevel,
  trackCourses: EligibilityEvaluationInput["trackCourses"],
): EligibilityResponse {
  const prereqCourse = trackCourses?.[requiredLevel];
  return {
    status: "BLOCKED",
    reasonCode: "MISSING_PREREQ",
    ui: {
      title: `Start with ${LEVEL_DISPLAY[requiredLevel]}`,
      message: `Complete ${LEVEL_DISPLAY[requiredLevel]} before registering for ${LEVEL_DISPLAY[targetLevel]}.`,
      action: prereqCourse
        ? {
            label: `View ${LEVEL_DISPLAY[requiredLevel]}`,
            actionType: "REDIRECT",
            actionTarget: buildCourseHref(prereqCourse),
          }
        : undefined,
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
      requiredLevel,
      nextCourse: prereqCourse,
    },
  };
}

function buildRequiresApprovalResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
  reason: string,
): EligibilityResponse {
  return {
    status: "REQUIRES_APPROVAL",
    reasonCode: "NEEDS_APPROVAL",
    ui: {
      title: "Application required",
      message: `${LEVEL_DISPLAY[targetLevel]} requires ${reason}. Submit your application to continue.`,
      action: {
        label: "Apply for approval",
        actionType: "APPLY",
        actionTarget: `/enroll/${course.id}/status?mode=apply`,
      },
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
    },
  };
}

function buildExpeditedResponse(
  course: EligibilityEvaluationInput["course"],
  targetLevel: EnrollmentLevel,
  currentLevel: TrackLevel,
  expeditedFor: EnrollmentLevel,
  expedited: ExpeditedEligibility,
  trackCourses: EligibilityEvaluationInput["trackCourses"],
): EligibilityResponse {
  const title = expeditedFor === "MEMBER" ? "Expedited member route" : "Expedited fellowship route";
  const description = expedited.eligibilityType
    ? `You're eligible via ${formatEligibilityType(expedited.eligibilityType)}.`
    : "You're eligible for the expedited assessment.";

  return {
    status: "REQUIRES_APPROVAL",
    reasonCode: "NEEDS_APPROVAL",
    ui: {
      title,
      message: `${LEVEL_DISPLAY[targetLevel]} requires a short assessment. Apply now to secure your spot.`,
      action: {
        label: "Start expedited application",
        actionType: "APPLY",
        actionTarget: `/enroll/${course.id}/status?mode=expedited`,
        description,
      },
      secondaryAction:
        trackCourses?.ASSOCIATE && expeditedFor === "MEMBER"
          ? {
              label: "Start with Associate instead",
              actionType: "REDIRECT",
              actionTarget: buildCourseHref(trackCourses.ASSOCIATE),
            }
          : undefined,
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel,
      expeditedAvailable: true,
      expeditedType: expedited.eligibilityType,
    },
  };
}

function buildInvalidLevelResponse(
  course: EligibilityEvaluationInput["course"],
  currentLevel: TrackLevel,
): EligibilityResponse {
  return {
    status: "BLOCKED",
    reasonCode: "INVALID_LEVEL",
    ui: {
      title: "We're validating this course",
      message: "The enrollment tier is missing or invalid. Please try again in a moment while we update the catalog.",
    },
    progression: {
      track: course.track,
      currentLevel,
      targetLevel: "ASSOCIATE",
    },
  };
}

function buildCourseHref(course: RecommendedCourse): string {
  return `/course/${course.id}`;
}

function findNextCourseForLevel(
  currentLevel: TrackLevel,
  trackCourses: EligibilityEvaluationInput["trackCourses"],
): RecommendedCourse | undefined {
  if (!trackCourses) return undefined;

  if (currentLevel === "ASSOCIATE") {
    return trackCourses.MEMBER ?? trackCourses.FELLOW;
  }
  if (currentLevel === "MEMBER") {
    return trackCourses.FELLOW;
  }
  return undefined;
}

function formatEligibilityType(type?: string): string {
  if (!type) return "your professional track";
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
