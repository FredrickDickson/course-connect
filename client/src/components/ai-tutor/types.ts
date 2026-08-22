/**
 * TypeScript types for AI Tutor components
 */

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  tokensUsed?: number;
}

export interface Conversation {
  id: string;
  title?: string | null;
  courseId: string;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface LessonContext {
  courseId: string;
  courseName: string;
  courseLevel: string;
  courseTrack: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: 'video' | 'article' | 'quiz' | 'presentation' | 'assignment';
  lessonContent?: string;
  lessonDescription?: string;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  tokensUsed?: number;
}
