/**
 * Vercel Serverless Function for GET /api/qualifications/get-user-state
 * Returns user's qualification state across both Arbitration and Mediation tracks
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || '';
    const { userId } = await verifyAuth(authHeader);

    // Get track progress for both tracks
    const { data: trackProgress } = await supabaseAdmin
      .from("track_progress")
      .select("*")
      .eq("user_id", userId);

    // Get certificates for both tracks
    const { data: certificates } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("is_revoked", false)
      .order("issued_at", { ascending: false });

    // Get enrollments with course details
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select(`
        *,
        courses (
          id,
          title,
          track,
          level
        )
      `)
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });

    // Organize by track
    const arbitration = trackProgress?.find(tp => tp.track === "ARBITRATION") || {
      track: "ARBITRATION",
      level: "NONE",
      pathway: null,
    };
    const mediation = trackProgress?.find(tp => tp.track === "MEDIATION") || {
      track: "MEDIATION",
      level: "NONE",
      pathway: null,
    };

    const arbitrationCertificates = certificates?.filter(c => c.track === "ARBITRATION") || [];
    const mediationCertificates = certificates?.filter(c => c.track === "MEDIATION") || [];

    const arbitrationEnrollments = enrollments?.filter(e => e.courses?.track === "ARBITRATION") || [];
    const mediationEnrollments = enrollments?.filter(e => e.courses?.track === "MEDIATION") || [];

    return res.status(200).json({
      tracks: {
        arbitration: {
          ...arbitration,
          certificates: arbitrationCertificates,
          enrollments: arbitrationEnrollments,
        },
        mediation: {
          ...mediation,
          certificates: mediationCertificates,
          enrollments: mediationEnrollments,
        },
      },
    });

  } catch (error: any) {
    console.error('Get user state error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
