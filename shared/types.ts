/**
 * Domain-specific types derived from the database schema
 * 
 * Re-exports Supabase database types as camelCase domain types for use throughout the app.
 */

import { Database } from './database.types';

// Core entity types (Row types from database)
export type User = Database['public']['Tables']['users']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Enrollment = Database['public']['Tables']['enrollments']['Row'];
export type Quiz = Database['public']['Tables']['quizzes']['Row'];
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row'];
export type QuizAnswer = Database['public']['Tables']['quiz_answers']['Row'];
export type QuizAttempt = Database['public']['Tables']['quiz_attempts']['Row'];
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type AssignmentSubmission = Database['public']['Tables']['assignment_submissions']['Row'];
export type InstructorApplication = Database['public']['Tables']['instructor_applications']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];

// Insert types for creating new records
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertCourse = Database['public']['Tables']['courses']['Insert'];
export type InsertEnrollment = Database['public']['Tables']['enrollments']['Insert'];
export type InsertQuiz = Database['public']['Tables']['quizzes']['Insert'];
export type InsertQuizQuestion = Database['public']['Tables']['quiz_questions']['Insert'];
export type InsertQuizAnswer = Database['public']['Tables']['quiz_answers']['Insert'];
export type InsertQuizAttempt = Database['public']['Tables']['quiz_attempts']['Insert'];
export type InsertAssignment = Database['public']['Tables']['assignments']['Insert'];
export type InsertAssignmentSubmission = Database['public']['Tables']['assignment_submissions']['Insert'];
export type InsertInstructorApplication = Database['public']['Tables']['instructor_applications']['Insert'];
export type InsertOrder = Database['public']['Tables']['orders']['Insert'];

// Update types for modifying existing records
export type UpdateUser = Database['public']['Tables']['users']['Update'];
export type UpdateCourse = Database['public']['Tables']['courses']['Update'];
export type UpdateEnrollment = Database['public']['Tables']['enrollments']['Update'];
export type UpdateQuiz = Database['public']['Tables']['quizzes']['Update'];
export type UpdateAssignment = Database['public']['Tables']['assignments']['Update'];
export type UpdateAssignmentSubmission = Database['public']['Tables']['assignment_submissions']['Update'];
export type UpdateInstructorApplication = Database['public']['Tables']['instructor_applications']['Update'];
export type UpdateOrder = Database['public']['Tables']['orders']['Update'];

// Role types
export type UserRole = 'student' | 'instructor' | 'admin';

// Domain-specific extended types
export interface UserWithProfile extends User {
  fullName: string;
}

export interface CourseWithInstructor extends Course {
  instructor?: User;
}

export interface EnrollmentWithCourse extends Enrollment {
  course?: Course;
}

export interface QuizWithQuestions extends Quiz {
  questions?: (QuizQuestion & { answers?: QuizAnswer[] })[];
}

export interface QuizAttemptWithDetails extends QuizAttempt {
  quiz?: Quiz;
  responses?: QuizResponse[];
}

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  answerId: string | null;
  textResponse: string | null;
  pointsEarned: number;
  createdAt: string;
}

export interface AssignmentWithSubmissions extends Assignment {
  submissions?: AssignmentSubmission[];
}

export interface InstructorApplicationWithUser extends InstructorApplication {
  user?: User;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
