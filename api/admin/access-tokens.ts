/**
 * Vercel Serverless Function for /api/admin/access-tokens
 * GET  - List course access tokens (optionally filtered by courseId/status)
 * POST - Generate a new access/coupon token for a course
 *
 * Mirrors server/routes/admin/access-tokens.ts (the Express app, used only
 * in local dev) — that router is never deployed to Vercel, so every route
 * it defines needs a standalone copy here to actually work in production.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const generateSchema = z.object({
  courseId: z.string().uuid(),
  discountValue: z.number().min(0.01).max(100).default(100),
  usageLimit: z.number().int().min(1).default(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

// Unambiguous alphabet — no 0/O/1/I/L — so codes read back cleanly over
// phone/email/WhatsApp. Kept in sync with server/routes/admin/access-tokens.ts.
const TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateTokenSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map((b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('');
}
function generateToken(): string {
  return `CIMA-${generateTokenSegment(4)}-${generateTokenSegment(4)}`;
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  if (req.method === 'GET') {
    try {
      const { courseId, status } = req.query as { courseId?: string; status?: string };

      let query = supabaseAdmin
        .from('course_access_tokens')
        .select('*, course:courses(id, title)')
        .order('created_at', { ascending: false });
      if (courseId) query = query.eq('course_id', courseId);

      const { data: tokens, error } = await query;
      if (error) throw error;

      const now = Date.now();
      const withDerivedStatus = (tokens || []).map((t: any) => ({
        ...t,
        derived_status:
          t.status === 'disabled'
            ? 'disabled'
            : t.expires_at && new Date(t.expires_at).getTime() < now
              ? 'expired'
              : t.usage_count >= t.usage_limit
                ? 'redeemed'
                : 'active',
      }));

      const filtered = status ? withDerivedStatus.filter((t: any) => t.derived_status === status) : withDerivedStatus;

      const tokenIds = filtered.map((t: any) => t.id);
      const { data: orders } = tokenIds.length
        ? await supabaseAdmin
            .from('orders')
            .select('id, access_token_id, user_id, amount, currency, created_at')
            .in('access_token_id', tokenIds)
        : { data: [] as any[] };

      const userIds = Array.from(new Set((orders || []).map((o: any) => o.user_id)));
      const { data: users } = userIds.length
        ? await supabaseAdmin.from('users').select('id, email, first_name, last_name').in('id', userIds)
        : { data: [] as any[] };

      const result = filtered.map((t: any) => ({
        ...t,
        redemptions: (orders || [])
          .filter((o: any) => o.access_token_id === t.id)
          .map((o: any) => ({ ...o, user: (users || []).find((u: any) => u.id === o.user_id) || null })),
      }));

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error listing access tokens:', error);
      return res.status(500).json({ error: 'Failed to list access tokens' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { courseId, discountValue, usageLimit, expiresAt } = generateSchema.parse(req.body);

      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();
      if (courseError || !course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Retry on the astronomically unlikely chance of a collision with an
      // existing token (unique constraint enforces this at the DB level).
      let created: any = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const token = generateToken();
        const { data, error } = await supabaseAdmin
          .from('course_access_tokens')
          .insert({
            course_id: courseId,
            token,
            discount_value: discountValue,
            usage_limit: usageLimit,
            expires_at: expiresAt ?? null,
            created_by: auth.userId,
          })
          .select('*, course:courses(id, title)')
          .single();
        if (!error) {
          created = data;
        } else if (error.code !== '23505') {
          throw error;
        }
      }
      if (!created) {
        return res.status(500).json({ error: 'Failed to generate a unique token, please try again' });
      }

      return res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error generating access token:', error);
      return res.status(500).json({ error: 'Failed to generate access token' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
