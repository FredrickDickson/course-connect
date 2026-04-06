export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          assignment_id: string | null
          attachment_urls: string[] | null
          content: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_late_submission: boolean | null
          score: number | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          attachment_urls?: string[] | null
          content: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late_submission?: boolean | null
          score?: number | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          attachment_urls?: string[] | null
          content?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late_submission?: boolean | null
          score?: number | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submission: boolean | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          instructions: string | null
          is_required: boolean | null
          lesson_id: string | null
          max_score: number | null
          title: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          title: string
        }
        Update: {
          allow_late_submission?: boolean | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          certificate_url: string | null
          course_id: string | null
          id: string
          issued_at: string | null
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          certificate_url?: string | null
          course_id?: string | null
          id?: string
          issued_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          certificate_url?: string | null
          course_id?: string | null
          id?: string
          issued_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          address: string | null
          admin_notes: string | null
          booking_ref: string
          confirmed_at: string | null
          country: string | null
          course_id: string | null
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          institution: string | null
          invoice_expiry_date: string | null
          payment_method: string
          payment_status: string
          paystack_reference: string | null
          personal_statement: string | null
          phone: string | null
          programme_selected: string | null
          ticket_price: number
          ticket_type: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          booking_ref: string
          confirmed_at?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          email: string
          full_name: string
          id?: string
          institution?: string | null
          invoice_expiry_date?: string | null
          payment_method?: string
          payment_status?: string
          paystack_reference?: string | null
          personal_statement?: string | null
          phone?: string | null
          programme_selected?: string | null
          ticket_price?: number
          ticket_type?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          booking_ref?: string
          confirmed_at?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          institution?: string | null
          invoice_expiry_date?: string | null
          payment_method?: string
          payment_status?: string
          paystack_reference?: string | null
          personal_statement?: string | null
          phone?: string | null
          programme_selected?: string | null
          ticket_price?: number
          ticket_type?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id?: string | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_courses_id_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_lesson_id_lessons_id_fk"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_waitlist: {
        Row: {
          course_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          ticket_type: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          ticket_type?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ticket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_waitlist_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          avg_rating: number | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_hours: number | null
          enquiry_phone_1: string | null
          enquiry_phone_2: string | null
          enrollment_count: number | null
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          level: string | null
          price: number
          promo_video_url: string | null
          rating_count: number | null
          subtitle: string | null
          tags: string[] | null
          thumbnail_url: string | null
          ticket_types: Json | null
          title: string
          total_capacity: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_hours?: number | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          enrollment_count?: number | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price: number
          promo_video_url?: string | null
          rating_count?: number | null
          subtitle?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          ticket_types?: Json | null
          title: string
          total_capacity?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_hours?: number | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          enrollment_count?: number | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price?: number
          promo_video_url?: string | null
          rating_count?: number | null
          subtitle?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          ticket_types?: Json | null
          title?: string
          total_capacity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reminder_logs: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          member_id: string
          sent_at: string
          status: string
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          member_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          member_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminder_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          enrolled_at: string | null
          id: string
          progress: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_applications: {
        Row: {
          areas_of_expertise: string[]
          bio: string
          created_at: string | null
          cv_url: string | null
          email: string
          experience: string
          first_name: string
          id: string
          last_name: string
          phone: string
          previous_teaching: string
          qualifications: string
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
          video_intro_url: string | null
        }
        Insert: {
          areas_of_expertise: string[]
          bio: string
          created_at?: string | null
          cv_url?: string | null
          email: string
          experience: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          previous_teaching: string
          qualifications: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_intro_url?: string | null
        }
        Update: {
          areas_of_expertise?: string[]
          bio?: string
          created_at?: string | null
          cv_url?: string | null
          email?: string
          experience?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          previous_teaching?: string
          qualifications?: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_intro_url?: string | null
        }
        Relationships: []
      }
      instructor_payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          instructor_id: string | null
          payout_reference: string | null
          period: string
          processed_at: string | null
          revenue_share: number | null
          status: string | null
          total_revenue: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          instructor_id?: string | null
          payout_reference?: string | null
          period: string
          processed_at?: string | null
          revenue_share?: number | null
          status?: string | null
          total_revenue: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          instructor_id?: string | null
          payout_reference?: string | null
          period?: string
          processed_at?: string | null
          revenue_share?: number | null
          status?: string | null
          total_revenue?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_free: boolean | null
          module_id: string | null
          order: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean | null
          module_id?: string | null
          order: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean | null
          module_id?: string | null
          order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          certificate_url: string | null
          country: string | null
          created_at: string
          email: string
          expiry_date: string | null
          full_name: string
          id: string
          issue_date: string | null
          last_reminder_sent: string | null
          member_id: string
          membership_level: Database["public"]["Enums"]["membership_level"]
          payment_reference: string | null
          payment_status: string | null
          phone: string | null
          post_nominal: string | null
          renewal_count: number
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          expiry_date?: string | null
          full_name: string
          id?: string
          issue_date?: string | null
          last_reminder_sent?: string | null
          member_id: string
          membership_level?: Database["public"]["Enums"]["membership_level"]
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          post_nominal?: string | null
          renewal_count?: number
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          expiry_date?: string | null
          full_name?: string
          id?: string
          issue_date?: string | null
          last_reminder_sent?: string | null
          member_id?: string
          membership_level?: Database["public"]["Enums"]["membership_level"]
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          post_nominal?: string | null
          renewal_count?: number
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order: number
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order: number
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          paystack_reference: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          completed: boolean | null
          id: string
          last_watched_at: string | null
          lesson_id: string | null
          user_id: string | null
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          user_id?: string | null
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          user_id?: string | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          order: number
          question_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order: number
          question_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order?: number
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string | null
          score: number | null
          started_at: string | null
          time_spent_minutes: number | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          order: number
          points: number | null
          question: string
          question_type: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order: number
          points?: number | null
          question: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order?: number
          points?: number | null
          question?: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answer_id: string | null
          attempt_id: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          response_text: string | null
        }
        Insert: {
          answer_id?: string | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          response_text?: string | null
        }
        Update: {
          answer_id?: string | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          response_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "quiz_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_history: {
        Row: {
          amount_paid: number
          certificate_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          member_id: string
          new_expiry_date: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          renewal_date: string
        }
        Insert: {
          amount_paid?: number
          certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          member_id: string
          new_expiry_date: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          renewal_date?: string
        }
        Update: {
          amount_paid?: number
          certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          member_id?: string
          new_expiry_date?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          renewal_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          content: string
          created_at: string | null
          discussion_id: string | null
          id: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string | null
          created_at: string | null
          id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          expire: string
          sess: Json
          sid: string
        }
        Insert: {
          expire: string
          sess: Json
          sid: string
        }
        Update: {
          expire?: string
          sess?: Json
          sid?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          password: string | null
          paystack_customer_code: string | null
          profile_image_url: string | null
          role: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password?: string | null
          paystack_customer_code?: string | null
          profile_image_url?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password?: string | null
          paystack_customer_code?: string | null
          profile_image_url?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_member_id: { Args: never; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      membership_level: "associate" | "member" | "fellow"
      membership_status: "pending" | "active" | "expiring" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      membership_level: ["associate", "member", "fellow"],
      membership_status: ["pending", "active", "expiring", "expired"],
    },
  },
} as const
