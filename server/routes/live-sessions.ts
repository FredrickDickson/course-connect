import { Router } from "express";
import type { Request, Response } from "express";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireInstructor } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";
import { storage, supabaseAdmin } from "../storage";
import { getZoomService } from "../services/zoom";
import { formatInTimeZone } from "@shared/timezone";
import { z } from "zod";
import multer from "multer";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();
const sessionResourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']).default('lecture'),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  timezone: z.string().default('UTC'),
  instructor_id: z.string().uuid().optional(), // Allow admin to specify instructor
  course_id: z.string().uuid().optional(),
  is_public: z.boolean().default(false),
  max_participants: z.number().int().positive().max(1000).optional(),
  meeting_password: z.string().min(6).max(10).optional(),
});

const updateSessionSchema = createSessionSchema.partial();

router.get(
  "/",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const userRole = req.user.role;
    
    const { 
      course_id, 
      status, 
      upcoming, 
      past,
      include_past,
      session_type 
    } = req.query;

    let query = supabaseAdmin
      .from('live_sessions')
      .select(`
        *,
        instructor:users!live_sessions_instructor_id_fkey(id, first_name, last_name, profile_image_url),
        course:courses(id, title, thumbnail_url),
        participant_count:session_participants(count)
      `)
      .order('scheduled_start', { ascending: true });

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (session_type) {
      query = query.eq('session_type', session_type);
    }

    if (upcoming === 'true') {
      // Show sessions that haven't ended yet (includes scheduled AND in-progress sessions)
      query = query.gte('scheduled_end', new Date().toISOString());
    } else if (past === 'true') {
      // Keep every ended session in history until it is explicitly deleted.
      query = query.lt('scheduled_end', new Date().toISOString());
    } else if (!include_past || include_past === 'false') {
      query = query.gte('scheduled_end', new Date().toISOString());
    }

    if (userRole === 'instructor') {
      query = query.or(`instructor_id.eq.${userId},is_public.eq.true`);
    }

    let { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch sessions' });
    }

    if (sessions && userRole !== 'admin' && userRole !== 'instructor') {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('course_id')
        .eq('user_id', userId);

      const enrolledCourseIds = new Set((enrollments || []).map((e) => e.course_id));

      sessions = sessions.filter((session: any) =>
        session.is_public ||
        session.instructor_id === userId ||
        (session.course_id && enrolledCourseIds.has(session.course_id))
      );
    }

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: registrations } = await supabaseAdmin
        .from('session_participants')
        .select('session_id, registration_status')
        .eq('user_id', userId)
        .in('session_id', sessionIds);

      const registrationMap = new Map(
        registrations?.map(r => [r.session_id, r.registration_status])
      );

      sessions.forEach((session: any) => {
        session.user_registered = registrationMap.has(session.id);
        session.user_registration_status = registrationMap.get(session.id) || null;
      });
    }

    (sessions || []).forEach((session: any) => {
      if (userRole !== 'admin' && session.instructor_id !== userId) {
        delete session.zoom_start_url;
      }
    });

    res.json(sessions || []);
  })
);

