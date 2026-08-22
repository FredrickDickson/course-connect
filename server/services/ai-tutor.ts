/**
 * CIMA AI Tutor Service
 * Handles AI interactions using DeepSeek API (OpenAI-compatible)
 */

import OpenAI from 'openai';

// Initialize DeepSeek client (uses OpenAI SDK with custom baseURL)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '2000');
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');

// System prompt for Michael Smith - CIMA AI Tutor
const CIMA_TUTOR_SYSTEM_PROMPT = `You are Michael Smith, an expert ADR (Alternative Dispute Resolution) instructor and learning assistant at CIMA Learn.

Your role is to be a comprehensive learning partner - not just answering questions, but actively supporting students through their entire learning journey.

Your Capabilities:
1. **Teaching & Lecturing**: Explain complex ADR concepts clearly, break down difficult topics, use real-world examples
2. **Assignment Grading**: Review and grade student assignments, provide detailed feedback with specific improvements
3. **Quiz Assistance**: Help students understand quiz questions, explain correct/incorrect answers, provide practice questions
4. **Content Simplification**: Make complex legal concepts accessible to students at all levels
5. **Practical Application**: Show how theoretical concepts apply in real arbitration and mediation scenarios
6. **Exam Preparation**: Create practice questions, conduct mock assessments, identify knowledge gaps
7. **Writing Support**: Help draft clauses, review legal documents, improve writing quality
8. **Research Assistance**: Explain case law, reference major institutions (ICC, LCIA, UNCITRAL, SIAC, HKIAC)
9. **Career Guidance**: Advise on professional development in ADR careers
10. **Administrative Support**: Answer questions about courses, certificates, requirements, and deadlines

Your Teaching Philosophy:
- Patient and encouraging - every question is valid
- Adaptive - adjust explanations based on student's level (Associate/Member/Fellow)
- Practical - always connect theory to real-world practice
- Comprehensive - go beyond surface-level answers when students need depth
- Supportive - celebrate progress and provide constructive feedback

When Grading Assignments:
- Use a clear rubric: Content (40%), Analysis (30%), Structure (20%), Writing Quality (10%)
- Provide specific feedback on what's good and what needs improvement
- Suggest concrete revisions
- Grade on a scale of 0-100 with letter grades (A, B, C, D, F)
- Be fair but rigorous - maintain academic standards

When Helping with Quizzes:
- Don't give direct answers - guide students to understand
- Explain why correct answers are right and why others are wrong
- Provide additional practice questions on weak areas
- Build confidence through understanding, not memorization

When Acting as a Lecturer:
- Structure explanations with clear introductions, main points, and conclusions
- Use the Socratic method - ask guiding questions
- Provide real case examples from international arbitration/mediation
- Check for understanding before moving forward

Your Personality:
- Professional yet approachable
- Enthusiastic about ADR and student success
- Patient with beginners, rigorous with advanced students
- Use clear, accessible language (avoid unnecessary jargon)
- Occasionally use relevant analogies to explain complex concepts

Important Guidelines:
- Always be honest - if you don't know something, say so
- Encourage students to think critically, not just memorize
- Reference authoritative sources when discussing law/procedure
- Maintain academic integrity - guide learning, don't do the work for students
- Be culturally sensitive - ADR is practiced globally
- Keep responses focused and actionable

Remember: You're not just a chatbot - you're a dedicated instructor whose goal is student success and mastery of ADR practice.`;

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LessonContext {
  courseId: string;
  courseName: string;
  courseLevel: 'associate' | 'member' | 'fellow' | string;
  courseTrack: 'ARBITRATION' | 'MEDIATION' | string;
  lessonId: string;
  lessonTitle: string;
  lessonType: 'video' | 'article' | 'quiz' | 'presentation' | 'assignment';
  lessonContent?: string;  // Lesson text content (for articles)
  lessonDescription?: string;  // Lesson description
}

export interface ChatRequest {
  message: string;
  conversationHistory: Message[];
  lessonContext: LessonContext;
  userId: string;
}

export interface ChatResponse {
  message: string;
  tokensUsed: number;
  model: string;
  suggestions?: string[];
}

/**
 * Build the system prompt with lesson context
 */
function buildSystemPrompt(context: LessonContext): string {
  const contextInfo = `
Current Context:
- Course: ${context.courseName}
- Level: ${context.courseLevel.toUpperCase()}
- Track: ${context.courseTrack}
- Lesson: ${context.lessonTitle}
- Lesson Type: ${context.lessonType}
${context.lessonDescription ? `- Lesson Description: ${context.lessonDescription}` : ''}
${context.lessonContent ? `\n- Lesson Content:\n${context.lessonContent.substring(0, 2000)}${context.lessonContent.length > 2000 ? '...' : ''}` : ''}
`;

  return CIMA_TUTOR_SYSTEM_PROMPT + '\n\n' + contextInfo;
}

/**
 * Generate contextual suggestions based on lesson type and content
 */
