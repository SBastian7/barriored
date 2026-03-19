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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          community_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          community_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          community_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_review_responses: {
        Row: {
          created_at: string
          id: string
          response_text: string
          review_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_text: string
          review_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          response_text?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "business_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          admin_notes: string | null
          category_id: string
          community_id: string
          created_at: string | null
          deletion_reason: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          description: string | null
          email: string | null
          featured_order: number | null
          featured_requested: boolean | null
          featured_requested_at: string | null
          hours: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          last_edited_by: string | null
          location: unknown
          name: string
          owner_id: string
          phone: string | null
          photos: string[] | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_details: string | null
          rejection_reason: string | null
          slug: string
          status: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          category_id: string
          community_id: string
          created_at?: string | null
          deletion_reason?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          email?: string | null
          featured_order?: number | null
          featured_requested?: boolean | null
          featured_requested_at?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_edited_by?: string | null
          location?: unknown
          name: string
          owner_id: string
          phone?: string | null
          photos?: string[] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_details?: string | null
          rejection_reason?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          category_id?: string
          community_id?: string
          created_at?: string | null
          deletion_reason?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          description?: string | null
          email?: string | null
          featured_order?: number | null
          featured_requested?: boolean | null
          featured_requested_at?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_edited_by?: string | null
          location?: unknown
          name?: string
          owner_id?: string
          phone?: string | null
          photos?: string[] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_details?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      classified_favorites: {
        Row: {
          classified_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          classified_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          classified_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classified_favorites_classified_id_fkey"
            columns: ["classified_id"]
            isOneToOne: false
            referencedRelation: "classifieds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classified_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classifieds: {
        Row: {
          archived_at: string | null
          category_id: string
          community_id: string
          created_at: string | null
          description: string
          featured_until: string | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          images: string[] | null
          is_featured: boolean | null
          last_activity_at: string | null
          price: string | null
          sold_at: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          community_id: string
          created_at?: string | null
          description: string
          featured_until?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          last_activity_at?: string | null
          price?: string | null
          sold_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          community_id?: string
          created_at?: string | null
          description?: string
          featured_until?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          last_activity_at?: string | null
          price?: string | null
          sold_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "classifieds_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifieds_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifieds_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifieds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          boundary: unknown
          cover_image_url: string | null
          created_at: string | null
          department: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          municipality: string
          name: string
          primary_color: string | null
          slug: string
        }
        Insert: {
          boundary?: unknown
          cover_image_url?: string | null
          created_at?: string | null
          department: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          municipality: string
          name: string
          primary_color?: string | null
          slug: string
        }
        Update: {
          boundary?: unknown
          cover_image_url?: string | null
          created_at?: string | null
          department?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          municipality?: string
          name?: string
          primary_color?: string | null
          slug?: string
        }
        Relationships: []
      }
      community_alerts: {
        Row: {
          author_id: string
          community_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          severity: string
          starts_at: string
          title: string
          type: string
        }
        Insert: {
          author_id: string
          community_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          severity?: string
          starts_at?: string
          title: string
          type: string
        }
        Update: {
          author_id?: string
          community_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          severity?: string
          starts_at?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_alerts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_alerts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          community_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          last_promoted_at: string | null
          metadata: Json
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          community_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          last_promoted_at?: string | null
          metadata?: Json
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          last_promoted_at?: string | null
          metadata?: Json
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_seo_settings: {
        Row: {
          community_id: string
          created_at: string | null
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          og_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          community_id: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_seo_settings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          community_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_entity_id: string
          reported_entity_type: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_entity_id: string
          reported_entity_type: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_entity_id?: string
          reported_entity_type?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
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
      error_logs: {
        Row: {
          community_id: string | null
          created_at: string | null
          error_message: string | null
          error_type: string
          id: string
          metadata: Json | null
          request_body: Json | null
          request_method: string | null
          request_url: string | null
          stack_trace: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          request_body?: Json | null
          request_method?: string | null
          request_url?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          request_body?: Json | null
          request_method?: string | null
          request_url?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      image_storage_analytics: {
        Row: {
          bucket_name: string
          community_id: string | null
          file_count: number
          id: string
          recorded_at: string | null
          total_size_bytes: number
        }
        Insert: {
          bucket_name: string
          community_id?: string | null
          file_count: number
          id?: string
          recorded_at?: string | null
          total_size_bytes: number
        }
        Update: {
          bucket_name?: string
          community_id?: string | null
          file_count?: number
          id?: string
          recorded_at?: string | null
          total_size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_storage_analytics_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      marketplace_user_bans: {
        Row: {
          banned_at: string | null
          banned_by: string
          community_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_by: string
          community_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_by?: string
          community_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_user_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_user_bans_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          community_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean | null
          is_suspended: boolean | null
          phone: string | null
          role: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
        }
        Insert: {
          avatar_url?: string | null
          community_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          is_suspended?: boolean | null
          phone?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
        }
        Update: {
          avatar_url?: string | null
          community_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          is_suspended?: boolean | null
          phone?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_services: {
        Row: {
          address: string | null
          category: string
          community_id: string
          description: string | null
          hours: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          sort_order: number
        }
        Insert: {
          address?: string | null
          category: string
          community_id: string
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          sort_order?: number
        }
        Update: {
          address?: string | null
          category?: string
          community_id?: string
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_services_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_config: {
        Row: {
          community_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_per_day: number | null
          test_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          community_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_per_day?: number | null
          test_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_per_day?: number | null
          test_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_config_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          alert_id: string | null
          body: string | null
          clicked_count: number | null
          community_id: string
          failed_count: number | null
          id: string
          sent_at: string | null
          sent_count: number | null
          test_mode: boolean | null
          title: string
        }
        Insert: {
          alert_id?: string | null
          body?: string | null
          clicked_count?: number | null
          community_id: string
          failed_count?: number | null
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          test_mode?: boolean | null
          title: string
        }
        Update: {
          alert_id?: string | null
          body?: string | null
          clicked_count?: number | null
          community_id?: string
          failed_count?: number | null
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          test_mode?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "community_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const

// ============================================================================
// Helper Types
// ============================================================================

// Marketplace (Classifieds)
export type ClassifiedWithRelations = Database['public']['Tables']['classifieds']['Row'] & {
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
  marketplace_categories: {
    name: string
    slug: string
    icon: string
  } | null
  communities: {
    name: string
    slug: string
  } | null
}

// Reviews & Ratings
export type Review = Database['public']['Tables']['business_reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['business_reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['business_reviews']['Update']

export type ReviewResponse = Database['public']['Tables']['business_review_responses']['Row']

export type ReviewWithRelations = Review & {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  response: ReviewResponse | null
}

// ============================================================================
// MONETIZATION HELPER TYPES
// ============================================================================

// Analytics
export type BusinessAnalyticsDaily = Database['public']['Tables']['business_analytics_daily']['Row']
export type AnalyticsSummary = {
  totals: {
    profileViews: number
    whatsappClicks: number
    lastUpdated: string | null
  }
  daily: BusinessAnalyticsDaily[]
  chartData: {
    labels: string[]
    views: number[]
    clicks: number[]
  }
}

// Subscriptions
export type Subscription = Database['public']['Tables']['business_subscriptions']['Row']
export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']
export type SubscriptionWithPayments = Subscription & {
  payments: SubscriptionPayment[]
  business?: {
    id: string
    name: string
    slug: string
  }
}

// Banners
export type BannerAd = Database['public']['Tables']['banner_ads']['Row']
export type BannerPayment = Database['public']['Tables']['banner_payments']['Row']
export type BannerWithPayments = BannerAd & {
  payments: BannerPayment[]
  business?: {
    id: string
    name: string
    slug: string
  }
}

// Review Flags
export type ReviewFlag = Database['public']['Tables']['review_flags']['Row']
export type ReviewFlagWithReview = ReviewFlag & {
  review: ReviewWithRelations
  business: {
    id: string
    name: string
    slug: string
  }
  flagger: {
    id: string
    full_name: string | null
  }
}
