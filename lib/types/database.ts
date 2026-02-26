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
      businesses: {
        Row: {
          address: string | null
          category_id: string
          community_id: string
          created_at: string | null
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
          location: unknown
          name: string
          owner_id: string
          phone: string | null
          photos: string[] | null
          slug: string
          status: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          community_id: string
          created_at?: string | null
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
          location?: unknown
          name: string
          owner_id: string
          phone?: string | null
          photos?: string[] | null
          slug: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          community_id?: string
          created_at?: string | null
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
          location?: unknown
          name?: string
          owner_id?: string
          phone?: string | null
          photos?: string[] | null
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
            foreignKeyName: "businesses_owner_id_profiles_fkey"
            columns: ["owner_id"]
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
      communities: {
        Row: {
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
      content_reports: {
        Row: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          community_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean | null
          phone: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          community_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          community_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
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
      can_manage_featured: {
        Args: { business_id: string }
        Returns: boolean
      }
      is_community_admin: {
        Args: { check_community_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      search_businesses: {
        Args: { query: string; comm_id: string }
        Returns: {
          id: string
          name: string
          slug: string
          description: string | null
          photos: string[] | null
          whatsapp: string | null
          address: string | null
          categories: { name: string; slug: string }
        }[]
      }
      nearby_businesses: {
        Args: { lat: number; lng: number; radius_km: number; comm_id: string }
        Returns: {
          id: string
          name: string
          slug: string
          description: string | null
          photos: string[] | null
          whatsapp: string | null
          address: string | null
          categories: { name: string; slug: string }
        }[]
      }
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
