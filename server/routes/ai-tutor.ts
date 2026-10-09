/**
 * AI Tutor Routes
 * Express routes for AI Tutor functionality
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { chat, type ChatRequest } from '../services/ai-tutor';
import OpenAI from 'openai';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// Initialize DeepSeek for AI grading
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

/**
 * POST /api/ai-tutor/chat
 * Main chat endpoint
 */
router.post('/chat', async (req, res) => {
  try {
    // Verify auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse request body
    const { message, conversationId, lessonContext } = req.body;

    if (!message || !lessonContext) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Rate limiting: Check user's message count in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentMessageCount } = await supabaseAdmin
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
      const { data: newConv, error: convError } = await supabaseAdmin
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
    const { data: messageHistory } = await supabaseAdmin
      .from('ai_tutor_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Save user message
    await supabaseAdmin.from('ai_tutor_messages').insert({
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
    await supabaseAdmin.from('ai_tutor_messages').insert({
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
});

/**
 * GET /api/ai-tutor/conversations
 * List user's conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: conversations, error } = await supabaseAdmin
      .from('ai_tutor_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ conversations });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * POST /api/ai-tutor/grade-assignment
 * AI grading endpoint for assignments
 */
router.post('/grade-assignment', async (req, res) => {
  try {
    // Verify auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { submissionId, response, assignmentTitle, assignmentInstructions, maxScore } = req.body;

    if (!submissionId || !response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call AI grading service
    const gradingPrompt = `You are Michael Smith, a CIMA ADR instructor. Grade this student's assignment response.

Assignment: ${assignmentTitle}
Instructions: ${assignmentInstructions}
Max Score: ${maxScore}

Student Response:
${response}

Provide:
1. A numerical score (0-${maxScore})
2. Detailed feedback explaining the grade
3. Specific strengths and areas for improvement
4. Suggestions for how to improve

Be fair, constructive, and encouraging. Focus on content quality, understanding of concepts, and practical application.

Return ONLY a JSON object with this exact format:
{
  "score": <number>,
  "passed": <boolean>,
  "feedback": "<detailed feedback string>"
}`;

    const completion = await deepseek.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert ADR instructor grading student assignments. Always return valid JSON.' },
        { role: 'user', content: gradingPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Parse AI response
    let gradingResult;
    try {
      gradingResult = JSON.parse(aiResponse);
    } catch (e) {
      // If AI didn't return valid JSON, extract score and feedback manually
      const scoreMatch = aiResponse.match(/score["\s:]+(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(maxScore * 0.7);
      
      gradingResult = {
        score,
        passed: score >= (maxScore * 0.7),
        feedback: aiResponse.substring(0, 1000),
      };
    }

    return res.status(200).json({
      submissionId,
      score: gradingResult.score,
      passed: gradingResult.passed,
      feedback: gradingResult.feedback,
      gradedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('AI Assignment Grading Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to grade assignment' 
    });
  }
});

export default router;
