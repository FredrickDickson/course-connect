export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          profile_image_url: string | null
          role: string
          bio: string | null
          country: string | null
          timezone: string | null
          paystack_customer_code: string | null
          password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          role?: string
          bio?: string | null
          country?: string | null
          timezone?: string | null
          paystack_customer_code?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          role?: string
          bio?: string | null
          country?: string | null
          timezone?: string | null
          paystack_customer_code?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          description: string | null
          instructor_id: string | null
          category_id: string | null
          level: string
          price: number
          currency: string
          thumbnail_url: string | null
          promo_video_url: string | null
          duration_hours: number | null
          is_published: boolean
          is_featured: boolean
          avg_rating: number
          rating_count: number
          enrollment_count: number
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          description?: string | null
          instructor_id?: string | null
          category_id?: string | null
          level?: string
          price: number
          currency?: string
          thumbnail_url?: string | null
          promo_video_url?: string | null
          duration_hours?: number | null
          is_published?: boolean
          is_featured?: boolean
          avg_rating?: number
          rating_count?: number
          enrollment_count?: number
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          description?: string | null
          instructor_id?: string | null
          category_id?: string | null
          level?: string
          price?: number
          currency?: string
          thumbnail_url?: string | null
          promo_video_url?: string | null
          duration_hours?: number | null
          is_published?: boolean
          is_featured?: boolean
          avg_rating?: number
          rating_count?: number
          enrollment_count?: number
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          course_id: string | null
          title: string
          description: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id?: string | null
          title: string
          description?: string | null
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string | null
          title?: string
          description?: string | null
          order?: number
          created_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          module_id: string | null
          title: string
          description: string | null
          content_type: string
          video_url: string | null
          duration_seconds: number | null
          content: string | null
          order: number
          is_free: boolean
          created_at: string
        }
        Insert: {
          id?: string
          module_id?: string | null
          title: string
          description?: string | null
          content_type?: string
          video_url?: string | null
          duration_seconds?: number | null
          content?: string | null
          order: number
          is_free?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          module_id?: string | null
          title?: string
          description?: string | null
          content_type?: string
          video_url?: string | null
          duration_seconds?: number | null
          content?: string | null
          order?: number
          is_free?: boolean
          created_at?: string
        }
      }
      progress: {
        Row: {
          id: string
          user_id: string | null
          lesson_id: string | null
          completed: boolean
          watch_time_seconds: number
          last_watched_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          lesson_id?: string | null
          completed?: boolean
          watch_time_seconds?: number
          last_watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          lesson_id?: string | null
          completed?: boolean
          watch_time_seconds?: number
          last_watched_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          enrolled_at: string
          completed_at: string | null
          progress: number
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          enrolled_at?: string
          completed_at?: string | null
          progress?: number
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          enrolled_at?: string
          completed_at?: string | null
          progress?: number
        }
      }
      assignments: {
        Row: {
          id: string
          lesson_id: string | null
          title: string
          description: string
          instructions: string | null
          due_date: string | null
          max_score: number
          allow_late_submission: boolean
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id?: string | null
          title: string
          description: string
          instructions?: string | null
          due_date?: string | null
          max_score?: number
          allow_late_submission?: boolean
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string | null
          title?: string
          description?: string
          instructions?: string | null
          due_date?: string | null
          max_score?: number
          allow_late_submission?: boolean
          is_required?: boolean
          created_at?: string
        }
      }
      assignment_submissions: {
        Row: {
          id: string
          user_id: string | null
          assignment_id: string | null
          content: string
          attachment_urls: string[] | null
          score: number | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          is_late_submission: boolean
          submitted_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          assignment_id?: string | null
          content: string
          attachment_urls?: string[] | null
          score?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          is_late_submission?: boolean
          submitted_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          assignment_id?: string | null
          content?: string
          attachment_urls?: string[] | null
          score?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          is_late_submission?: boolean
          submitted_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          lesson_id: string | null
          title: string
          description: string | null
          time_limit_minutes: number | null
          passing_score: number
          max_attempts: number
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id?: string | null
          title: string
          description?: string | null
          time_limit_minutes?: number | null
          passing_score?: number
          max_attempts?: number
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string | null
          title?: string
          description?: string | null
          time_limit_minutes?: number | null
          passing_score?: number
          max_attempts?: number
          is_required?: boolean
          created_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string | null
          question: string
          question_type: string
          points: number
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id?: string | null
          question: string
          question_type?: string
          points?: number
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string | null
          question?: string
          question_type?: string
          points?: number
          order?: number
          created_at?: string
        }
      }
      quiz_answers: {
        Row: {
          id: string
          question_id: string | null
          answer: string
          is_correct: boolean
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id?: string | null
          answer: string
          is_correct?: boolean
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string | null
          answer?: string
          is_correct?: boolean
          order?: number
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string | null
          quiz_id: string | null
          score: number | null
          total_points: number | null
          passed: boolean
          time_spent_minutes: number | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          quiz_id?: string | null
          score?: number | null
          total_points?: number | null
          passed?: boolean
          time_spent_minutes?: number | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          quiz_id?: string | null
          score?: number | null
          total_points?: number | null
          passed?: boolean
          time_spent_minutes?: number | null
          started_at?: string
          completed_at?: string | null
        }
      }
      quiz_responses: {
        Row: {
          id: string
          attempt_id: string | null
          question_id: string | null
          answer_id: string | null
          response_text: string | null
          is_correct: boolean
          points_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          attempt_id?: string | null
          question_id?: string | null
          answer_id?: string | null
          response_text?: string | null
          is_correct?: boolean
          points_earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string | null
          question_id?: string | null
          answer_id?: string | null
          response_text?: string | null
          is_correct?: boolean
          points_earned?: number
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          slug?: string
          created_at?: string
        }
      }
      course_resources: {
        Row: {
          id: string
          lesson_id: string | null
          course_id: string | null
          title: string
          description: string | null
          file_url: string
          file_name: string
          file_type: string | null
          file_size: number | null
          download_count: number
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id?: string | null
          course_id?: string | null
          title: string
          description?: string | null
          file_url: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          download_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string | null
          course_id?: string | null
          title?: string
          description?: string | null
          file_url?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          download_count?: number
          created_at?: string
        }
      }
      discussions: {
        Row: {
          id: string
          course_id: string | null
          user_id: string | null
          title: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          course_id?: string | null
          user_id?: string | null
          title: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string | null
          user_id?: string | null
          title?: string
          content?: string
          created_at?: string
        }
      }
      replies: {
        Row: {
          id: string
          discussion_id: string | null
          user_id: string | null
          content: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id?: string | null
          user_id?: string | null
          content: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string | null
          user_id?: string | null
          content?: string
          parent_id?: string | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          created_at?: string
        }
      }
      certifications: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          certificate_url: string | null
          issued_at: string
          valid_until: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          certificate_url?: string | null
          issued_at?: string
          valid_until?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          certificate_url?: string | null
          issued_at?: string
          valid_until?: string | null
        }
      }
      instructor_applications: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          bio: string
          experience: string
          qualifications: string
          previous_teaching: string
          areas_of_expertise: string[]
          cv_url: string | null
          video_intro_url: string | null
          status: string
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          review_comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          bio: string
          experience: string
          qualifications: string
          previous_teaching: string
          areas_of_expertise: string[]
          cv_url?: string | null
          video_intro_url?: string | null
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          bio?: string
          experience?: string
          qualifications?: string
          previous_teaching?: string
          areas_of_expertise?: string[]
          cv_url?: string | null
          video_intro_url?: string | null
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      instructor_payouts: {
        Row: {
          id: string
          instructor_id: string | null
          amount: number
          currency: string
          period: string
          revenue_share: number
          total_revenue: number
          status: string
          payout_reference: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          instructor_id?: string | null
          amount: number
          currency?: string
          period: string
          revenue_share?: number
          total_revenue: number
          status?: string
          payout_reference?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          instructor_id?: string | null
          amount?: number
          currency?: string
          period?: string
          revenue_share?: number
          total_revenue?: number
          status?: string
          payout_reference?: string | null
          processed_at?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          amount: number
          currency: string
          status: string
          paystack_reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          amount: number
          currency?: string
          status?: string
          paystack_reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          amount?: number
          currency?: string
          status?: string
          paystack_reference?: string | null
          created_at?: string
        }
      }
      community_notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          sid: string
          sess: Json
          expire: string
        }
        Insert: {
          sid: string
          sess: Json
          expire: string
        }
        Update: {
          sid?: string
          sess?: Json
          expire?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}