router.get(
  "/:id",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const userRole = req.user.role;

    const { data: session, error } = await supabaseAdmin
      .from('live_sessions')
      .select(`
        *,
        instructor:users!live_sessions_instructor_id_fkey(id, first_name, last_name, email, profile_image_url),
        course:courses(id, title, thumbnail_url, description),
        participants:session_participants(
          id, user_id, registered_at, registration_status, joined_at, left_at,
          user:users(id, first_name, last_name, profile_image_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (userRole !== 'admin' && session.instructor_id !== userId && !session.is_public) {
      const enrollment = session.course_id
        ? await storage.getEnrollment(userId, session.course_id)
        : undefined;
      if (!enrollment) {
        return res.status(403).json({ message: 'Access denied to this session' });
      }
    }

    const { data: userRegistration } = await supabaseAdmin
      .from('session_participants')
      .select('*')
      .eq('session_id', id)
      .eq('user_id', userId)
      .single();

    if (userRole !== 'admin' && session.instructor_id !== userId) {
      delete (session as any).zoom_start_url;
    }

    res.json({
      ...session,
      user_registered: !!userRegistration,
      user_registration: userRegistration,
    });
  })
);

router.post(
  "/",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const userRole = req.user.role;
    
    console.log('🚀 === SESSION CREATE REQUEST STARTED ===');
    console.log('👤 User:', { id: userId, role: userRole });
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return res.status(400).json({ 
        message: 'Invalid input', 
        errors: validation.error.errors 
      });
    }

    const sessionData = validation.data;
    console.log('✅ Validation passed:', sessionData);

    const start = new Date(sessionData.scheduled_start);
    const end = new Date(sessionData.scheduled_end);
    
    if (end <= start) {
      console.error('❌ End time before start time');
      return res.status(400).json({ message: 'Session end time must be after start time' });
    }

    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    console.log(`⏱️ Session duration: ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(2)} hours)`);

    // Use provided instructor_id if admin specified one, otherwise use current user
    const instructorId = sessionData.instructor_id || userId;
    console.log('👨‍🏫 Instructor ID:', instructorId, sessionData.instructor_id ? '(specified by admin)' : '(current user)');

    if (sessionData.course_id && userRole !== 'admin') {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('instructor_id')
        .eq('id', sessionData.course_id)
        .single();

      if (!course || course.instructor_id !== userId) {
        return res.status(403).json({ message: 'You can only schedule sessions for courses you teach' });
      }
    }

    console.log('📍 Step 1: Getting Zoom service...');
    const zoomService = getZoomService();
    if (!zoomService) {
      console.error('❌ Zoom service not initialized');
      return res.status(503).json({ 
        message: 'Live sessions feature is not configured. Please contact administrator.' 
      });
    }
    console.log('✅ Step 1: Zoom service obtained');

    try {
      console.log('📍 Step 2: Fetching instructor data for userId:', userId);
      const { data: instructor, error: instructorError } = await supabaseAdmin
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (instructorError) {
        console.error('❌ Step 2 failed - Instructor query error:', instructorError);
        return res.status(500).json({ message: 'Failed to fetch instructor data', error: instructorError.message });
      }

      if (!instructor) {
        console.error('❌ Step 2 failed - Instructor not found');
        return res.status(404).json({ message: 'Instructor not found' });
      }
      console.log('✅ Step 2: Instructor data fetched:', instructor.email);

      console.log('📍 Step 3: Preparing Zoom meeting data...');
      const startDate = new Date(sessionData.scheduled_start);
      // Zoom requires start_time to be the LOCAL wall-clock time in the
      // meeting's `timezone` field, not UTC — format it in that zone rather
      // than stripping the "Z" off a UTC ISO string (which mislabels UTC
      // clock digits as zone-local whenever the zone isn't UTC itself).
      const zoomStartTime = formatInTimeZone(startDate, sessionData.timezone, "yyyy-MM-dd'T'HH:mm:ss");

      console.log('Zoom meeting parameters:', {
        topic: sessionData.title,
        start_time: zoomStartTime,
        duration_minutes: durationMinutes,
        timezone: sessionData.timezone,
      });

      console.log('📍 Step 4: Creating Zoom meeting...');
      const zoomMeeting = await zoomService.createMeeting('me', {
        topic: sessionData.title,
        type: 2,
        start_time: zoomStartTime,
        duration: durationMinutes,
        timezone: sessionData.timezone,
        password: sessionData.meeting_password,
        agenda: sessionData.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: false,
          approval_type: 2,
          audio: 'both',
          auto_recording: 'cloud',
          watermark: false,
          use_pmi: false,
          registration_type: 0,
          meeting_authentication: false,
        },
      });
      console.log('✅ Step 4: Zoom meeting created:', zoomMeeting.id);

      console.log('📍 Step 5: Inserting session into database...');
      const { data: newSession, error: insertError } = await supabaseAdmin
        .from('live_sessions')
        .insert({
          title: sessionData.title,
          description: sessionData.description,
          session_type: sessionData.session_type,
          scheduled_start: sessionData.scheduled_start,
          scheduled_end: sessionData.scheduled_end,
          timezone: sessionData.timezone,
          instructor_id: instructorId, // Use the determined instructor ID
          course_id: sessionData.course_id,
          is_public: sessionData.is_public,
          max_participants: sessionData.max_participants,
          zoom_meeting_id: zoomMeeting.id,
          zoom_meeting_password: zoomMeeting.password,
          zoom_join_url: zoomMeeting.join_url,
          zoom_start_url: zoomMeeting.start_url,
          status: 'scheduled',
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Step 5 failed - Database insert error:', insertError);
        console.log('Attempting to cleanup Zoom meeting...');
        try {
          await zoomService.deleteMeeting(zoomMeeting.id, false);
          console.log('✅ Zoom meeting cleaned up');
        } catch (cleanupError) {
          console.error('Failed to cleanup Zoom meeting:', cleanupError);
        }
        return res.status(500).json({ message: 'Failed to create session', error: insertError.message });
      }

      console.log('✅ Step 5: Session created successfully:', newSession.id);
      console.log('🎉 All steps completed successfully!');
      res.status(201).json(newSession);
    } catch (error: any) {
      console.error('❌ FATAL ERROR in session creation:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'Failed to create live session', 
        error: error.message,
        details: error.response?.data || 'No additional details'
      });
    }
  })
);

router.patch(
  "/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const userRole = req.user.role;

    const validation = updateSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid input', 
        errors: validation.error.errors 
      });
    }

    const { data: existingSession } = await supabaseAdmin
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (userRole !== 'admin' && existingSession.instructor_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this session' });
    }

    if (existingSession.status === 'completed' || existingSession.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update completed or cancelled sessions' });
    }

    const updateData = validation.data;

    if (updateData.scheduled_start || updateData.scheduled_end || updateData.title || updateData.description) {
      const zoomService = getZoomService();
      if (zoomService && existingSession.zoom_meeting_id) {
        try {
          const zoomUpdateData: any = {};
          
          if (updateData.title) zoomUpdateData.topic = updateData.title;
          if (updateData.description) zoomUpdateData.agenda = updateData.description;
          if (updateData.scheduled_start) {
            const startDate = new Date(updateData.scheduled_start);
            const zone = updateData.timezone || existingSession.timezone || 'UTC';
            zoomUpdateData.start_time = formatInTimeZone(startDate, zone, "yyyy-MM-dd'T'HH:mm:ss");
          }
          if (updateData.timezone) {
            zoomUpdateData.timezone = updateData.timezone;
          }
          if (updateData.scheduled_start || updateData.scheduled_end) {
            const start = new Date(updateData.scheduled_start || existingSession.scheduled_start);
            const end = new Date(updateData.scheduled_end || existingSession.scheduled_end);
            zoomUpdateData.duration = Math.floor((end.getTime() - start.getTime()) / 60000);
          }

          await zoomService.updateMeeting(existingSession.zoom_meeting_id, zoomUpdateData);
        } catch (error) {
          console.error('Failed to update Zoom meeting:', error);
        }
      }
    }

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('live_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update session' });
    }

    res.json(updatedSession);
  })
);

router.delete(
  "/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const userRole = req.user.role;

    const { data: session } = await supabaseAdmin
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (userRole !== 'admin' && session.instructor_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this session' });
    }

    if (session.zoom_meeting_id) {
      const zoomService = getZoomService();
      if (zoomService) {
        try {
          await zoomService.deleteMeeting(session.zoom_meeting_id, true);
        } catch (error) {
          console.error('Failed to delete Zoom meeting:', error);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('live_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Failed to cancel session' });
    }

    res.json({ message: 'Session cancelled successfully' });
  })
);

router.get(
  "/:id/assignments",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  })
);

router.post(
  "/:id/assignments",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .insert({
        session_id: req.params.id,
        title: req.body.title,
        description: req.body.description || '',
        instructions: req.body.instructions,
        due_date: req.body.due_date || null,
        max_score: req.body.max_score || 100,
        allow_late_submission: req.body.allow_late_submission ?? true,
        is_required: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Session assignment insert failed:', error);
      return res.status(500).json({ message: `Assignment save failed: ${error.message}` });
    }
    res.status(201).json(data);
  })
);

router.get(
  "/:id/resources",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  })
);

router.post(
  "/:id/resources",
  requireSupabaseAuth,
  requireInstructor(),
  sessionResourceUpload.single('resource'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileName = `${req.params.id}/${Date.now()}-${req.file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('session-resources')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Session resource storage upload failed:', uploadError);
      return res.status(500).json({ message: `Storage upload failed: ${uploadError.message}` });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('session-resources')
      .getPublicUrl(fileName);
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .insert({
        session_id: req.params.id,
        title: req.body.title || req.file.originalname,
        file_name: req.file.originalname,
        file_url: urlData.publicUrl,
        file_type: req.file.mimetype || 'application/octet-stream',
        file_size: req.file.size,
        download_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Session resource metadata insert failed:', error);
      await supabaseAdmin.storage.from('session-resources').remove([fileName]);
      return res.status(500).json({ message: `Resource metadata save failed: ${error.message}` });
    }

    res.status(201).json(data);
  })
);

