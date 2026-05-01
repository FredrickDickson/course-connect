export type Track = "ARBITRATION" | "MEDIATION";
export type EnrollmentLevel = "ASSOCIATE" | "MEMBER" | "FELLOW";
export type TrackLevel = "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
export type PathwayType = "STANDARD" | "EXPEDITED";
export type PathwayAction = "enroll" | "apply" | "apply_expedited";

export interface PathwayOption {
  type: PathwayType;
  level: EnrollmentLevel;
  name: string;
  postNominal: string;
  description: string;
  duration: string;
  format: string;
  assessment: string;
  action: PathwayAction;
  eligibility: string;
  outcome: string;
  modules?: string[];
  requirements?: string[];
  isRecommended?: boolean;
  recommendationReason?: string;
}

export interface EligibilityCheck {
  canApply: boolean;
  reason?: string;
  eligibilityType?: string;
}

export interface PathwayEligibilityMap {
  member: EligibilityCheck;
  fellow: EligibilityCheck;
}
