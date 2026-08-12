/**
 * Admin Course Access Token Management Routes
 * Lets admins generate/manage single-use (or limited-use) codes that grant
 * a discounted or free course enrollment for students who paid externally.
 */

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabaseAdmin } from '../../storage';
import { requireSupabaseAuth } from '../../supabaseAuth';
import { requireRole } from '../../middleware/roleProtection';

const router = Router();

const generateSchema = z.object({
  courseId: z.string().uuid(),
  discountValue: z.number().min(0.01).max(100).default(100),
  usageLimit: z.number().int().min(1).default(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

// Unambiguous alphabet — no 0/O/1/I/L — so codes read back cleanly over
// phone/email/WhatsApp.
const TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateTokenSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map((b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('');
}
function generateToken(): string {
  return `CIMA-${generateTokenSegment(4)}-${generateTokenSegment(4)}`;
}

/**
 * POST /api/admin/access-tokens
 * Generate a new access/coupon token for a course. The token itself is
 * always server-generated — a client-supplied code is never accepted.
 */
router.post('/', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user!.id;
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
          created_by: adminId,
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

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error generating access token:', error);
    res.status(500).json({ error: 'Failed to generate access token' });
  }
});

/**
 * GET /api/admin/access-tokens
 * List tokens, optionally filtered by course and/or derived status.
 * "redeemed"/"expired" are computed here (not stored) from usage_count/
 * expires_at, matching the DB's derived-status convention.
 */
router.get('/', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
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

    res.json(result);
  } catch (error) {
    console.error('Error listing access tokens:', error);
    res.status(500).json({ error: 'Failed to list access tokens' });
  }
});

/**
 * GET /api/admin/access-tokens/:id
 * Single-token detail, same shape as a list row.
 */
router.get('/:id', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
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
    res.json({
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
  } catch (error) {
    console.error('Error fetching access token:', error);
    res.status(500).json({ error: 'Failed to fetch access token' });
  }
});

/**
 * PATCH /api/admin/access-tokens/:id/disable
 */
router.patch('/:id/disable', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('course_access_tokens')
      .update({ status: 'disabled' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error disabling access token:', error);
    res.status(500).json({ error: 'Failed to disable access token' });
  }
});

/**
 * DELETE /api/admin/access-tokens/:id
 * Only allowed if the token has never been used.
 */
router.delete('/:id', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { data: token, error: fetchError } = await supabaseAdmin
      .from('course_access_tokens')
      .select('usage_count')
      .eq('id', req.params.id)
      .single();
    if (fetchError || !token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    if (token.usage_count > 0) {
      return res.status(409).json({ error: 'Cannot delete a token that has already been used' });
    }

    const { error } = await supabaseAdmin.from('course_access_tokens').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting access token:', error);
    res.status(500).json({ error: 'Failed to delete access token' });
  }
});

export default router;
