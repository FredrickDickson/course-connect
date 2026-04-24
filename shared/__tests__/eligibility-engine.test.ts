import { describe, expect, it } from "vitest";
import {
  evaluateEligibility,
  type EligibilityEvaluationInput,
  type EnrollmentLevel,
} from "../eligibility-engine";

const baseUser = {
  years_adr_experience: 0,
  years_legal_experience: 0,
  has_llm_degree: false,
  bar_admission_number: null,
  first_name: "Test",
  last_name: "User",
  role: "PROFESSIONAL",
};

const baseCourse = {
  id: "course-1",
  title: "Associate Course",
  level: "associate",
  track: "ARBITRATION" as const,
};

const trackCourses: Partial<Record<EnrollmentLevel, { id: string; title: string; level: EnrollmentLevel }>> = {
  ASSOCIATE: { id: "assoc", title: "Associate", level: "ASSOCIATE" },
  MEMBER: { id: "member", title: "Member", level: "MEMBER" },
};

describe("eligibility-engine", () => {
  it("allows associate enrollment by default", () => {
    const result = evaluateEligibility(buildInput({}));
    expect(result.status).toBe("ELIGIBLE");
    expect(result.reasonCode).toBe("OK");
  });

  it("blocks member enrollment when associate level missing", () => {
    const result = evaluateEligibility(
      buildInput({
        enrollmentLevel: "MEMBER",
        currentLevel: "NONE",
      }),
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.reasonCode).toBe("MISSING_PREREQ");
    expect(result.progression.requiredLevel).toBe("ASSOCIATE");
    expect(result.progression.nextCourse?.id).toBe("assoc");
  });

  it("requires approval for fellowship even when member", () => {
    const result = evaluateEligibility(
      buildInput({
        enrollmentLevel: "FELLOW",
        currentLevel: "MEMBER",
      }),
    );

    expect(result.status).toBe("REQUIRES_APPROVAL");
    expect(result.reasonCode).toBe("NEEDS_APPROVAL");
  });
});

function buildInput(overrides: Partial<EligibilityEvaluationInput>) {
  return {
    user: baseUser,
    course: baseCourse,
    enrollmentLevel: "ASSOCIATE",
    currentLevel: "NONE",
    trackCourses,
    ...overrides,
  } satisfies EligibilityEvaluationInput;
}
