import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user from auth header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id: sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'Invalid session ID' });
  }

  try {
    if (req.method === 'GET') {
      // Get all assignments for this session
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(assignments || []);
    }

    if (req.method === 'POST') {
      // Create assignment for session
      const { title, description, instructions, due_date, max_score, allow_late_submission } = req.body;

      if (!title || !instructions) {
        return res.status(400).json({ message: 'Title and instructions are required' });
      }

      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          session_id: sessionId,
          title,
          description: description || '',
          instructions,
          due_date: due_date || null,
          max_score: max_score || 100,
          allow_late_submission: allow_late_submission ?? true,
          is_required: false,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(assignment);
    }

    if (req.method === 'DELETE') {
      // Delete all assignments for this session (usually when editing)
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;
      return res.json({ message: 'Assignments deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Session assignments API error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
