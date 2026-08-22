/**
 * AI Tutor Single Conversation API
 * GET /api/ai-tutor/conversation/:id - Get conversation with messages
 * DELETE /api/ai-tutor/conversation/:id - Delete conversation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'DELETE') {
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

    const conversationId = req.query.id as string;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabase
      .from('ai_tutor_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.method === 'DELETE') {
      // Delete conversation (messages will cascade)
      const { error: deleteError } = await supabase
        .from('ai_tutor_conversations')
        .delete()
        .eq('id', conversationId);

      if (deleteError) {
        throw deleteError;
      }

      return res.status(200).json({ success: true, message: 'Conversation deleted' });
    }

    // GET: Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('ai_tutor_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return res.status(200).json({
      conversation,
      messages: messages || []
    });

  } catch (error: any) {
    console.error('Error handling conversation:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
