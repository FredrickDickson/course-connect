/**
 * Vercel Serverless Function for POST /api/enrollments/check-eligibility
 * Checks if a user is eligible to enroll in a course
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { EnrollmentLevel } from "../../shared/enrollmentEligibility";
import type { User, Course } from "../../shared/schema";
import { checkEligibility } from "../../server/storage/enrollment";

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

    const targetLevel =
      normalizeEnrollmentLevel(enrollmentLevel || course.level?.toUpperCase?.()) || "ASSOCIATE";

    const evaluation = await checkEligibility(
      user as User,
      course as Course,
      targetLevel,
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

function normalizeEnrollmentLevel(value?: string | null): EnrollmentLevel | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "ASSOCIATE" || upper === "MEMBER" || upper === "FELLOW") {
    return upper;
  }
  return null;
}
