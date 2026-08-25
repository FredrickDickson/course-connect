/**
 * Vercel Serverless Function for /api/qualification/professional-profiles/[id]/decision
 * Approve or reject professional profile applications
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    return {
      userId: user.id,
      isAdmin: userData?.role === 'ADMIN' || userData?.role === 'SUPER_ADMIN',
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

/**
 * Update user's qualification level based on approved profile
 */
async function updateUserLevel(userId: string, level: string, track: string) {
  const now = new Date().toISOString();
  
  // Update users table
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({
      assigned_level: level,
      current_level: level,
      level_source: 'EXPEDITED',
      level_updated_at: now,
      pathway_type: 'EXPEDITED',
    })
    .eq("id", userId);

  if (userError) throw userError;

  // Update track_progress table
  const { error: trackError } = await supabaseAdmin
    .from("track_progress")
    .upsert({
      user_id: userId,
      track,
      level,
      pathway: 'EXPEDITED',
      waived_levels: level === 'FELLOW' ? ['ASSOCIATE', 'MEMBER'] : level === 'MEMBER' ? ['ASSOCIATE'] : [],
      waiver_metadata: {},
      updated_at: now,
    }, { onConflict: 'user_id,track' });

  if (trackError) throw trackError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const { userId: reviewerId, isAdmin } = await verifyAdminAuth(authHeader);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'POST') {
      const { id } = req.query;
      const {
        decision,
        reviewNotes,
        assignedLevel,
      } = req.body ?? {};

      if (!decision || !['APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED'].includes(decision)) {
        return res.status(400).json({ 
          error: 'Invalid decision',
          message: 'Decision must be APPROVED, REJECTED, or MORE_INFO_REQUIRED'
        });
      }

      // Get the profile
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("professional_profiles")
        .select("user_id, track, self_assessed_level")
        .eq("id", id)
        .single();

      if (fetchError || !profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const now = new Date().toISOString();
      
      // Update profile with decision
      const updatePayload: any = {
        review_status: decision,
        reviewer_id: reviewerId,
        review_notes: reviewNotes || null,
        decision_at: decision === 'APPROVED' || decision === 'REJECTED' ? now : null,
      };

      if (decision === 'APPROVED' && assignedLevel) {
        updatePayload.assigned_level = assignedLevel;
        updatePayload.level_source = 'EXPEDITED';
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("professional_profiles")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      // If approved, update user's qualification level
      if (decision === 'APPROVED' && assignedLevel) {
        await updateUserLevel(
          profile.user_id,
          assignedLevel,
          profile.track
        );
      }

      return res.status(200).json({
        success: true,
        profile: updatedProfile,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Decision error:', error);
    
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
