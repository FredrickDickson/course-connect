import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateEligibility,
  type EligibilityEvaluationInput,
  type EnrollmentLevel,
  type RecommendedCourse,
  type TrackLevel,
} from "../../shared/eligibility-engine";
import {
  canApplyExpeditedMember,
  canApplyExpeditedFellow,
} from "./eligibility";

interface EvaluationParams {
  supabaseClient: SupabaseClient<any, any, any>;
  user: any;
  course: any;
  enrollmentLevel: string;
}

export async function evaluateEligibilityWithContext(params: EvaluationParams) {
  const track = params.course.track || "ARBITRATION";

  const [trackProgress, existingEnrollment, trackCoursesData, profileRow, memberExpedited, fellowExpedited] = await Promise.all([
    params.supabaseClient
      .from("user_track_progress")
      .select("level")
      .eq("user_id", params.user.id)
      .eq("track", track)
      .maybeSingle(),
    params.supabaseClient
      .from("enrollments")
      .select("id,status,enrollment_type")
      .eq("user_id", params.user.id)
      .eq("course_id", params.course.id)
      .in("status", ["ACTIVE", "PENDING_APPROVAL", "APPROVED"])
      .maybeSingle(),
    params.supabaseClient
      .from("courses")
      .select("id,title,level,track")
      .eq("track", track)
      .in("level", ["associate", "member", "fellow"])
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    params.supabaseClient
      .from("profiles")
      .select("education_level, professional_background, adr_experience, job_title, years_experience")
      .eq("user_id", params.user.id)
      .maybeSingle(),
    canApplyExpeditedMember(params.user.id, track),
    canApplyExpeditedFellow(params.user.id, track),
  ]);

  const currentLevel = mapTrackLevel(trackProgress.data?.level);
  const trackCourses = buildTrackCoursesMap(trackCoursesData.data);
  const profile: any = profileRow.data || {};

  const evaluationInput: EligibilityEvaluationInput = {
    user: {
      years_adr_experience: params.user.years_adr_experience,
      years_legal_experience: params.user.years_legal_experience,
      years_experience: profile.years_experience,
      has_llm_degree: params.user.has_llm_degree,
      bar_admission_number: params.user.bar_admission_number,
      education_level: profile.education_level,
      professional_background: profile.professional_background,
      adr_experience: profile.adr_experience,
      job_title: profile.job_title || params.user.job_title,
      first_name: params.user.first_name,
      last_name: params.user.last_name,
      role: params.user.role,
    },
    course: {
      id: params.course.id,
      title: params.course.title,
      level: params.course.level,
      track,
    },
    enrollmentLevel: params.enrollmentLevel,
    currentLevel,
    existingEnrollment: existingEnrollment.data
      ? {
          id: existingEnrollment.data.id,
          status: existingEnrollment.data.status,
          type: existingEnrollment.data.enrollment_type,
        }
      : undefined,
    trackCourses,
    expedited: {
      member: memberExpedited.canApply
        ? { canApply: true, eligibilityType: memberExpedited.eligibilityType }
        : undefined,
      fellow: fellowExpedited.canApply
        ? { canApply: true, eligibilityType: fellowExpedited.eligibilityType }
        : undefined,
    },
  };

  return evaluateEligibility(evaluationInput);
}

function mapTrackLevel(level?: string | null): TrackLevel {
  if (!level) return "NONE";
  const normalized = level.toUpperCase();
  if (normalized === "NONE" || normalized === "STUDENT" || normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized as TrackLevel;
  }
  return "NONE";
}

function buildTrackCoursesMap(
  rows?: Array<{ id: string; title: string; level?: string | null }> | null,
): Partial<Record<EnrollmentLevel, RecommendedCourse>> {
  if (!rows) return {};
  return rows.reduce<Partial<Record<EnrollmentLevel, RecommendedCourse>>>((acc, row) => {
    const normalized = normalizeEnrollmentLevel(row.level);
    if (normalized && !acc[normalized]) {
      acc[normalized] = {
        id: row.id,
        title: row.title,
        level: normalized,
      };
    }
    return acc;
  }, {});
}

function normalizeEnrollmentLevel(value?: string | null): EnrollmentLevel | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "ASSOCIATE" || upper === "MEMBER" || upper === "FELLOW") {
    return upper;
  }
  return null;
}
