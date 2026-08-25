/**
 * Vercel Serverless Function for /api/qualification/professional-profile
 * Handles professional profile creation and updates
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client at module level (like check-eligibility does)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizeTrack(track?: string): "ARBITRATION" | "MEDIATION" {
  const normalized = (track || "").trim().toUpperCase();
  return normalized === "MEDIATION" ? "MEDIATION" : "ARBITRATION";
}

/**
 * Verify JWT token from Supabase (copied from check-eligibility pattern)
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

/**
 * Save professional profile (inline logic to avoid imports)
 */
async function saveProfessionalProfile(userId: string, data: any, options?: { submit?: boolean }) {
  // Check for existing profile
  const { data: existing } = await supabaseAdmin
    .from("professional_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  const payload = {
    track: normalizeTrack(data.track),
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
    country: data.country,
    timezone: data.timezone,
    linkedin_url: data.linkedinUrl,
    website_url: data.websiteUrl,
    organization: data.organization,
    job_title: data.jobTitle,
    years_adr_experience: data.yearsAdrExperience,
    years_legal_experience: data.yearsLegalExperience,
    practice_areas: data.practiceAreas,
    adr_roles: data.adrRoles,
    qualifications: data.qualifications,
    credentials: data.credentials,
    narrative_summary: data.narrativeSummary,
    self_assessed_level: data.selfAssessedLevel,
    submitted_payload: data.submittedPayload,
    review_status: options?.submit ? "UNDER_REVIEW" : "DRAFT",
    reviewer_id: null,
    review_notes: null,
    decision_at: null,
    submitted_at: options?.submit ? new Date().toISOString() : null,
    is_current: true,
    is_archived: false,
  };

  if (existing) {
    // Update existing profile
    const { data: result, error } = await supabaseAdmin
      .from("professional_profiles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    
    if (error) throw error;
    return result;
  } else {
    // Create new profile
    const { data: result, error } = await supabaseAdmin
      .from("professional_profiles")
      .insert({ ...payload, user_id: userId })
      .select("*")
      .single();
    
    if (error) throw error;
    return result;
  }
}

/**
 * Get professional profile by user ID
 */
async function getProfessionalProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS (matching check-eligibility pattern)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const { userId } = await verifyAuth(authHeader);

    // GET - Fetch professional profile
    if (req.method === 'GET') {
      const profile = await getProfessionalProfile(userId);
      return res.status(200).json(profile ?? null);
    }

    // POST - Save professional profile
    if (req.method === 'POST') {
      const {
        submit,
        track,
        contactEmail,
        contactPhone,
        country,
        timezone,
        linkedinUrl,
        websiteUrl,
        organization,
        jobTitle,
        yearsAdrExperience,
        yearsLegalExperience,
        practiceAreas,
        adrRoles,
        qualifications,
        credentials,
        narrativeSummary,
        selfAssessedLevel,
        submittedPayload,
      } = req.body ?? {};

      const payload = {
        track,
        contactEmail,
        contactPhone,
        country,
        timezone,
        linkedinUrl,
        websiteUrl,
        organization,
        jobTitle,
        yearsAdrExperience,
        yearsLegalExperience,
        practiceAreas,
        adrRoles,
        qualifications,
        credentials,
        narrativeSummary,
        selfAssessedLevel,
        submittedPayload,
      };

      const profile = await saveProfessionalProfile(
        userId,
        payload,
        { submit: Boolean(submit) },
      );

      return res.status(200).json(profile);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Professional profile error:', error);
    
    if (error.message === 'No authorization header' || 
        error.message === 'Invalid token' || 
        error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
