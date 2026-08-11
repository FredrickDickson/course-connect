/**
 * Admin Instructor Management Routes
 * Allows admins to manage instructors and create content on their behalf
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../storage';
import { requireSupabaseAuth } from '../../supabaseAuth';
import { requireRole } from '../../middleware/roleProtection';

const router = Router();

// Validation schemas
const createInstructorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const instructorProfileSchema = z.object({
  bio: z.string().optional(),
  title: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  profileImageUrl: z.string().url().optional().or(z.literal('')),
  isVerified: z.boolean().optional(),
});

// Helper to log admin actions
async function logAdminAction(params: {
  adminId: string;
  instructorId: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
}) {
  try {
    const { error } = await supabaseAdmin.from('admin_instructor_actions').insert({
      admin_id: params.adminId,
      instructor_id: params.instructorId,
      action_type: params.actionType,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      details: params.details ? JSON.stringify(params.details) : null,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * POST /api/admin/instructors
 * Create a new instructor account
 */
router.post('/', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user!.id;
    const { firstName, lastName, email, password } = createInstructorSchema.parse(req.body);

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (signUpError || !authData?.user) {
      const message = signUpError?.message || 'Failed to create instructor account';
      const status = /already.*registered|already exists/i.test(message) ? 409 : 400;
      return res.status(status).json({ error: message });
    }

    const { error: insertError } = await supabaseAdmin.from('users').upsert({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'instructor',
      created_by_admin_id: adminId,
    });

    if (insertError) {
      // Roll back the auth user so we don't leave an orphaned account behind
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw insertError;
    }

    await logAdminAction({
      adminId,
      instructorId: authData.user.id,
      actionType: 'CREATE_INSTRUCTOR',
      resourceType: 'USER',
      resourceId: authData.user.id,
      details: { email, firstName, lastName },
    });

    res.status(201).json({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'instructor',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid instructor data', details: error.errors });
    }
    console.error('Error creating instructor:', error);
    res.status(500).json({ error: 'Failed to create instructor' });
  }
});

/**
 * GET /api/admin/instructors
 * List all instructors with their profiles
 */
router.get('/', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

    let query = supabaseAdmin
      .from('users')
      .select('id,email,first_name,middle_name,last_name,role,created_at')
      .eq('role', 'instructor')
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (search) {
      const searchValue = `%${(search as string).trim()}%`;
      query = query.or(
        `first_name.ilike.${searchValue},last_name.ilike.${searchValue},email.ilike.${searchValue}`,
      );
    }

    const { data: instructors, error } = await query;
    if (error) throw error;

    const instructorIds = (instructors || []).map((instructor) => instructor.id);
    const profiles = instructorIds.length
      ? await supabaseAdmin.from('instructor_profiles').select('*').in('user_id', instructorIds)
      : { data: [], error: null };
    if (profiles.error) throw profiles.error;

    const courses = instructorIds.length
      ? await supabaseAdmin
          .from('courses')
          .select('instructor_id,enrollment_count')
          .in('instructor_id', instructorIds)
      : { data: [], error: null };
    if (courses.error) throw courses.error;

    const instructorResults = (instructors || []).map((instructor) => {
      const profile = (profiles.data || []).find((p) => p.user_id === instructor.id) || {};
      const instructorCourses = (courses.data || []).filter(
        (course) => course.instructor_id === instructor.id,
      );

      return {
        ...instructor,
        bio: profile.bio || null,
        title: profile.title || null,
        expertise: profile.expertise || null,
        profile_image_url: profile.profile_image_url || null,
        is_verified: profile.is_verified || false,
        course_count: instructorCourses.length,
        total_students: instructorCourses.reduce(
          (sum, course) => sum + (course.enrollment_count || 0),
          0,
        ),
      };
    });

    res.json({
      instructors: instructorResults,
      total: instructorResults.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

/**
 * GET /api/admin/instructors/:id
 * Get detailed instructor information
 */
router.get('/:id', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: instructor, error: instructorError } = await supabaseAdmin
      .from('users')
      .select('id,email,first_name,middle_name,last_name,role,created_at')
      .eq('id', id)
      .eq('role', 'instructor')
      .single();

    if (instructorError || !instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('instructor_profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    res.json({
      id: instructor.id,
      email: instructor.email,
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      role: instructor.role,
      created_at: instructor.created_at,
      bio: profile?.bio || null,
      title: profile?.title || null,
      expertise: profile?.expertise || null,
      education: profile?.education || null,
      certifications: profile?.certifications || null,
      website_url: profile?.website_url || null,
      linkedin_url: profile?.linkedin_url || null,
      profile_image_url: profile?.profile_image_url || null,
      is_verified: profile?.is_verified || false,
      profile_created_at: profile?.created_at || null,
      profile_updated_at: profile?.updated_at || null,
    });
  } catch (error) {
    console.error('Error fetching instructor:', error);
    res.status(500).json({ error: 'Failed to fetch instructor' });
  }
});

