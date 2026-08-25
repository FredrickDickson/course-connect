/**
 * Vercel Serverless Function for /api/qualification/professional-profiles/stats
 * Returns statistics about professional profile submissions
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function verifyAdminAuth(authHeader: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    return userData?.role === 'ADMIN' || userData?.role === 'SUPER_ADMIN';
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const isAdmin = await verifyAdminAuth(authHeader);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from("professional_profiles")
        .select("review_status, track")
        .eq("is_current", true);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter((p: any) => p.review_status === 'UNDER_REVIEW').length,
        approved: data.filter((p: any) => p.review_status === 'APPROVED').length,
        rejected: data.filter((p: any) => p.review_status === 'REJECTED').length,
        moreInfoRequired: data.filter((p: any) => p.review_status === 'MORE_INFO_REQUIRED').length,
        byTrack: {
          ARBITRATION: data.filter((p: any) => p.track === 'ARBITRATION').length,
          MEDIATION: data.filter((p: any) => p.track === 'MEDIATION').length,
        },
      };

      return res.status(200).json(stats);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Stats error:', error);
    
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
