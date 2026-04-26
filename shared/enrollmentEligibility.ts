export type TrackLevel = "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";

export type EnrollmentLevel = "ASSOCIATE" | "MEMBER" | "FELLOW";

export type EligibilityStatus = "ELIGIBLE" | "REQUIRES_APPROVAL" | "BLOCKED";

export type EligibilityReasonCode =
  | "OK"
  | "MISSING_PREREQ"
  | "ALREADY_ENROLLED"
  | "OVERQUALIFIED"
  | "NEEDS_APPROVAL";

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
}
