/**
 * Generated Database Types Template
 * 
 * To generate actual types from your Supabase project, run:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > shared/database.types.ts
 * 
 * This template provides the structure expected by the type system.
 * Replace this file with actual generated types from your Supabase project.
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: string;
          profile_image_url: string | null;
          paystack_customer_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string;
          profile_image_url?: string | null;
          paystack_customer_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string;
          profile_image_url?: string | null;
          paystack_customer_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          short_description: string | null;
          price: number;
          category_id: string | null;
          instructor_id: string;
          thumbnail_url: string | null;
          preview_video_url: string | null;
          duration_hours: number | null;
          level: string;
          is_published: boolean;
          is_featured: boolean;
          avg_rating: number | null;
          enrollment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          short_description?: string | null;
          price?: number;
          category_id?: string | null;
          instructor_id: string;
          thumbnail_url?: string | null;
          preview_video_url?: string | null;
          duration_hours?: number | null;
          level?: string;
          is_published?: boolean;
          is_featured?: boolean;
          avg_rating?: number | null;
          enrollment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          short_description?: string | null;
          price?: number;
          category_id?: string | null;
          instructor_id?: string;
          thumbnail_url?: string | null;
          preview_video_url?: string | null;
          duration_hours?: number | null;
          level?: string;
          is_published?: boolean;
          is_featured?: boolean;
          avg_rating?: number | null;
          enrollment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          progress: number;
          status: string;
          enrolled_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          progress?: number;
          status?: string;
          enrolled_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          progress?: number;
          status?: string;
          enrolled_at?: string;
          completed_at?: string | null;
        };
      };
      quizzes: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          description: string | null;
          passing_score: number;
          max_attempts: number | null;
          time_limit_minutes: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          description?: string | null;
          passing_score?: number;
          max_attempts?: number | null;
          time_limit_minutes?: number | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          title?: string;
          description?: string | null;
          passing_score?: number;
          max_attempts?: number | null;
          time_limit_minutes?: number | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          points: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_text: string;
          question_type?: string;
          points?: number;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_text?: string;
          question_type?: string;
          points?: number;
          position?: number;
          created_at?: string;
        };
      };
      quiz_answers: {
        Row: {
          id: string;
          question_id: string;
          answer_text: string;
          is_correct: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          answer_text: string;
          is_correct?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          answer_text?: string;
          is_correct?: boolean;
          position?: number;
          created_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          score: number;
          passed: boolean;
          total_points: number;
          time_spent_seconds: number | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          score?: number;
          passed?: boolean;
          total_points?: number;
          time_spent_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          user_id?: string;
          score?: number;
          passed?: boolean;
          total_points?: number;
          time_spent_seconds?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      assignments: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          description: string | null;
          instructions: string | null;
          due_days: number | null;
          max_points: number;
          allow_late_submission: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          description?: string | null;
          instructions?: string | null;
          due_days?: number | null;
          max_points?: number;
          allow_late_submission?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          due_days?: number | null;
          max_points?: number;
          allow_late_submission?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          user_id: string;
          content: string;
          attachments: string[] | null;
          score: number | null;
          feedback: string | null;
          status: string;
          submitted_at: string;
          graded_at: string | null;
          graded_by: string | null;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          user_id: string;
          content?: string;
          attachments?: string[] | null;
          score?: number | null;
          feedback?: string | null;
          status?: string;
          submitted_at?: string;
          graded_at?: string | null;
          graded_by?: string | null;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          user_id?: string;
          content?: string;
          attachments?: string[] | null;
          score?: number | null;
          feedback?: string | null;
          status?: string;
          submitted_at?: string;
          graded_at?: string | null;
          graded_by?: string | null;
        };
      };
      instructor_applications: {
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          bio: string;
          experience: string;
          qualifications: string;
          previous_teaching: string;
          areas_of_expertise: string[];
          cv_url: string | null;
          video_intro_url: string | null;
          status: string;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_comments: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
          bio?: string;
          experience?: string;
          qualifications?: string;
          previous_teaching?: string;
          areas_of_expertise?: string[];
          cv_url?: string | null;
          video_intro_url?: string | null;
          status?: string;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_comments?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          bio?: string;
          experience?: string;
          qualifications?: string;
          previous_teaching?: string;
          areas_of_expertise?: string[];
          cv_url?: string | null;
          video_intro_url?: string | null;
          status?: string;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_comments?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency: string;
          status: string;
          payment_provider: string;
          payment_reference: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency?: string;
          status?: string;
          payment_provider?: string;
          payment_reference?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          amount?: number;
          currency?: string;
          status?: string;
          payment_provider?: string;
          payment_reference?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
