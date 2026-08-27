import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
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
    if (req.method === 'POST') {
      return await handleRegister(req, res, user, id, supabaseAdmin);
    } else if (req.method === 'DELETE') {
      return await handleUnregister(req, res, user, id, supabaseAdmin);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse, user: any, id: string, supabaseAdmin: SupabaseClient) {
  const userId = user.id;
  const userRole = user.role;

  const { data: session } = await supabaseAdmin
    .from('live_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  // Check access permissions for course-linked sessions
  if (userRole !== 'admin' && session.instructor_id !== userId && !session.is_public) {
    const enrolled = session.course_id ? await isEnrolled(supabaseAdmin, userId, session.course_id) : false;
    if (!enrolled) {
      return res.status(403).json({ message: 'Access denied to this session' });
    }
  }

  if (session.status === 'cancelled' || session.status === 'completed') {
    return res.status(400).json({ message: 'Cannot register for this session' });
  }

  const sessionIds = session.recurrence_group_id
    ? (await supabaseAdmin
        .from('live_sessions')
        .select('id')
        .eq('recurrence_group_id', session.recurrence_group_id)).data?.map((item: any) => item.id) || [id]
    : [id];

  const { data: existingRegistrations } = await supabaseAdmin
    .from('session_participants')
    .select('session_id, registration_status')
    .in('session_id', sessionIds)
    .eq('user_id', userId)
    .in('registration_status', ['registered', 'attended']);

  const registeredSessionIds = new Set(existingRegistrations?.map((registration) => registration.session_id));
  const missingSessionIds = sessionIds.filter((sessionId: string) => !registeredSessionIds.has(sessionId));

  if (missingSessionIds.length === 0) {
    return res.status(200).json(existingRegistrations?.[0] || null);
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

  const { data: registrations, error } = await supabaseAdmin
    .from('session_participants')
    .insert(missingSessionIds.map((sessionId: string) => ({
      session_id: sessionId,
      user_id: userId,
      registration_status: 'registered',
    })))
    .select();

  if (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Failed to register for session' });
  }

  return res.status(201).json(registrations?.[0] || null);
}

async function handleUnregister(req: VercelRequest, res: VercelResponse, user: any, id: string, supabaseAdmin: SupabaseClient) {
  const userId = user.id;

  const { error } = await supabaseAdmin
    .from('session_participants')
    .delete()
    .eq('session_id', id)
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ message: 'Failed to unregister from session' });
  }

  return res.json({ message: 'Unregistered successfully' });
}
