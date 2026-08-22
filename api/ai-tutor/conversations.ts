/**
 * AI Tutor Conversations API
 * GET /api/ai-tutor/conversations - List user's conversations
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { courseId, lessonId } = req.query;

    let query = supabase
      .from('ai_tutor_conversations')
      .select(`
        id,
        title,
        course_id,
        lesson_id,
        created_at,
        updated_at,
        last_message_at
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId as string);
    }

    if (lessonId) {
      query = query.eq('lesson_id', lessonId as string);
    }

    const { data: conversations, error } = await query;

    if (error) {
      throw error;
    }

    return res.status(200).json({ conversations: conversations || [] });

  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}