router.post(
  "/:id/register",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const userRole = req.user.role;

    const { data: session } = await supabaseAdmin
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (userRole !== 'admin' && session.instructor_id !== userId && !session.is_public) {
      const enrollment = session.course_id
        ? await storage.getEnrollment(userId, session.course_id)
        : undefined;
      if (!enrollment) {
        return res.status(403).json({ message: 'Access denied to this session' });
      }
    }

    if (session.status === 'cancelled' || session.status === 'completed') {
      return res.status(400).json({ message: 'Cannot register for this session' });
    }

    const { data: existing } = await supabaseAdmin
      .from('session_participants')
      .select('*')
      .eq('session_id', id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ message: 'Already registered for this session' });
    }

    if (session.max_participants) {
      const { count } = await supabaseAdmin
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', id)
        .eq('registration_status', 'registered');

      if (count && count >= session.max_participants) {
        return res.status(400).json({ message: 'Session is full' });
      }
    }

    const { data: registration, error } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: id,
        user_id: userId,
        registration_status: 'registered',
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ message: 'Failed to register for session' });
    }

    res.status(201).json(registration);
  })
);

router.delete(
  "/:id/register",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    const { error } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .eq('session_id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ message: 'Failed to unregister from session' });
    }

    res.json({ message: 'Unregistered successfully' });
  })
);

router.get(
  "/:id/participants",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const userRole = req.user.role;

    if (userRole === 'instructor') {
      const { data: session } = await supabaseAdmin
        .from('live_sessions')
        .select('instructor_id')
        .eq('id', id)
        .single();

      if (!session || session.instructor_id !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const { data: participants, error } = await supabaseAdmin
      .from('session_participants')
      .select(`
        *,
        user:users(id, first_name, last_name, email, profile_image_url)
      `)
      .eq('session_id', id)
      .order('registered_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch participants' });
    }

    res.json(participants || []);
  })
);

export default router;
