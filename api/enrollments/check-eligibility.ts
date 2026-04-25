/**
 * Vercel Serverless Function for POST /api/enrollments/check-eligibility
 * Checks if a user is eligible to enroll in a course
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
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
} from "../../server/storage/eligibility";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Check if user is eligible to enroll in a course
 */
/**
 * Verify JWT token from Supabase
 */
async function verifyAuth(authHeader: string): Promise<{ userId: string; email: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    return {
      userId: user.id,
      email: user.email || '',
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || '';
    const { userId } = await verifyAuth(authHeader);

    const { courseId, enrollmentLevel } = req.body || {};

    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }

    // Get course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Get user details (auto-create if missing — handles users created before trigger)
    let { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("User fetch error:", userError);
      return res.status(500).json({ message: "Failed to load user", error: userError.message });
    }

    if (!user) {
      // Backfill the public.users row from auth.users
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const authUser = authData?.user;
      const meta: any = authUser?.user_metadata || {};
      const { data: created, error: createErr } = await supabaseAdmin
        .from("users")
        .insert({
          id: userId,
          email: authUser?.email || "",
          first_name: meta.first_name || meta.name || (authUser?.email?.split("@")[0] ?? ""),
          last_name: meta.last_name || "",
          role: "student",
        })
        .select()
        .single();
      if (createErr || !created) {
        console.error("User backfill failed:", createErr);
        return res.status(500).json({ message: "Could not initialize user profile", error: createErr?.message });
      }
      user = created;
    }

    const evaluation = await runEligibilityEvaluation({
      user,
      course,
      enrollmentLevel: enrollmentLevel || course.level?.toUpperCase?.() || "ASSOCIATE",
    });

    return res.status(200).json(evaluation);

  } catch (error: any) {
    console.error('Eligibility check error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function runEligibilityEvaluation(params: {
  user: any;
  course: any;
  enrollmentLevel: string;
}) {
  const track = params.course.track || "ARBITRATION";

  const [trackProgress, existingEnrollment, trackCoursesData, profileRow, memberExpedited, fellowExpedited] = await Promise.all([
    supabaseAdmin
      .from("user_track_progress")
      .select("level")
      .eq("user_id", params.user.id)
      .eq("track", track)
      .maybeSingle(),
    supabaseAdmin
      .from("enrollments")
      .select("id,status,enrollment_type")
      .eq("user_id", params.user.id)
      .eq("course_id", params.course.id)
      .in("status", ["ACTIVE", "PENDING_APPROVAL", "APPROVED"])
      .maybeSingle(),
    supabaseAdmin
      .from("courses")
      .select("id,title,level,track")
      .eq("track", track)
      .in("level", ["associate", "member", "fellow"])
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabaseAdmin
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
