export type TrackLevel = "NONE" | "ASSOCIATE" | "MEMBER" | "FELLOW";

export type EnrollmentLevel = "ASSOCIATE" | "MEMBER" | "FELLOW";

export type EligibilityStatus = "ELIGIBLE" | "BLOCKED";

export type EligibilityReasonCode =
  | "OK"
  | "MISSING_PREREQ"
  | "ALREADY_ENROLLED"
  | "OVERQUALIFIED";

export type EligibilityActionType = "ENROLL" | "APPLY" | "REDIRECT" | "VIEW_ENROLLMENT";

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
  track: "ARBITRATION" | "MEDIATION";
  currentLevel: TrackLevel;
  targetLevel: EnrollmentLevel;
  requiredLevel?: EnrollmentLevel;
  nextCourse?: {
    id: string;
    title: string;
    level: EnrollmentLevel;
  };
  expeditedAvailable?: boolean;
  expeditedType?: string;
}

export interface EligibilityResponse {
  status: EligibilityStatus;
  reasonCode: EligibilityReasonCode;
  ui: EligibilityUI;
  progression: EligibilityProgression;
  existingEnrollmentId?: string;
  reason?: string;
  next_step?: "ASSOCIATE" | "MEMBER" | null;
  isClientCalculated?: boolean;
}

// Client-side eligibility calculation for instant feedback
export function calculateEligibilityClientSide(
  courseTrack: string | null,
  courseLevel: string | null,
  trackProgress: Record<string, string>,
  isEnrolled: boolean
): EligibilityResponse {
  const LEVEL_ORDER: Record<string, number> = {
    NONE: 0,
    ASSOCIATE: 1,
    MEMBER: 2,
    FELLOW: 3,
  };

  const LEVEL_LABELS: Record<string, string> = {
    NONE: "No level assigned",
    ASSOCIATE: "Associate (Part I)",
    MEMBER: "Member (Part II)",
    FELLOW: "Fellow",
  };

  const track = courseTrack === "ARBITRATION" || courseTrack === "MEDIATION" ? courseTrack : "ARBITRATION";
  const currentLevel = (trackProgress[track] || "NONE").toUpperCase();
  const requiredLevel = (courseLevel || "ASSOCIATE").toUpperCase();
  const userIndex = LEVEL_ORDER[currentLevel] || 0;
  const courseIndex = LEVEL_ORDER[requiredLevel] || 1;

  const progression: EligibilityProgression = {
    track: track as "ARBITRATION" | "MEDIATION",
    currentLevel: currentLevel as TrackLevel,
    targetLevel: requiredLevel as EnrollmentLevel,
  };

  // Check if already enrolled
  if (isEnrolled) {
    return {
      status: "BLOCKED",
      reasonCode: "ALREADY_ENROLLED",
      ui: {
        title: "You're already enrolled",
        message: `Head to your dashboard to continue your ${track.toLowerCase()} pathway.`,
        action: {
          label: "Go to dashboard",
          actionType: "VIEW_ENROLLMENT",
          actionTarget: "/dashboard",
        },
      },
      progression,
      isClientCalculated: true,
    };
  }

  // Rule 1: Anyone can take Associate (entry point) in ANY track
  if (requiredLevel === "ASSOCIATE") {
    return {
      status: "ELIGIBLE",
      reasonCode: "OK",
      ui: {
        title: "You're cleared to enroll",
        message: `Start your ${track.toLowerCase()} journey.`,
        action: {
          label: "Continue to checkout",
          actionType: "ENROLL",
        },
      },
      progression,
      isClientCalculated: true,
    };
  }

  // Rule 2: Must have completed previous level in THIS track
  if (userIndex < courseIndex - 1) {
    const nextStep = requiredLevel === "MEMBER" ? "ASSOCIATE" : "MEMBER";
    const blockingMessage = requiredLevel === "MEMBER" 
      ? "You must complete Associate (Part I) first" 
      : "You must complete Member (Part II) first";

    return {
      status: "BLOCKED",
      reasonCode: "MISSING_PREREQ",
      ui: {
        title: `Complete ${nextStep} in ${track} first`,
        message: `${blockingMessage} in the ${track.toLowerCase()} track. Complete the ${LEVEL_LABELS[nextStep]} pathway to unlock this course.`,
        action: {
          label: nextStep === "ASSOCIATE" ? "Start with Associate" : "Continue to Member",
          actionType: "REDIRECT",
          actionTarget: "/qualification-pathway",
        },
      },
      progression: {
        ...progression,
        requiredLevel: nextStep as EnrollmentLevel,
      },
      reason: blockingMessage,
      next_step: nextStep as "ASSOCIATE" | "MEMBER",
      isClientCalculated: true,
    };
  }

  // Eligible - has completed previous level in THIS track
  return {
    status: "ELIGIBLE",
    reasonCode: "OK",
    ui: {
      title: "You're cleared to enroll",
      message: `Continue your ${track.toLowerCase()} progression.`,
      action: {
        label: "Continue to checkout",
        actionType: "ENROLL",
      },
    },
    progression,
    isClientCalculated: true,
  };
}
