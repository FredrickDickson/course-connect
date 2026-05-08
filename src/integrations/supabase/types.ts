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
      activity_log: {
        Row: {
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "course_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          application_id: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "expedited_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_modules: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          module_code: string
          module_title: string
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_code: string
          module_title: string
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_code?: string
          module_title?: string
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_modules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "expedited_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_rubrics: {
        Row: {
          assessment_type: string
          created_at: string | null
          criteria_description: string | null
          criteria_name: string
          id: string
          is_active: boolean | null
          max_score: number
          weight_percentage: number | null
        }
        Insert: {
          assessment_type: string
          created_at?: string | null
          criteria_description?: string | null
          criteria_name: string
          id?: string
          is_active?: boolean | null
          max_score: number
          weight_percentage?: number | null
        }
        Update: {
          assessment_type?: string
          created_at?: string | null
          criteria_description?: string | null
          criteria_name?: string
          id?: string
          is_active?: boolean | null
          max_score?: number
          weight_percentage?: number | null
        }
        Relationships: []
      }
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
      certificates: {
        Row: {
          certificate_number: string
          certificate_url: string | null
          created_at: string | null
          id: string
          is_revoked: boolean | null
          issued_at: string | null
          level: string
          pathway: string | null
          post_nominal: string
          revoked_at: string | null
          revoked_reason: string | null
          track: string
          updated_at: string | null
          user_id: string
          valid_until: string | null
          verification_url: string | null
        }
        Insert: {
          certificate_number: string
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string | null
          level: string
          pathway?: string | null
          post_nominal: string
          revoked_at?: string | null
          revoked_reason?: string | null
          track: string
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
          verification_url?: string | null
        }
        Update: {
          certificate_number?: string
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string | null
          level?: string
          pathway?: string | null
          post_nominal?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          track?: string
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string | null
          id: string
          report_category: string
          report_reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_category: string
          report_reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_category?: string
          report_reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      country_classifications: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          id: string
          income_tier: string
          region: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
          income_tier: string
          region?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
          income_tier?: string
          region?: string | null
        }
        Relationships: []
      }
      course_announcements: {
        Row: {
          author_id: string
          body: string
          course_id: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          course_id: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_completion_records: {
        Row: {
          assessment_passed: boolean | null
          assessment_score: number | null
          certificate_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          is_supplementary: boolean | null
          level_achieved: string | null
          track: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_passed?: boolean | null
          assessment_score?: number | null
          certificate_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_supplementary?: boolean | null
          level_achieved?: string | null
          track: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_passed?: boolean | null
          assessment_score?: number | null
          certificate_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_supplementary?: boolean | null
          level_achieved?: string | null
          track?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_completion_records_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_completion_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_completion_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_completion_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments_archive: {
        Row: {
          address: string | null
          admin_notes: string | null
          archived_at: string | null
          booking_ref: string | null
          confirmed_at: string | null
          country: string | null
          course_id: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          full_name: string | null
          id: string | null
          institution: string | null
          invoice_expiry_date: string | null
          pathway: string | null
          pathway_detected_at: string | null
          payment_method: string | null
          payment_status: string | null
          paystack_reference: string | null
          personal_statement: string | null
          phone: string | null
          profile_snapshot: Json | null
          programme_selected: string | null
          ticket_price: number | null
          ticket_type: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          archived_at?: string | null
          booking_ref?: string | null
          confirmed_at?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          institution?: string | null
          invoice_expiry_date?: string | null
          pathway?: string | null
          pathway_detected_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          paystack_reference?: string | null
          personal_statement?: string | null
          phone?: string | null
          profile_snapshot?: Json | null
          programme_selected?: string | null
          ticket_price?: number | null
          ticket_type?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          archived_at?: string | null
          booking_ref?: string | null
          confirmed_at?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          institution?: string | null
          invoice_expiry_date?: string | null
          pathway?: string | null
          pathway_detected_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          paystack_reference?: string | null
          personal_statement?: string | null
          phone?: string | null
          profile_snapshot?: Json | null
          programme_selected?: string | null
          ticket_price?: number | null
          ticket_type?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
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
      course_templates: {
        Row: {
          banner_image_url: string | null
          created_at: string
          default_capacity: number | null
          default_currency: string | null
          default_price: number | null
          default_ticket_types: Json | null
          description: string | null
          duration_hours: number | null
          enquiry_phone_1: string | null
          enquiry_phone_2: string | null
          format: string | null
          id: string
          name: string
          short_code: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          default_capacity?: number | null
          default_currency?: string | null
          default_price?: number | null
          default_ticket_types?: Json | null
          description?: string | null
          duration_hours?: number | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          format?: string | null
          id?: string
          name: string
          short_code: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          default_capacity?: number | null
          default_currency?: string | null
          default_price?: number | null
          default_ticket_types?: Json | null
          description?: string | null
          duration_hours?: number | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          format?: string | null
          id?: string
          name?: string
          short_code?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
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
          address: string | null
          associate_price: number | null
          avg_rating: number | null
          category_id: string | null
          city: string | null
          cohort_id: string | null
          country: string | null
          course_status: string | null
          course_type: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          enquiry_phone_1: string | null
          enquiry_phone_2: string | null
          enrollment_count: number | null
          fellow_price: number | null
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          level: string | null
          member_price: number | null
          pathway: string | null
          pathway_tags: string[] | null
          postal_code: string | null
          price: number
          promo_video_url: string | null
          qualification_level: string | null
          rating_count: number | null
          requires_approval: boolean | null
          schedule_details: Json | null
          start_date: string | null
          subtitle: string | null
          tags: string[] | null
          template_id: string | null
          thumbnail_url: string | null
          ticket_types: Json | null
          title: string
          total_capacity: number | null
          track: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          address?: string | null
          associate_price?: number | null
          avg_rating?: number | null
          category_id?: string | null
          city?: string | null
          cohort_id?: string | null
          country?: string | null
          course_status?: string | null
          course_type?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          enrollment_count?: number | null
          fellow_price?: number | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          member_price?: number | null
          pathway?: string | null
          pathway_tags?: string[] | null
          postal_code?: string | null
          price: number
          promo_video_url?: string | null
          qualification_level?: string | null
          rating_count?: number | null
          requires_approval?: boolean | null
          schedule_details?: Json | null
          start_date?: string | null
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          thumbnail_url?: string | null
          ticket_types?: Json | null
          title: string
          total_capacity?: number | null
          track?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          address?: string | null
          associate_price?: number | null
          avg_rating?: number | null
          category_id?: string | null
          city?: string | null
          cohort_id?: string | null
          country?: string | null
          course_status?: string | null
          course_type?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enquiry_phone_1?: string | null
          enquiry_phone_2?: string | null
          enrollment_count?: number | null
          fellow_price?: number | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          member_price?: number | null
          pathway?: string | null
          pathway_tags?: string[] | null
          postal_code?: string | null
          price?: number
          promo_video_url?: string | null
          qualification_level?: string | null
          rating_count?: number | null
          requires_approval?: boolean | null
          schedule_details?: Json | null
          start_date?: string | null
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          thumbnail_url?: string | null
          ticket_types?: Json | null
          title?: string
          total_capacity?: number | null
          track?: string | null
          updated_at?: string | null
          venue?: string | null
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
          {
            foreignKeyName: "courses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "course_templates"
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_to: string
          id: string
          member_id: string
          sent_at: string
          subject: string | null
          template_type: string
        }
        Insert: {
          created_at?: string
          email_to: string
          id?: string
          member_id: string
          sent_at?: string
          subject?: string | null
          template_type: string
        }
        Update: {
          created_at?: string
          email_to?: string
          id?: string
          member_id?: string
          sent_at?: string
          subject?: string | null
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
          application_id: string | null
          completed_at: string | null
          course_id: string | null
          enrolled_at: string | null
          enrollment_level: string | null
          enrollment_type: string | null
          id: string
          progress: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          enrollment_level?: string | null
          enrollment_type?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          enrollment_level?: string | null
          enrollment_type?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "fellowship_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      expedited_applications: {
        Row: {
          application_score: number | null
          application_type: string | null
          assessment_completed_at: string | null
          assessment_modules_completed: Json | null
          assessment_passed: boolean | null
          assessment_score: number | null
          assessment_submitted_at: string | null
          created_at: string | null
          cv_url: string | null
          documents: Json | null
          eligibility_notes: string | null
          experience_summary: string | null
          id: string
          paid_at: string | null
          pathway_track: string | null
          paystack_reference: string | null
          professional_writing_score: number | null
          qualifications_summary: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_id: string | null
          score: number | null
          status: string | null
          submitted_at: string | null
          target_level: string
          track: string
          understanding_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_score?: number | null
          application_type?: string | null
          assessment_completed_at?: string | null
          assessment_modules_completed?: Json | null
          assessment_passed?: boolean | null
          assessment_score?: number | null
          assessment_submitted_at?: string | null
          created_at?: string | null
          cv_url?: string | null
          documents?: Json | null
          eligibility_notes?: string | null
          experience_summary?: string | null
          id?: string
          paid_at?: string | null
          pathway_track?: string | null
          paystack_reference?: string | null
          professional_writing_score?: number | null
          qualifications_summary?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          target_level: string
          track?: string
          understanding_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_score?: number | null
          application_type?: string | null
          assessment_completed_at?: string | null
          assessment_modules_completed?: Json | null
          assessment_passed?: boolean | null
          assessment_score?: number | null
          assessment_submitted_at?: string | null
          created_at?: string | null
          cv_url?: string | null
          documents?: Json | null
          eligibility_notes?: string | null
          experience_summary?: string | null
          id?: string
          paid_at?: string | null
          pathway_track?: string | null
          paystack_reference?: string | null
          professional_writing_score?: number | null
          qualifications_summary?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          target_level?: string
          track?: string
          understanding_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expedited_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedited_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      fellowship_applications: {
        Row: {
          approved_at: string | null
          created_at: string | null
          cv_url: string | null
          dissertation_title: string | null
          dissertation_url: string | null
          experience_summary: string | null
          id: string
          portfolio_url: string | null
          qualifications_summary: string | null
          rejected_at: string | null
          rejection_reason: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          track: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          cv_url?: string | null
          dissertation_title?: string | null
          dissertation_url?: string | null
          experience_summary?: string | null
          id?: string
          portfolio_url?: string | null
          qualifications_summary?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          track: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          cv_url?: string | null
          dissertation_title?: string | null
          dissertation_url?: string | null
          experience_summary?: string | null
          id?: string
          portfolio_url?: string | null
          qualifications_summary?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          track?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fellowship_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fellowship_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_boards: {
        Row: {
          category_id: string | null
          course_edition_id: string | null
          created_at: string | null
          description: string | null
          id: string
          instructor_ids: string[] | null
          is_active: boolean | null
          is_course_board: boolean | null
          name: string
          post_count: number | null
          slug: string
        }
        Insert: {
          category_id?: string | null
          course_edition_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_ids?: string[] | null
          is_active?: boolean | null
          is_course_board?: boolean | null
          name: string
          post_count?: number | null
          slug: string
        }
        Update: {
          category_id?: string | null
          course_edition_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_ids?: string[] | null
          is_active?: boolean | null
          is_course_board?: boolean | null
          name?: string
          post_count?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_boards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_boards_course_edition_id_fkey"
            columns: ["course_edition_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_boards_course_edition_id_fkey"
            columns: ["course_edition_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          post_count: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          post_count?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          post_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      forum_follows: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_follows_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          announcement_priority: string | null
          attachments: string[] | null
          author_id: string
          board_id: string
          body: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_announcement: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          removed_by: string | null
          removed_reason: string | null
          reply_count: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          announcement_priority?: string | null
          attachments?: string[] | null
          author_id: string
          board_id: string
          body: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_announcement?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          removed_by?: string | null
          removed_reason?: string | null
          reply_count?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          announcement_priority?: string | null
          attachments?: string[] | null
          author_id?: string
          board_id?: string
          body?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_announcement?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          removed_by?: string | null
          removed_reason?: string | null
          reply_count?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "forum_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reaction_type: string | null
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          attachment_urls: string[] | null
          author_id: string
          body: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_official_answer: boolean | null
          official_answer_set_by: string | null
          parent_reply_id: string | null
          post_id: string
          removed_by: string | null
          removed_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          author_id: string
          body: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_official_answer?: boolean | null
          official_answer_set_by?: string | null
          parent_reply_id?: string | null
          post_id: string
          removed_by?: string | null
          removed_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          author_id?: string
          body?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_official_answer?: boolean | null
          official_answer_set_by?: string | null
          parent_reply_id?: string | null
          post_id?: string
          removed_by?: string | null
          removed_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_official_answer_set_by_fkey"
            columns: ["official_answer_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      instructor_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          board_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          board_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          board_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_assignments_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "forum_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          video_timestamp_seconds: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          video_timestamp_seconds?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          video_timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_question_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_instructor_reply: boolean
          question_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_instructor_reply?: boolean
          question_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_instructor_reply?: boolean
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_question_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lesson_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_questions: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_answered: boolean
          lesson_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_answered?: boolean
          lesson_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_answered?: boolean
          lesson_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          file_size_mb: number | null
          file_url: string
          id: string
          lesson_id: string
          name: string
          resource_type: string
        }
        Insert: {
          created_at?: string
          file_size_mb?: number | null
          file_url: string
          id?: string
          lesson_id: string
          name: string
          resource_type?: string
        }
        Update: {
          created_at?: string
          file_size_mb?: number | null
          file_url?: string
          id?: string
          lesson_id?: string
          name?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
          is_preview: boolean
          module_id: string | null
          order: number
          title: string
          video_id: string | null
          video_platform: string | null
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
          is_preview?: boolean
          module_id?: string | null
          order: number
          title: string
          video_id?: string | null
          video_platform?: string | null
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
          is_preview?: boolean
          module_id?: string | null
          order?: number
          title?: string
          video_id?: string | null
          video_platform?: string | null
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
      level_history: {
        Row: {
          changed_by: string
          changed_from: string
          changed_to: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string
          changed_from: string
          changed_to: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          changed_from?: string
          changed_to?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
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
          income_tier: string | null
          is_suspended: boolean | null
          issue_date: string | null
          last_reminder_sent: string | null
          last_renewal_at: string | null
          member_id: string
          organization_id: string | null
          part: Database["public"]["Enums"]["membership_level"]
          pathway_confirmed_at: string | null
          pathway_confirmed_by: string | null
          payment_reference: string | null
          payment_status: string | null
          phone: string | null
          post_nominal: string | null
          primary_pathway: string | null
          renewal_anniversary: string | null
          renewal_count: number
          status: Database["public"]["Enums"]["membership_status"]
          suspension_date: string | null
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
          income_tier?: string | null
          is_suspended?: boolean | null
          issue_date?: string | null
          last_reminder_sent?: string | null
          last_renewal_at?: string | null
          member_id: string
          organization_id?: string | null
          part?: Database["public"]["Enums"]["membership_level"]
          pathway_confirmed_at?: string | null
          pathway_confirmed_by?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          post_nominal?: string | null
          primary_pathway?: string | null
          renewal_anniversary?: string | null
          renewal_count?: number
          status?: Database["public"]["Enums"]["membership_status"]
          suspension_date?: string | null
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
          income_tier?: string | null
          is_suspended?: boolean | null
          issue_date?: string | null
          last_reminder_sent?: string | null
          last_renewal_at?: string | null
          member_id?: string
          organization_id?: string | null
          part?: Database["public"]["Enums"]["membership_level"]
          pathway_confirmed_at?: string | null
          pathway_confirmed_by?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          post_nominal?: string | null
          primary_pathway?: string | null
          renewal_anniversary?: string | null
          renewal_count?: number
          status?: Database["public"]["Enums"]["membership_status"]
          suspension_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          performed_by: string
          reason: string | null
          reversed: boolean | null
          target_post_id: string | null
          target_reply_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          performed_by: string
          reason?: string | null
          reversed?: boolean | null
          target_post_id?: string | null
          target_reply_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          performed_by?: string
          reason?: string | null
          reversed?: boolean | null
          target_post_id?: string | null
          target_reply_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_log_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_log_target_reply_id_fkey"
            columns: ["target_reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
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
          amount_ghs: number | null
          amount_usd: number | null
          booking_ref: string | null
          charged_currency: string | null
          course_id: string | null
          created_at: string | null
          currency: string | null
          enrollment_metadata: Json | null
          exchange_rate: number | null
          id: string
          original_currency: string | null
          paystack_reference: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          amount_ghs?: number | null
          amount_usd?: number | null
          booking_ref?: string | null
          charged_currency?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          enrollment_metadata?: Json | null
          exchange_rate?: number | null
          id?: string
          original_currency?: string | null
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          amount_ghs?: number | null
          amount_usd?: number | null
          booking_ref?: string | null
          charged_currency?: string | null
          course_id?: string | null
          created_at?: string | null
          currency?: string | null
          enrollment_metadata?: Json | null
          exchange_rate?: number | null
          id?: string
          original_currency?: string | null
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          discount_tier: string | null
          id: string
          member_count: number | null
          name: string
          organization_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          discount_tier?: string | null
          id?: string
          member_count?: number | null
          name: string
          organization_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          discount_tier?: string | null
          id?: string
          member_count?: number | null
          name?: string
          organization_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pathway_certificates: {
        Row: {
          certificate_url: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_revoked: boolean | null
          issued_at: string | null
          issuer_id: string | null
          level: string
          pathway: string
          post_nominal: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string | null
          user_id: string
          verification_code: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string | null
          issuer_id?: string | null
          level: string
          pathway: string
          post_nominal: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id: string
          verification_code?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string | null
          issuer_id?: string | null
          level?: string
          pathway?: string
          post_nominal?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string | null
        }
        Relationships: []
      }
      pathway_progress: {
        Row: {
          courses_completed: string[] | null
          created_at: string | null
          current_level: string
          id: string
          last_updated_at: string | null
          next_level_requirements: Json | null
          pathway: string
          progress_percentage: number | null
          total_courses_required: number | null
          user_id: string
        }
        Insert: {
          courses_completed?: string[] | null
          created_at?: string | null
          current_level: string
          id?: string
          last_updated_at?: string | null
          next_level_requirements?: Json | null
          pathway: string
          progress_percentage?: number | null
          total_courses_required?: number | null
          user_id: string
        }
        Update: {
          courses_completed?: string[] | null
          created_at?: string | null
          current_level?: string
          id?: string
          last_updated_at?: string | null
          next_level_requirements?: Json | null
          pathway?: string
          progress_percentage?: number | null
          total_courses_required?: number | null
          user_id?: string
        }
        Relationships: []
      }
      post_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          active: boolean
          amount_minor: number
          created_at: string | null
          currency: string
          description: string | null
          level: string
          sku: string
          track: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          amount_minor: number
          created_at?: string | null
          currency?: string
          description?: string | null
          level: string
          sku: string
          track: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          amount_minor?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          level?: string
          sku?: string
          track?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          adr_experience: string | null
          avatar_updated_at: string | null
          avatar_url: string | null
          badges: string[] | null
          bio_data_completed: boolean
          city: string | null
          community_role: string | null
          community_username: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          education_level: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          gender: string | null
          highest_qualification: string | null
          id: string
          industry: string | null
          institution: string | null
          job_title: string | null
          level_assigned_at: string | null
          level_assigned_by: string | null
          level_assignment_reason: string | null
          linkedin_url: string | null
          nationality: string | null
          notification_preferences: Json | null
          organisation: string | null
          override_reason: string | null
          part: string | null
          phone: string | null
          professional_background: string | null
          profile_completed: boolean
          profile_photo_url: string | null
          referral_source: string | null
          reputation_points: number | null
          role_category: string | null
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          years_experience: string | null
        }
        Insert: {
          address?: string | null
          adr_experience?: string | null
          avatar_updated_at?: string | null
          avatar_url?: string | null
          badges?: string[] | null
          bio_data_completed?: boolean
          city?: string | null
          community_role?: string | null
          community_username?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          gender?: string | null
          highest_qualification?: string | null
          id?: string
          industry?: string | null
          institution?: string | null
          job_title?: string | null
          level_assigned_at?: string | null
          level_assigned_by?: string | null
          level_assignment_reason?: string | null
          linkedin_url?: string | null
          nationality?: string | null
          notification_preferences?: Json | null
          organisation?: string | null
          override_reason?: string | null
          part?: string | null
          phone?: string | null
          professional_background?: string | null
          profile_completed?: boolean
          profile_photo_url?: string | null
          referral_source?: string | null
          reputation_points?: number | null
          role_category?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          years_experience?: string | null
        }
        Update: {
          address?: string | null
          adr_experience?: string | null
          avatar_updated_at?: string | null
          avatar_url?: string | null
          badges?: string[] | null
          bio_data_completed?: boolean
          city?: string | null
          community_role?: string | null
          community_username?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          gender?: string | null
          highest_qualification?: string | null
          id?: string
          industry?: string | null
          institution?: string | null
          job_title?: string | null
          level_assigned_at?: string | null
          level_assigned_by?: string | null
          level_assignment_reason?: string | null
          linkedin_url?: string | null
          nationality?: string | null
          notification_preferences?: Json | null
          organisation?: string | null
          override_reason?: string | null
          part?: string | null
          phone?: string | null
          professional_background?: string | null
          profile_completed?: boolean
          profile_photo_url?: string | null
          referral_source?: string | null
          reputation_points?: number | null
          role_category?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          years_experience?: string | null
        }
        Relationships: []
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
      qualification_assessments: {
        Row: {
          application_id: string
          assessment_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          passed: boolean | null
          score: number | null
          started_at: string | null
          submission_content: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          assessment_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          submission_content?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          assessment_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          submission_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualification_assessments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "expedited_applications"
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
          base_amount: number | null
          certificate_url: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          currency_used: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          income_tier: string | null
          is_late: boolean | null
          member_id: string
          new_expiry_date: string
          notes: string | null
          organization_id: string | null
          payment_method: string
          payment_reference: string | null
          renewal_date: string
          status: string | null
          surcharge_amount: number | null
        }
        Insert: {
          amount_paid?: number
          base_amount?: number | null
          certificate_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          currency_used?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          income_tier?: string | null
          is_late?: boolean | null
          member_id: string
          new_expiry_date: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          renewal_date?: string
          status?: string | null
          surcharge_amount?: number | null
        }
        Update: {
          amount_paid?: number
          base_amount?: number | null
          certificate_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          currency_used?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          income_tier?: string | null
          is_late?: boolean | null
          member_id?: string
          new_expiry_date?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          renewal_date?: string
          status?: string | null
          surcharge_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_pricing: {
        Row: {
          base_amount: number
          created_at: string | null
          currency: string
          effective_from: string
          id: string
          income_tier: string
          is_active: boolean | null
          late_surcharge_percentage: number | null
          membership_level: string
          updated_at: string | null
        }
        Insert: {
          base_amount: number
          created_at?: string | null
          currency: string
          effective_from: string
          id?: string
          income_tier: string
          is_active?: boolean | null
          late_surcharge_percentage?: number | null
          membership_level: string
          updated_at?: string | null
        }
        Update: {
          base_amount?: number
          created_at?: string | null
          currency?: string
          effective_from?: string
          id?: string
          income_tier?: string
          is_active?: boolean | null
          late_surcharge_percentage?: number | null
          membership_level?: string
          updated_at?: string | null
        }
        Relationships: []
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
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reply_id: string | null
          reporter_id: string
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reply_id?: string | null
          reporter_id: string
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reply_id?: string | null
          reporter_id?: string
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
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
      student_memberships: {
        Row: {
          course_of_study: string
          created_at: string | null
          expected_graduation_date: string | null
          expires_at: string | null
          id: string
          institution_name: string
          status: string | null
          student_id: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          verification_document_url: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          course_of_study: string
          created_at?: string | null
          expected_graduation_date?: string | null
          expires_at?: string | null
          id?: string
          institution_name: string
          status?: string | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          verification_document_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          course_of_study?: string
          created_at?: string | null
          expected_graduation_date?: string | null
          expires_at?: string | null
          id?: string
          institution_name?: string
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verification_document_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_memberships_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      track_progress: {
        Row: {
          created_at: string | null
          id: string
          level: string
          pathway: string | null
          track: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: string
          pathway?: string | null
          track: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          pathway?: string | null
          track?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achieved_at: string | null
          achievement_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          achievement_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          achievement_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_level: string | null
          award_writing_samples: Json | null
          bar_admission_number: string | null
          bar_jurisdiction: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          current_employer: string | null
          current_level: string | null
          eligibility_flags: Json | null
          email: string
          first_name: string | null
          has_llm_degree: boolean | null
          id: string
          job_title: string | null
          last_name: string | null
          llm_graduation_year: number | null
          llm_institution: string | null
          llm_specialization: string | null
          middle_name: string | null
          password: string | null
          pathway_type: string | null
          paystack_customer_code: string | null
          professional_portfolio_url: string | null
          professional_references: Json | null
          profile_image_url: string | null
          role: string | null
          timezone: string | null
          updated_at: string | null
          years_adr_experience: number | null
          years_legal_experience: number | null
        }
        Insert: {
          assigned_level?: string | null
          award_writing_samples?: Json | null
          bar_admission_number?: string | null
          bar_jurisdiction?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          current_employer?: string | null
          current_level?: string | null
          eligibility_flags?: Json | null
          email: string
          first_name?: string | null
          has_llm_degree?: boolean | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          llm_graduation_year?: number | null
          llm_institution?: string | null
          llm_specialization?: string | null
          middle_name?: string | null
          password?: string | null
          pathway_type?: string | null
          paystack_customer_code?: string | null
          professional_portfolio_url?: string | null
          professional_references?: Json | null
          profile_image_url?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          years_adr_experience?: number | null
          years_legal_experience?: number | null
        }
        Update: {
          assigned_level?: string | null
          award_writing_samples?: Json | null
          bar_admission_number?: string | null
          bar_jurisdiction?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          current_employer?: string | null
          current_level?: string | null
          eligibility_flags?: Json | null
          email?: string
          first_name?: string | null
          has_llm_degree?: boolean | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          llm_graduation_year?: number | null
          llm_institution?: string | null
          llm_specialization?: string | null
          middle_name?: string | null
          password?: string | null
          pathway_type?: string | null
          paystack_customer_code?: string | null
          professional_portfolio_url?: string | null
          professional_references?: Json | null
          profile_image_url?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          years_adr_experience?: number | null
          years_legal_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      course_catalog_view: {
        Row: {
          address: string | null
          associate_price: number | null
          avg_rating: number | null
          category_id: string | null
          category_name: string | null
          city: string | null
          cohort_id: string | null
          country: string | null
          course_status: string | null
          course_type: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          enquiry_phone_1: string | null
          enquiry_phone_2: string | null
          enrollment_count: number | null
          fellow_price: number | null
          id: string | null
          instructor_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          level: string | null
          member_price: number | null
          pathway: string | null
          pathway_tags: string[] | null
          postal_code: string | null
          price: number | null
          promo_video_url: string | null
          qualification_level: string | null
          rating_count: number | null
          requires_approval: boolean | null
          schedule_details: Json | null
          start_date: string | null
          subtitle: string | null
          tags: string[] | null
          template_id: string | null
          thumbnail_url: string | null
          ticket_types: Json | null
          title: string | null
          total_capacity: number | null
          track: string | null
          updated_at: string | null
          venue: string | null
          venue_details: Json | null
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
          {
            foreignKeyName: "courses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "course_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments_legacy: {
        Row: {
          address: string | null
          admin_notes: string | null
          booking_ref: string | null
          confirmed_at: string | null
          country: string | null
          course_id: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          full_name: string | null
          id: string | null
          institution: string | null
          invoice_expiry_date: string | null
          payment_method: string | null
          payment_status: string | null
          paystack_reference: string | null
          personal_statement: string | null
          phone: string | null
          programme_selected: string | null
          ticket_price: number | null
          ticket_type: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_analytics: {
        Row: {
          avg_progress: number | null
          certificates_issued: number | null
          current_level: string | null
          pathway: string | null
          user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_official_answer_points: {
        Args: { points: number; user_id: string }
        Returns: undefined
      }
      award_post_points: {
        Args: { points: number; user_id: string }
        Returns: undefined
      }
      award_reply_points: {
        Args: { points: number; user_id: string }
        Returns: undefined
      }
      award_reputation_points: {
        Args: { achievement_type: string; points: number; user_id: string }
        Returns: undefined
      }
      calculate_member_level: { Args: { p_user_id: string }; Returns: string }
      create_lesson: {
        Args: {
          _content?: string
          _content_type?: string
          _description?: string
          _duration_seconds?: number
          _module_id: string
          _title: string
          _video_id?: string
          _video_platform?: string
          _video_url?: string
        }
        Returns: string
      }
      debug_lessons_insert: { Args: { _module_id: string }; Returns: Json }
      debug_whoami: { Args: never; Returns: Json }
      generate_certificate_verification_code: { Args: never; Returns: string }
      generate_member_id: { Args: never; Returns: string }
      get_popular_tags: {
        Args: { limit_count?: number }
        Returns: {
          count: number
          tag: string
        }[]
      }
      get_user_post_nominal: {
        Args: { pathway?: string; user_uuid: string }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_can_view_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_question: {
        Args: { _question_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_quiz: {
        Args: { _quiz_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_module: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_question: {
        Args: { _question_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_quiz: {
        Args: { _quiz_id: string; _user_id: string }
        Returns: boolean
      }
      verify_member: {
        Args: { _member_id: string }
        Returns: {
          expiry_date: string
          full_name: string
          issue_date: string
          member_id: string
          part: Database["public"]["Enums"]["membership_level"]
          post_nominal: string
          status: Database["public"]["Enums"]["membership_status"]
        }[]
      }
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