/**
 * PUT /api/admin/instructors/:id/profile
 * Update instructor profile
 */
router.put('/:id/profile', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;
    const profileData = instructorProfileSchema.parse(req.body);

    const { data: instructor, error: instructorError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'instructor')
      .single();

    if (instructorError || !instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('instructor_profiles')
      .upsert({
        user_id: id,
        bio: profileData.bio || null,
        title: profileData.title || null,
        expertise: profileData.expertise || null,
        education: profileData.education || null,
        certifications: profileData.certifications || null,
        website_url: profileData.websiteUrl || null,
        linkedin_url: profileData.linkedinUrl || null,
        profile_image_url: profileData.profileImageUrl || null,
        is_verified: profileData.isVerified !== undefined ? profileData.isVerified : null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError || !updatedProfile) {
      throw updateError || new Error('Failed to update instructor profile');
    }

    await logAdminAction({
      adminId,
      instructorId: id,
      actionType: 'UPDATE_PROFILE',
      resourceType: 'INSTRUCTOR_PROFILE',
      resourceId: id,
      details: profileData,
    });

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid profile data', details: error.errors });
    }
    console.error('Error updating instructor profile:', error);
    res.status(500).json({ error: 'Failed to update instructor profile' });
  }
});

/**
 * GET /api/admin/instructors/:id/courses
 * Get all courses for an instructor
 */
router.get('/:id/courses', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('*, category:categories(name)')
      .eq('instructor_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const adminIds = Array.from(
      new Set(
        (courses || [])
          .map((course) => course.created_by_admin_id)
          .filter((adminId) => !!adminId),
      ),
    );

    const adminsResult = adminIds.length
      ? await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name')
          .in('id', adminIds)
      : { data: [] as any[], error: null };
    const { data: admins, error: adminQueryError } = adminsResult;
    if (adminQueryError) throw adminQueryError;

    const adminById = (admins || []).reduce((map, admin) => {
      map[admin.id] = `${admin.first_name || ''} ${admin.last_name || ''}`.trim();
      return map;
    }, {} as Record<string, string>);

    const result = (courses || []).map((course) => ({
      ...course,
      created_by_admin_name: course.created_by_admin_id
        ? adminById[course.created_by_admin_id] || null
        : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching instructor courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/admin/instructors/:id/actions
 * Get admin action audit log for an instructor
 */
router.get('/:id/actions', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 50);
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

    const { data: actions, error } = await supabaseAdmin
      .from('admin_instructor_actions')
      .select('*')
      .eq('instructor_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const adminIds = Array.from(
      new Set((actions || []).map((action) => action.admin_id).filter(Boolean)),
    );

    const adminsResult = adminIds.length
      ? await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name')
          .in('id', adminIds)
      : { data: [] as any[], error: null };
    const { data: admins, error: adminQueryError } = adminsResult;
    if (adminQueryError) throw adminQueryError;

    const adminById = (admins || []).reduce((map, admin) => {
      map[admin.id] = `${admin.first_name || ''} ${admin.last_name || ''}`.trim();
      return map;
    }, {} as Record<string, string>);

    const result = (actions || []).map((action) => ({
      ...action,
      admin_name: action.admin_id
        ? adminById[action.admin_id] || null
        : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    res.status(500).json({ error: 'Failed to fetch admin actions' });
  }
});

export default router;
