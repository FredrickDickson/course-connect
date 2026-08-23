import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../server/storage';
import { getZoomService } from '../../server/services/zoom';
import { z } from 'zod';

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

async function getUserFromRequest(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      role: userData?.role || 'student',
      claims: { sub: user.id },
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetSessions(req, res, user);
    } else if (req.method === 'POST') {
      return await handleCreateSession(req, res, user);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Sessions API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

async function handleGetSessions(req: VercelRequest, res: VercelResponse, user: any) {
  const userId = user.id;
  const userRole = user.role;
  
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

  return res.json(sessions || []);
}

async function handleCreateSession(req: VercelRequest, res: VercelResponse, user: any) {
  const userId = user.id;
  const userRole = user.role;

  // Check if user is instructor or admin
  if (userRole !== 'instructor' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Only instructors can create sessions' });
  }
  
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

    return res.status(201).json(newSession);
  } catch (error: any) {
    console.error('Error creating session:', error);
    return res.status(500).json({ 
      message: 'Failed to create Zoom meeting', 
      error: error.message 
    });
  }
}
