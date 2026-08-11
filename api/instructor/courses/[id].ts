/**
 * Vercel Serverless Function for PUT /api/instructor/courses/:id
 * Updates an existing course for instructors/admins
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============================================================================
// Shared instructor resolve/sync helpers for admin direct-instructor-input.
// MUST be kept in sync with the identical copy in server/routes.ts and
// api/instructor/courses.ts (the Express app / create endpoint use their own
// copies of the same logic).
// ============================================================================

interface InstructorInput {
  userId?: string;
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  profileImageUrl?: string;
  expertise?: string[];
  linkedinUrl?: string;
  websiteUrl?: string;
}

interface ResolvedInstructor {
  userId: string;
  isAdminManaged: boolean;
}

async function upsertInstructorAvatarProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
  profileImageUrl: string | null | undefined,
) {
  if (!profileImageUrl) return;
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { user_id: userId, avatar_url: profileImageUrl, avatar_updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) console.error('Error upserting instructor avatar profile:', error);
}

async function syncAdminManagedInstructor(supabaseAdmin: SupabaseClient, userId: string, input: InstructorInput) {
  const [firstName, ...lastNameParts] = input.name.trim().split(' ');
  const { error: userErr } = await supabaseAdmin
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastNameParts.join(' ') || '',
      bio: input.bio || null,
      profile_image_url: input.profileImageUrl || null,
    })
    .eq('id', userId);
  if (userErr) console.error('Error syncing admin-managed instructor user row:', userErr);

  await upsertInstructorAvatarProfile(supabaseAdmin, userId, input.profileImageUrl);

  const { error: profileErr } = await supabaseAdmin
    .from('instructor_profiles')
    .upsert(
      {
        user_id: userId,
        bio: input.bio || null,
        title: input.title || null,
        expertise: input.expertise || [],
        website_url: input.websiteUrl || null,
        linkedin_url: input.linkedinUrl || null,
        profile_image_url: input.profileImageUrl || null,
        is_verified: false,
      },
      { onConflict: 'user_id' },
    );
  if (profileErr) console.error('Error syncing instructor_profiles:', profileErr);
}

// Resolves one instructor form entry to a real user, per the rules:
// - has userId -> reuse it; sync bio/photo only if admin-managed
// - no userId but email matches an existing instructor -> reuse it; same sync rule
// - otherwise -> create a brand-new admin-managed instructor user
async function resolveOrCreateInstructor(
  supabaseAdmin: SupabaseClient,
  input: InstructorInput,
  adminUserId: string,
  sortOrder: number,
): Promise<ResolvedInstructor> {
  if (input.userId) {
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id, created_by_admin_id')
      .eq('id', input.userId)
      .single();
    if (error || !existingUser) throw new Error(`Instructor ${input.userId} not found`);

    const isAdminManaged = !!existingUser.created_by_admin_id;
    if (isAdminManaged) await syncAdminManagedInstructor(supabaseAdmin, existingUser.id, input);
    return { userId: existingUser.id, isAdminManaged };
  }

  if (input.email) {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, created_by_admin_id')
      .eq('email', input.email)
      .eq('role', 'instructor')
      .maybeSingle();

    if (existingUser) {
      const isAdminManaged = !!existingUser.created_by_admin_id;
      if (isAdminManaged) await syncAdminManagedInstructor(supabaseAdmin, existingUser.id, input);
      return { userId: existingUser.id, isAdminManaged };
    }
  }

  const [firstName, ...lastNameParts] = input.name.trim().split(' ');
  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email: input.email || `instructor-${Date.now()}-${sortOrder}@thecima.org`,
      first_name: firstName,
      last_name: lastNameParts.join(' ') || '',
      role: 'instructor',
      profile_image_url: input.profileImageUrl || null,
      bio: input.bio || null,
      created_by_admin_id: adminUserId,
    })
    .select()
    .single();
  if (userError) throw userError;

  await upsertInstructorAvatarProfile(supabaseAdmin, newUser.id, input.profileImageUrl);

  const { error: profileError } = await supabaseAdmin
    .from('instructor_profiles')
    .insert({
      user_id: newUser.id,
      bio: input.bio || null,
      title: input.title || null,
      expertise: input.expertise || [],
      website_url: input.websiteUrl || null,
      linkedin_url: input.linkedinUrl || null,
      profile_image_url: input.profileImageUrl || null,
      is_verified: false,
    });
  if (profileError) console.error('Error creating instructor profile:', profileError);

  return { userId: newUser.id, isAdminManaged: true };
}

async function resolveCourseInstructors(
  supabaseAdmin: SupabaseClient,
  instructors: InstructorInput[],
  adminUserId: string,
): Promise<ResolvedInstructor[]> {
  const resolved: ResolvedInstructor[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < instructors.length; i++) {
    const r = await resolveOrCreateInstructor(supabaseAdmin, instructors[i], adminUserId, i);
    if (seen.has(r.userId)) continue; // dedupe: same instructor listed twice
    seen.add(r.userId);
    resolved.push(r);
  }
  return resolved;
}

async function writeCourseInstructors(supabaseAdmin: SupabaseClient, courseId: string, resolved: ResolvedInstructor[]) {
  if (resolved.length === 0) return;
  const rows = resolved.map((r, i) => ({ course_id: courseId, user_id: r.userId, sort_order: i }));
  const { error } = await supabaseAdmin
    .from('course_instructors')
    .upsert(rows, { onConflict: 'course_id,user_id' });
  if (error) console.error('Error writing course_instructors:', error);
}

// Diffs the resolved instructor list against existing course_instructors
// rows instead of delete-and-reinsert, so untouched rows keep their
// created_at and are never spuriously re-touched.
async function reconcileCourseInstructors(supabaseAdmin: SupabaseClient, courseId: string, resolved: ResolvedInstructor[]) {
  const { data: existingRows } = await supabaseAdmin
    .from('course_instructors')
    .select('user_id')
    .eq('course_id', courseId);
  const existingIds = new Set((existingRows || []).map((r: any) => r.user_id));
  const newIds = new Set(resolved.map((r) => r.userId));

  const toDelete = Array.from(existingIds).filter((uid) => !newIds.has(uid));
  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin
      .from('course_instructors')
      .delete()
      .eq('course_id', courseId)
      .in('user_id', toDelete); // removes the credit link only, never the users row
    if (error) console.error('Error removing stale course_instructors rows:', error);
  }

  await writeCourseInstructors(supabaseAdmin, courseId, resolved);
}

// Maps the incoming camelCase payload to the courses table's snake_case
// columns, same mapping as server/storage.ts updateCourse(). Only fields
// actually present on the body are included so JSON.stringify (and Supabase)
// don't null out columns the client didn't send.
function buildCourseUpdatePayload(data: any) {
  const payload: Record<string, any> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.subtitle !== undefined) payload.subtitle = data.subtitle;
  if (data.description !== undefined) payload.description = data.description;
  if (data.categoryId !== undefined) payload.category_id = data.categoryId;
  if (data.programmeType !== undefined) payload.programme_type = data.programmeType;
  if (data.level !== undefined) payload.level = data.level;
  if (data.track !== undefined) payload.track = data.track;
  if (data.price !== undefined) {
    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    payload.price = price;
  }
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
  if (data.isPublished !== undefined) payload.is_published = data.isPublished;
  if (data.isFeatured !== undefined) payload.is_featured = data.isFeatured;

  payload.updated_at = new Date().toISOString();

  return payload;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize clients inside handler to avoid module-level env var issues
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
    });
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Required environment variables are missing'
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Bad request', message: 'Course ID is required' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    }

    // Check user role
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return res.status(500).json({ error: 'Database error', message: 'Failed to verify user role' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'Not found', message: 'User profile not found' });
    }

    const currentUserRole = userData.role;
    const currentUserId = user.id;

    if (currentUserRole !== 'instructor' && currentUserRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied. Instructor or admin role required.' });
    }

    // Fetch the course to check ownership
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Not found', message: 'Course not found' });
    }

    const hasAccess = currentUserRole === 'admin' || course.instructor_id === currentUserId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    }

    // Update the course
    const updatePayload = buildCourseUpdatePayload(req.body);
    const { data: updatedCourse, error: updateError } = await supabaseAdmin
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Course update error:', updateError);
      return res.status(500).json({
        error: 'Failed to update course',
        message: updateError.message
      });
    }

    // Reconcile instructor credits: resolve/sync every entry, keep the
    // first as primary/owner, diff course_instructors against the new set.
    const instructors = req.body.instructors as InstructorInput[] | undefined;
    if (currentUserRole === 'admin' && instructors && instructors.length > 0) {
      const resolved = await resolveCourseInstructors(supabaseAdmin, instructors, currentUserId);

      const newPrimaryId = resolved[0].userId;
      if (newPrimaryId !== course.instructor_id) {
        const { error } = await supabaseAdmin
          .from('courses')
          .update({ instructor_id: newPrimaryId })
          .eq('id', id);
        if (error) console.error('Error updating primary instructor:', error);
      }

      await reconcileCourseInstructors(supabaseAdmin, id, resolved);
    }

    // Track admin edits
    if (currentUserRole === 'admin') {
      const { error } = await supabaseAdmin
        .from('courses')
        .update({
          last_edited_by_admin_id: currentUserId,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) console.error('Error tracking admin edit:', error);
    }

    return res.json(updatedCourse);

  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