export function generateSuggestions(context: LessonContext): string[] {
  const { lessonType, lessonTitle, lessonContent } = context;
  
  // Check lesson content for keywords
  const content = (lessonTitle + ' ' + (lessonContent || '')).toLowerCase();
  
  // Arbitration-specific suggestions
  if (content.includes('arbitration agreement') || content.includes('arbitration clause')) {
    return [
      "Explain the key elements of an arbitration agreement",
      "Show me a sample arbitration clause",
      "What makes an arbitration clause pathological?",
      "Help me draft a basic arbitration clause"
    ];
  }
  
  if (content.includes('jurisdiction') || content.includes('competence')) {
    return [
      "Explain kompetenz-kompetenz",
      "When can an arbitrator decide on jurisdiction?",
      "What is the seat vs venue distinction?",
      "How do I challenge jurisdiction?"
    ];
  }
  
  if (content.includes('award') || content.includes('decision')) {
    return [
      "What are the essential elements of an award?",
      "How do I structure an arbitral award?",
      "What makes an award enforceable?",
      "Show me an award template"
    ];
  }
  
  // Mediation-specific suggestions
  if (content.includes('mediation') || content.includes('negotiation')) {
    return [
      "What are the stages of mediation?",
      "How do I prepare for mediation?",
      "What's the mediator's role vs party's role?",
      "Give me a mediation scenario to practice"
    ];
  }
  
  if (content.includes('settlement') || content.includes('agreement')) {
    return [
      "What should a settlement agreement include?",
      "Help me draft a settlement clause",
      "How do I make settlements enforceable?",
      "What are common pitfalls in settlements?"
    ];
  }
  
  // Lesson type-based suggestions
  if (lessonType === 'video') {
    return [
      "Summarize the key points from this lesson",
      "What should I remember most?",
      "Give me a real-world example",
      "Quiz me on this topic"
    ];
  }
  
  if (lessonType === 'article') {
    return [
      "Explain this concept in simpler terms",
      "Give me a practical example",
      "How does this apply in practice?",
      "What are the key takeaways?"
    ];
  }
  
  if (lessonType === 'quiz') {
    return [
      "Help me understand this question",
      "Explain the correct answer",
      "Why are the other options wrong?",
      "Give me similar practice questions"
    ];
  }
  
  // Generic suggestions (fallback)
  return [
    "Explain this in simpler terms",
    "Give me a real-world example",
    "How does this apply in practice?",
    "Quiz me on this topic"
  ];
}

/**
 * Main chat function - sends message to DeepSeek and gets response
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  try {
    // Build messages array for API
    const messages: Message[] = [
      { role: 'system', content: buildSystemPrompt(request.lessonContext) },
      ...request.conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: request.message }
    ];

    // Call DeepSeek API
    const completion = await deepseek.chat.completions.create({
      model: AI_MODEL,
      messages: messages as any,
      max_tokens: AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      stream: false,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Generate contextual suggestions for next questions
    const suggestions = generateSuggestions(request.lessonContext);

    return {
      message: assistantMessage,
      tokensUsed,
      model: AI_MODEL,
      suggestions,
    };
  } catch (error: any) {
    console.error('AI Tutor Error:', error);
    
    // Handle specific errors
    if (error.code === 'insufficient_quota') {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
    
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    
    throw new Error('Failed to get AI response. Please try again.');
  }
}

/**
 * Analyze a draft (clause, submission, award, etc.) and provide feedback
 */
export async function analyzeDraft(
  draft: string,
  draftType: 'arbitration_clause' | 'mediation_agreement' | 'submission' | 'award' | 'other',
  context: LessonContext
): Promise<ChatResponse> {
  const draftTypePrompts = {
    arbitration_clause: 'Analyze this arbitration clause for completeness, clarity, and potential issues. Check for: seat, governing rules, number of arbitrators, language, and any pathological elements.',
    mediation_agreement: 'Analyze this mediation agreement for completeness and clarity. Check for: mediator selection, confidentiality, settlement authority, and timeline.',
    submission: 'Review this legal submission for structure, clarity of arguments, and persuasiveness. Provide specific suggestions for improvement.',
    award: 'Review this arbitral award for completeness and proper structure. Check for: recitals, facts, analysis, decision, costs, and signature block.',
    other: 'Review this draft and provide constructive feedback on clarity, completeness, and professional quality.'
  };

  const prompt = `${draftTypePrompts[draftType] || draftTypePrompts.other}

Draft to analyze:
---
${draft}
---

Provide:
1. Overall assessment (1-5 score)
2. Strengths
3. Issues or gaps
4. Specific improvements
5. Revised version (if applicable)`;

  return chat({
    message: prompt,
    conversationHistory: [],
    lessonContext: context,
    userId: 'draft-analysis'
  });
}

/**
 * Check if AI service is available
 */
export async function healthCheck(): Promise<boolean> {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return false;
    }
    
    // Simple test message
    const completion = await deepseek.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    });
    
    return !!completion.choices[0]?.message;
  } catch (error) {
    console.error('AI Health Check Failed:', error);
    return false;
  }
}
