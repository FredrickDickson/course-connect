import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../server/storage';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid session ID' });
  }

  try {
    if (req.method === 'POST') {
      return await handleRegister(req, res, user, id);
    } else if (req.method === 'DELETE') {
      return await handleUnregister(req, res, user, id);
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

async function handleRegister(req: VercelRequest, res: VercelResponse, user: any, id: string) {
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
    if (session.course_id) {
      // Check if user is enrolled in the course
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', session.course_id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ message: 'You must be enrolled in the course to register for this session' });
      }
    } else {
      // Not public, not linked to course, and not the instructor
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

  return res.status(201).json(registration);
}

async function handleUnregister(req: VercelRequest, res: VercelResponse, user: any, id: string) {
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
