import { Router } from "express";
import type { Request, Response } from "express";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireInstructor } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";
import { supabaseAdmin } from "../storage";
import { getZoomService } from "../services/zoom";
import { z } from "zod";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']).default('lecture'),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  timezone: z.string().default('UTC'),
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
    }

    if (!include_past || include_past === 'false') {
      query = query.gte('scheduled_end', new Date().toISOString());
    }

    if (userRole === 'instructor') {
      query = query.or(`instructor_id.eq.${userId},is_public.eq.true`);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch sessions' });
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

    res.json(sessions || []);
  })
);

router.get(
  "/:id",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;

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

    const { data: userRegistration } = await supabaseAdmin
      .from('session_participants')
      .select('*')
      .eq('session_id', id)
      .eq('user_id', userId)
      .single();

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
    
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid input', 
        errors: validation.error.errors 
      });
    }

    const sessionData = validation.data;

    const start = new Date(sessionData.scheduled_start);
    const end = new Date(sessionData.scheduled_end);
    
    if (end <= start) {
      return res.status(400).json({ message: 'Session end time must be after start time' });
    }

    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    if (durationMinutes > 240) {
      return res.status(400).json({ message: 'Session duration cannot exceed 4 hours' });
    }

    const zoomService = getZoomService();
    if (!zoomService) {
      return res.status(503).json({ 
        message: 'Live sessions feature is not configured. Please contact administrator.' 
      });
    }

    try {
      const { data: instructor } = await supabaseAdmin
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (!instructor) {
        return res.status(404).json({ message: 'Instructor not found' });
      }

      const startDate = new Date(sessionData.scheduled_start);
      const zoomStartTime = startDate.toISOString().slice(0, 19);
      
      const zoomMeeting = await zoomService.createMeeting(instructor.email, {
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
          waiting_room: true,
          approval_type: 0,
          audio: 'both',
          auto_recording: 'cloud',
          watermark: false,
          use_pmi: false,
          registration_type: 1,
          meeting_authentication: false,
        },
      });

      const { data: newSession, error: insertError } = await supabaseAdmin
        .from('live_sessions')
        .insert({
          title: sessionData.title,
          description: sessionData.description,
          session_type: sessionData.session_type,
          scheduled_start: sessionData.scheduled_start,
          scheduled_end: sessionData.scheduled_end,
          timezone: sessionData.timezone,
          instructor_id: userId,
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
        console.error('Database insert error:', insertError);
        await zoomService.deleteMeeting(zoomMeeting.id, false);
        return res.status(500).json({ message: 'Failed to create session' });
      }

      res.status(201).json(newSession);
    } catch (error: any) {
      console.error('Error creating session:', error);
      res.status(500).json({ 
        message: 'Failed to create Zoom meeting', 
        error: error.message 
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
            zoomUpdateData.start_time = startDate.toISOString().slice(0, 19);
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

router.post(
  "/:id/register",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    const { data: session } = await supabaseAdmin
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
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
