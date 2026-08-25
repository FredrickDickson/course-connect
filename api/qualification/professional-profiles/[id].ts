/**
 * Vercel Serverless Function for /api/qualification/professional-profiles/[id]
 * Get single professional profile with documents
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
      const { id } = req.query;

      // Get profile with user info
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("professional_profiles")
        .select(`
          *,
          user:users!professional_profiles_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            country,
            phone,
            created_at
          )
        `)
        .eq("id", id)
        .single();

      if (profileError) throw profileError;
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Get documents
      const { data: documents, error: docsError } = await supabaseAdmin
        .from("professional_documents")
        .select("*")
        .eq("profile_id", id)
        .order("uploaded_at", { ascending: false });

      if (docsError) throw docsError;

      return res.status(200).json({
        ...profile,
        documents: documents || [],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Get profile error:', error);
    
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
