import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { z } from 'zod';

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

async function updateZoomMeeting(token: string, meetingId: string, params: Record<string, any>) {
  await axios.patch(`https://api.zoom.us/v2/meetings/${meetingId}`, params, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function deleteZoomMeeting(token: string, meetingId: string) {
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    params: { schedule_for_reminder: true },
    headers: { Authorization: `Bearer ${token}` },
  });
}

const updateSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  timezone: z.string(),
  course_id: z.string().uuid().optional(),
  is_public: z.boolean(),
  max_participants: z.number().int().positive().max(1000).optional(),
}).partial();

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

async function isEnrolled(supabaseAdmin: SupabaseClient, userId: string, courseId: string) {
  const { data } = await supabaseAdmin
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  return !!data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,DELETE,OPTIONS');
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid session ID' });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetSession(req, res, user, id, supabaseAdmin);
    } else if (req.method === 'PATCH') {
      return await handleUpdateSession(req, res, user, id, supabaseAdmin);
    } else if (req.method === 'DELETE') {
      return await handleDeleteSession(req, res, user, id, supabaseAdmin);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Session API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleGetSession(req: VercelRequest, res: VercelResponse, user: any, id: string, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

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
    const enrolled = session.course_id ? await isEnrolled(supabaseAdmin, userId, session.course_id) : false;
    if (!enrolled) {
      return res.status(403).json({ message: 'Access denied to this session' });
    }
  }

  const { data: userRegistration } = await supabaseAdmin
    .from('session_participants')
    .select('*')
    .eq('session_id', id)
    .eq('user_id', userId)
    .single();

  return res.json({
    ...session,
    user_registered: !!userRegistration,
    user_registration: userRegistration,
  });
}

async function handleUpdateSession(req: VercelRequest, res: VercelResponse, user: any, id: string, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

  // Check if user is instructor or admin
  if (userRole !== 'instructor' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Only instructors can update sessions' });
  }

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
    if (existingSession.zoom_meeting_id) {
      try {
        const zoomToken = await getZoomAccessToken();
        if (zoomToken) {
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

          await updateZoomMeeting(zoomToken, existingSession.zoom_meeting_id, zoomUpdateData);
        }
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

  return res.json(updatedSession);
}

async function handleDeleteSession(req: VercelRequest, res: VercelResponse, user: any, id: string, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

  // Check if user is instructor or admin
  if (userRole !== 'instructor' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Only instructors can delete sessions' });
  }

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
    try {
      const zoomToken = await getZoomAccessToken();
      if (zoomToken) {
        await deleteZoomMeeting(zoomToken, session.zoom_meeting_id);
      }
    } catch (error) {
      console.error('Failed to delete Zoom meeting:', error);
    }
  }

  const { error } = await supabaseAdmin
    .from('live_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ message: 'Failed to cancel session' });
  }

  return res.json({ message: 'Session cancelled successfully' });
}
