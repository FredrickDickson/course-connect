/**
 * Vercel Serverless Function for /api/admin/access-tokens/:id
 * GET    - Single-token detail, same shape as a list row
 * DELETE - Delete a token (only allowed if it has never been used)
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  const id = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const { data: token, error } = await supabaseAdmin
        .from('course_access_tokens')
        .select('*, course:courses(id, title)')
        .eq('id', id)
        .single();
      if (error || !token) {
        return res.status(404).json({ error: 'Token not found' });
      }

      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, amount, currency, created_at')
        .eq('access_token_id', id);

      const userIds = Array.from(new Set((orders || []).map((o: any) => o.user_id)));
      const { data: users } = userIds.length
        ? await supabaseAdmin.from('users').select('id, email, first_name, last_name').in('id', userIds)
        : { data: [] as any[] };

      const now = Date.now();
      return res.status(200).json({
        ...token,
        derived_status:
          token.status === 'disabled'
            ? 'disabled'
            : token.expires_at && new Date(token.expires_at).getTime() < now
              ? 'expired'
              : token.usage_count >= token.usage_limit
                ? 'redeemed'
                : 'active',
        redemptions: (orders || []).map((o: any) => ({ ...o, user: (users || []).find((u: any) => u.id === o.user_id) || null })),
      });
    } catch (error: any) {
      console.error('Error fetching access token:', error);
      return res.status(500).json({ error: 'Failed to fetch access token' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data: token, error: fetchError } = await supabaseAdmin
        .from('course_access_tokens')
        .select('usage_count')
        .eq('id', id)
        .single();
      if (fetchError || !token) {
        return res.status(404).json({ error: 'Token not found' });
      }
      if (token.usage_count > 0) {
        return res.status(409).json({ error: 'Cannot delete a token that has already been used' });
      }

      const { error } = await supabaseAdmin.from('course_access_tokens').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting access token:', error);
      return res.status(500).json({ error: 'Failed to delete access token' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
