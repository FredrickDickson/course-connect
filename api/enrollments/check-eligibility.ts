/**
 * Vercel Serverless Function for POST /api/enrollments/check-eligibility
 * Checks if a user is eligible to enroll in a course
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Inlined eligibility logic to avoid cross-directory imports
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

const ACTIVE_ENROLLMENT_STATUSES = new Set([
  "ACTIVE",
  "PENDING_APPROVAL",
  "APPROVED",
]);

const DEFAULT_TRACK = "ARBITRATION";

function normalizeTrackLevel(level?: string | null): string {
  if (!level) return "NONE";
  const normalized = level.toUpperCase();
  if (
    normalized === "NONE" ||
    normalized === "ASSOCIATE" ||
    normalized === "MEMBER" ||
    normalized === "FELLOW"
  ) {
    return normalized;
  }
  return "NONE";
}

function getBlockingMessage(userLevel: string, courseLevel: string): string {
  if (courseLevel === "MEMBER") {
    return "You must complete Associate (Part I) first";
  }
  if (courseLevel === "FELLOW") {
    return "You must complete Member (Part II) first";
  }
  return "You are not eligible for this course yet";
}

function getNextStep(courseLevel: string): "ASSOCIATE" | "MEMBER" | null {
  if (courseLevel === "MEMBER") {
    return "ASSOCIATE";
  }
  if (courseLevel === "FELLOW") {
    return "MEMBER";
  }
  return null;
}

function normalizeEnrollmentLevel(level?: string | null): string {
  if (!level) return "ASSOCIATE";
  const normalized = level.toUpperCase();
  if (normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized;
  }
  return "ASSOCIATE";
}

function resolveTrack(track?: string | null): string {
  return track === "ARBITRATION" || track === "MEDIATION" ? track : DEFAULT_TRACK;
}

function levelLabel(level?: string): string {
  if (!level) return "Unassigned";
  return LEVEL_LABELS[level] ?? level;
}

async function getEnrollment(userId: string, courseId: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getTrackLevel(userId: string, track: string): Promise<string> {
  console.log("Getting track level for user:", userId, "track:", track);
  const { data, error } = await supabaseAdmin
    .from("track_progress")
    .select("level")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();
  
  console.log("Track progress query result:", { data, error });
  
  if (error || !data) {
    // Initialize track_progress if missing
    console.log("No track progress found, initializing with NONE");
    await supabaseAdmin
      .from("track_progress")
      .insert({
        user_id: userId,
        track: track,
        level: "NONE"
      });
    return "NONE";
  }
  
  const normalized = normalizeTrackLevel(data.level);
  console.log("Returning normalized track level:", normalized);
  return normalized;
}

async function checkEligibility(
  user: any,
  course: any,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
): Promise<any> {
  const track = resolveTrack(course.track);
  const currentLevel = await getTrackLevel(user.id, track);
  const requiredLevel = normalizeEnrollmentLevel(
    (course.level as string | null) ?? enrollmentLevel,
  );
  const progressionBase: any = {
    track,
    currentLevel,
    targetLevel: requiredLevel,
  };

  const existingEnrollment = await getEnrollment(user.id, course.id);
  if (
    existingEnrollment &&
    ACTIVE_ENROLLMENT_STATUSES.has(
      (existingEnrollment.status ?? "ACTIVE").toUpperCase(),
    )
  ) {
    return {
      status: "BLOCKED",
      reasonCode: "ALREADY_ENROLLED",
      existingEnrollmentId: existingEnrollment.id,
      ui: {
        title: "You're already enrolled",
        message: `Head to your dashboard to continue your ${track.toLowerCase()} pathway.`,
        action: {
          label: "Go to dashboard",
          actionType: "VIEW_ENROLLMENT",
          actionTarget: "/dashboard",
        },
      },
      progression: progressionBase,
    };
  }

  const userIndex = LEVEL_ORDER[currentLevel];
  const courseIndex = LEVEL_ORDER[requiredLevel];

  // Rule 1: Anyone can take Associate (entry point) in ANY track
  if (requiredLevel === "ASSOCIATE") {
    return {
      status: "ELIGIBLE",
      reasonCode: "OK",
      ui: {
        title: "You're cleared to enroll",
        message: `Start your ${track.toLowerCase()} journey with ${course.title}.`,
        action: {
          label: "Continue to checkout",
          actionType: "ENROLL",
          actionTarget: `/checkout/${course.id}`,
        },
      },
      progression: progressionBase,
    };
  }

  // Rule 2: Must have completed previous level in THIS track
  if (userIndex < courseIndex - 1) {
    const blockingMessage = getBlockingMessage(currentLevel, requiredLevel);
    const nextStep = getNextStep(requiredLevel);

    return {
      status: "BLOCKED",
      reasonCode: "MISSING_PREREQ",
      ui: {
        title: `Complete ${nextStep} in ${track} first`,
        message: `${blockingMessage} in the ${track.toLowerCase()} track. Complete the ${levelLabel(nextStep!)} pathway to unlock this course.`,
        action: {
          label: nextStep === "ASSOCIATE" ? "Start with Associate" : "Continue to Member",
          actionType: "REDIRECT",
          actionTarget: "/qualification-pathway",
        },
      },
      progression: {
        ...progressionBase,
        requiredLevel: nextStep || undefined,
      },
      reason: blockingMessage,
      next_step: nextStep,
    };
  }

  // Eligible - has completed previous level in THIS track
  return {
    status: "ELIGIBLE",
    reasonCode: "OK",
    ui: {
      title: "You're cleared to enroll",
      message: `Continue your ${track.toLowerCase()} progression with ${course.title}.`,
      action: {
        label: "Continue to checkout",
        actionType: "ENROLL",
        actionTarget: `/checkout/${course.id}`,
      },
    },
    progression: progressionBase,
  };
}

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

    const targetLevel =
      normalizeEnrollmentLevel(enrollmentLevel || course.level?.toUpperCase?.()) || "ASSOCIATE";

    const evaluation = await checkEligibility(
      user,
      course,
      targetLevel as "ASSOCIATE" | "MEMBER" | "FELLOW",
    );

    return res.status(200).json(evaluation);

  } catch (error: any) {
    console.error('Eligibility check error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
