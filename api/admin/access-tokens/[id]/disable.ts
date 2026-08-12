/**
 * Vercel Serverless Function for PATCH /api/admin/access-tokens/:id/disable
 *
 * Mirrors server/routes/admin/access-tokens.ts (Express, local dev only) —
 * see api/admin/access-tokens.ts for why this standalone copy exists.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type AdminAuthResult = { error: number; message: string } | { userId: string };

async function requireAdmin(supabaseAdmin: SupabaseClient, authHeader: string | undefined): Promise<AdminAuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 401, message: 'Missing or invalid authorization header' };
  }
  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 401, message: 'Invalid token' };
  }
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (userError || !userData) {
    return { error: 401, message: 'User not found' };
  }
  if (userData.role !== 'admin') {
    return { error: 403, message: 'Admin access required' };
  }
  return { userId: user.id as string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars for access-tokens function');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await requireAdmin(supabaseAdmin, req.headers.authorization);
  if ('error' in auth) {
    return res.status(auth.error).json({ error: auth.message });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('course_access_tokens')
      .update({ status: 'disabled' })
      .eq('id', req.query.id as string)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Token not found' });
    }
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error disabling access token:', error);
    return res.status(500).json({ error: 'Failed to disable access token' });
  }
}
