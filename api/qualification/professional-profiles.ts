/**
 * Vercel Serverless Function for /api/qualification/professional-profiles
 * Handles listing professional profiles for admin review
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Verify JWT token and check admin access
 */
async function verifyAdminAuth(authHeader: string): Promise<{ userId: string; isAdmin: boolean }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'SUPER_ADMIN';
    
    return {
      userId: user.id,
      isAdmin,
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

/**
 * List professional profiles with filters
 */
async function listProfiles(filters: {
  status?: string;
  track?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from("professional_profiles")
    .select(`
      *,
      user:users!professional_profiles_user_id_fkey(
        id,
        first_name,
        last_name,
        email,
        country
      )
    `)
    .eq("is_current", true)
    .order("submitted_at", { ascending: false });

  // Apply filters
  if (filters.status && filters.status !== 'ALL') {
    query = query.eq("review_status", filters.status);
  }
  
  if (filters.track && filters.track !== 'ALL') {
    query = query.eq("track", filters.track);
  }

  // Apply pagination
  if (filters.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Apply search filter in memory (searching name, email)
  let results = data || [];
  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter((profile: any) => {
      const user = profile.user;
      const searchFields = [
        user?.first_name,
        user?.last_name,
        user?.email,
        profile.contact_email,
      ].filter(Boolean).map(v => v!.toLowerCase());
      
      return searchFields.some(field => field.includes(term));
    });
  }

  return results;
}

/**
 * Get profile statistics
 */
async function getStats() {
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
    byTrack: {
      ARBITRATION: data.filter((p: any) => p.track === 'ARBITRATION').length,
      MEDIATION: data.filter((p: any) => p.track === 'MEDIATION').length,
    },
  };

  return stats;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const { isAdmin } = await verifyAdminAuth(authHeader);

    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    if (req.method === 'GET') {
      const { status, track, q: search, limit, offset } = req.query;

      const profiles = await listProfiles({
        status: status as string,
        track: track as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      return res.status(200).json(profiles);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Professional profiles list error:', error);
    
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
