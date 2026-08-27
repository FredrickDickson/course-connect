import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { z } from 'zod';
// Imported directly from the npm package (not @shared/timezone) for the same
// reason the Zoom helpers above are inlined: Vercel's bundler doesn't reliably
// trace aliased/relative imports that cross out of api/ into local source dirs.
import { formatInTimeZone } from 'date-fns-tz';
import { randomUUID } from 'node:crypto';
import { addDays } from 'date-fns';

// Zoom REST helpers are inlined here (rather than imported from server/services/zoom)
// because Vercel's serverless function bundler doesn't reliably trace relative imports
// that cross from api/ out into server/ — confirmed via live OPTIONS requests crashing
// at module load for every api/*.ts file that imported from server/services/*.
async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    null,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
}

async function createZoomMeeting(token: string, params: Record<string, any>) {
  const response = await axios.post(
    `https://api.zoom.us/v2/users/me/meetings`,
    params,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

async function deleteZoomMeeting(token: string, meetingId: string) {
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    params: { schedule_for_reminder: false },
    headers: { Authorization: `Bearer ${token}` },
  });
}

const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']).default('lecture'),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  timezone: z.string().default('UTC'),
  instructor_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  is_public: z.boolean().default(false),
  max_participants: z.number().int().positive().max(1000).optional(),
  meeting_password: z.string().min(6).max(10).optional(),
  recurrence_count: z.number().int().min(1).max(365).default(1),
});

async function getUserFromRequest(req: VercelRequest, supabaseAdmin: SupabaseClient) {
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

  // Initialize client inside handler to avoid module-level env var issues
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
    });
    return res.status(500).json({
      message: 'Server configuration error',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const user = await getUserFromRequest(req, supabaseAdmin);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetSessions(req, res, user, supabaseAdmin);
    } else if (req.method === 'POST') {
      return await handleCreateSession(req, res, user, supabaseAdmin);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Sessions API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleGetSessions(req: VercelRequest, res: VercelResponse, user: any, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

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
    query = query.gte('scheduled_end', new Date().toISOString());
  } else if (past === 'true') {
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

  // Filter sessions based on course enrollment for students
  if (sessions && userRole !== 'admin' && userRole !== 'instructor') {
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId);

    const enrolledCourseIds = new Set((enrollments || []).map((e: any) => e.course_id));

    // Filter sessions: show only public sessions, or sessions for courses the user is enrolled in
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

  return res.json(sessions || []);
}

async function handleCreateSession(req: VercelRequest, res: VercelResponse, user: any, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

  // Check if user is instructor or admin
  if (userRole !== 'instructor' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Only instructors can create sessions' });
  }

  // Check Zoom configuration early
  console.log('Checking Zoom configuration...');
  console.log('ZOOM_ACCOUNT_ID:', process.env.ZOOM_ACCOUNT_ID ? 'SET' : 'NOT SET');
  console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? 'SET' : 'NOT SET');

  const validation = createSessionSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Invalid input',
      errors: validation.error.errors
    });
  }

  const sessionData = validation.data;
  const startDate = new Date(sessionData.scheduled_start);
  const endDate = new Date(sessionData.scheduled_end);
  if (endDate <= startDate) {
    return res.status(400).json({ message: 'Session end time must be after session start time' });
  }

  const durationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
  if (sessionData.course_id && userRole !== 'admin') {
    const { data: course } = await supabaseAdmin.from('courses').select('instructor_id').eq('id', sessionData.course_id).single();
    if (!course || course.instructor_id !== userId) {
      return res.status(403).json({ message: 'You can only schedule sessions for courses you teach' });
    }
  }

  let zoomToken: string | null;
  try {
    zoomToken = await getZoomAccessToken();
  } catch (error: any) {
    console.error('Failed to authenticate with Zoom:', error.response?.data || error.message);
    return res.status(503).json({ message: 'Live sessions feature is not configured. Please contact administrator.' });
  }
  if (!zoomToken) {
    return res.status(503).json({ message: 'Live sessions feature is not configured. Please contact administrator.' });
  }

  const recurrenceCount = sessionData.recurrence_count;
  const recurrenceGroupId = recurrenceCount > 1 ? randomUUID() : null;
  const createdSessions: any[] = [];

  try {
    for (let day = 0; day < recurrenceCount; day++) {
      const occurrenceStart = addDays(startDate, day);
      const occurrenceEnd = addDays(endDate, day);
      const zoomMeeting = await createZoomMeeting(zoomToken, {
        topic: recurrenceCount > 1 ? `${sessionData.title} (${day + 1}/${recurrenceCount})` : sessionData.title,
        type: 2,
        start_time: formatInTimeZone(occurrenceStart, sessionData.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
        duration: durationMinutes,
        timezone: sessionData.timezone,
        password: sessionData.meeting_password,
        agenda: sessionData.description,
        settings: { host_video: true, participant_video: true, join_before_host: false, mute_upon_entry: true, waiting_room: false, approval_type: 2, audio: 'both', auto_recording: 'cloud', watermark: false, use_pmi: false, registration_type: 0, meeting_authentication: false },
      });

      const { data: newSession, error: insertError } = await supabaseAdmin.from('live_sessions').insert({
        title: sessionData.title,
        description: sessionData.description,
        session_type: sessionData.session_type,
        scheduled_start: occurrenceStart.toISOString(),
        scheduled_end: occurrenceEnd.toISOString(),
        timezone: sessionData.timezone,
        instructor_id: sessionData.instructor_id || userId,
        course_id: sessionData.course_id,
        is_public: sessionData.is_public,
        max_participants: sessionData.max_participants,
        zoom_meeting_id: zoomMeeting.id,
        zoom_meeting_password: zoomMeeting.password,
        zoom_join_url: zoomMeeting.join_url,
        zoom_start_url: zoomMeeting.start_url,
        status: 'scheduled',
        created_by: userId,
        recurrence_group_id: recurrenceGroupId,
        recurrence_day_number: recurrenceGroupId ? day + 1 : null,
        recurrence_total_days: recurrenceGroupId ? recurrenceCount : null,
      }).select().single();

      if (insertError) {
        await deleteZoomMeeting(zoomToken, zoomMeeting.id);
        return res.status(500).json({ message: `Failed to create session: ${insertError.message}` });
      }
      createdSessions.push(newSession);
    }

    return res.status(201).json({ ...createdSessions[0], recurring_session_ids: createdSessions.map((createdSession) => createdSession.id) });
  } catch (error: any) {
    console.error('Error creating session:', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Failed to create Zoom meeting',
      error: error.message
    });
  }
}
