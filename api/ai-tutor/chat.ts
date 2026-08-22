/**
 * AI Tutor Chat API Endpoint
 * POST /api/ai-tutor/chat
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { chat, type ChatRequest, type LessonContext } from '../../server/services/ai-tutor';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify auth
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

    // Parse request body
    const { message, conversationId, lessonContext } = req.body as {
      message: string;
      conversationId?: string;
      lessonContext: LessonContext;
    };

    if (!message || !lessonContext) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Rate limiting: Check user's message count in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentMessageCount } = await supabase
      .from('ai_tutor_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId || '')
      .gte('created_at', oneHourAgo);

    if (recentMessageCount && recentMessageCount > 50) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 3600 
      });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('ai_tutor_conversations')
        .insert({
          user_id: user.id,
          course_id: lessonContext.courseId,
          lesson_id: lessonContext.lessonId,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      convId = newConv.id;
    }

    // Get conversation history (last 10 messages)
    const { data: messageHistory } = await supabase
      .from('ai_tutor_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Save user message
    await supabase.from('ai_tutor_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
      lesson_context: lessonContext,
    });

    // Call AI service
    const chatRequest: ChatRequest = {
      message,
      conversationHistory: messageHistory || [],
      lessonContext,
      userId: user.id,
    };

    const aiResponse = await chat(chatRequest);

    // Save AI response
    await supabase.from('ai_tutor_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: aiResponse.message,
      lesson_context: lessonContext,
      tokens_used: aiResponse.tokensUsed,
      model: aiResponse.model,
    });

    // Return response
    return res.status(200).json({
      message: aiResponse.message,
      conversationId: convId,
      suggestions: aiResponse.suggestions,
      tokensUsed: aiResponse.tokensUsed,
    });

  } catch (error: any) {
    console.error('AI Tutor Chat Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process request' 
    });
  }
}
