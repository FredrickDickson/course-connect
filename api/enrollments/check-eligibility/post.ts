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

// Eligibility check result types
type EligibilityStatus = "ELIGIBLE" | "REQUIRES_APPROVAL" | "BLOCKED";

interface EligibilityResult {
  status: EligibilityStatus;
  reason?: string;
  nextCourseId?: string;
  nextCourseTitle?: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  years_adr_experience?: number;
  years_legal_experience?: number;
}

interface Course {
  id: string;
  title: string;
  level: string;
  track: string;
  price: string;
  currency: string;
}

/**
 * Check if user is eligible to enroll in a course
 */
async function checkEligibility(
  user: User,
  course: Course,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW"
): Promise<EligibilityResult> {
  const track = course.track || "ARBITRATION";
  
  // Get user's current track progress
  const { data: trackProgress } = await supabaseAdmin
    .from("user_track_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", track)
    .maybeSingle();

  const currentLevel = trackProgress?.level || "NONE";

  // Check for existing active enrollment
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .in("status", ["ACTIVE", "PENDING_APPROVAL"])
    .maybeSingle();

  if (existingEnrollment) {
    return {
      status: "BLOCKED",
      reason: "You already have an active enrollment in this course",
    };
  }

  // Track-specific eligibility logic
  if (track === "ARBITRATION") {
    return checkArbitrationEligibility(currentLevel, enrollmentLevel, course, user);
  } else {
    return checkMediationEligibility(currentLevel, enrollmentLevel, course, user);
  }
}

/**
 * Arbitration track eligibility rules
 */
function checkArbitrationEligibility(
  currentLevel: string,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
  course: Course,
  user: User
): EligibilityResult {
  // Part I (Associate) - Always eligible
  if (enrollmentLevel === "ASSOCIATE") {
    return { status: "ELIGIBLE" };
  }

  // Part II (Member) - Requires Associate level
  if (enrollmentLevel === "MEMBER") {
    if (currentLevel === "ASSOCIATE" || currentLevel === "MEMBER" || currentLevel === "FELLOW") {
      return { status: "ELIGIBLE" };
    }
    return {
      status: "BLOCKED",
      reason: "You must complete the Associate level first",
      nextCourseId: course.id,
      nextCourseTitle: "Associate Course",
    };
  }

  // Part III (Fellow) - Requires Member level + experience verification
  if (enrollmentLevel === "FELLOW") {
    if (currentLevel !== "MEMBER" && currentLevel !== "FELLOW") {
      return {
        status: "BLOCKED",
        reason: "You must complete the Member level first",
        nextCourseId: course.id,
        nextCourseTitle: "Member Course",
      };
    }
    // Fellow always requires approval for experience verification
    return {
      status: "REQUIRES_APPROVAL",
      reason: "Fellowship requires experience verification",
    };
  }

  return { status: "BLOCKED", reason: "Invalid enrollment level" };
}

/**
 * Mediation track eligibility rules
 */
function checkMediationEligibility(
  currentLevel: string,
  enrollmentLevel: "ASSOCIATE" | "MEMBER" | "FELLOW",
  course: Course,
  user: User
): EligibilityResult {
  // ACIMed (Associate) - Always eligible
  if (enrollmentLevel === "ASSOCIATE") {
    return { status: "ELIGIBLE" };
  }

  // MCIMed (Member) - Dual entry: Associate level OR relevant experience
  if (enrollmentLevel === "MEMBER") {
    const hasExperience = (user.years_adr_experience || 0) >= 3 || (user.years_legal_experience || 0) >= 3;
    
    if (currentLevel === "ASSOCIATE" || currentLevel === "MEMBER" || currentLevel === "FELLOW" || hasExperience) {
      return { status: "ELIGIBLE" };
    }
    
    return {
      status: "BLOCKED",
      reason: "You need either Associate level or 3+ years of ADR/legal experience",
      nextCourseId: course.id,
      nextCourseTitle: "Associate Course",
    };
  }

  // FCIMed (Fellow) - Requires Member level + experience verification
  if (enrollmentLevel === "FELLOW") {
    if (currentLevel !== "MEMBER" && currentLevel !== "FELLOW") {
      return {
        status: "BLOCKED",
        reason: "You must complete the Member level first",
        nextCourseId: course.id,
        nextCourseTitle: "Member Course",
      };
    }
    // Fellow always requires approval for experience verification
    return {
      status: "REQUIRES_APPROVAL",
      reason: "Fellowship requires experience verification",
    };
  }

  return { status: "BLOCKED", reason: "Invalid enrollment level" };
}

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

    const { courseId, enrollmentLevel } = req.body;

    if (!courseId || !enrollmentLevel) {
      return res.status(400).json({ message: "courseId and enrollmentLevel are required" });
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

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check eligibility
    const eligibility = await checkEligibility(user, course, enrollmentLevel);
    
    return res.status(200).json(eligibility);

  } catch (error: any) {
    console.error('Eligibility check error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
