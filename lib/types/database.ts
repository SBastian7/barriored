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
      communities: {
        Row: {
          id: string
          name: string
          slug: string
          municipality: string
          department: string
          description: string | null
          logo_url: string | null
          primary_color: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          municipality: string
          department: string
          description?: string | null
          logo_url?: string | null
          primary_color?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          municipality?: string
          department?: string
          description?: string | null
          logo_url?: string | null
          primary_color?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          community_id: string | null
          full_name: string | null
          phone: string | null
          role: "neighbor" | "merchant" | "admin"
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          community_id?: string | null
          full_name?: string | null
          phone?: string | null
          role?: "neighbor" | "merchant" | "admin"
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string | null
          full_name?: string | null
          phone?: string | null
          role?: "neighbor" | "merchant" | "admin"
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          }
        ]
      }
      businesses: {
        Row: {
          id: string
          community_id: string
          owner_id: string
          category_id: string
          name: string
          slug: string
          description: string | null
          address: string | null
          location: unknown | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          website: string | null
          hours: Json | null
          photos: string[] | null
          is_verified: boolean
          is_active: boolean
          status: "pending" | "approved" | "rejected"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          community_id: string
          owner_id: string
          category_id: string
          name: string
          slug: string
          description?: string | null
          address?: string | null
          location?: unknown | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          hours?: Json | null
          photos?: string[] | null
          is_verified?: boolean
          is_active?: boolean
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          owner_id?: string
          category_id?: string
          name?: string
          slug?: string
          description?: string | null
          address?: string | null
          location?: unknown | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          hours?: Json | null
          photos?: string[] | null
          is_verified?: boolean
          is_active?: boolean
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_businesses: {
        Args: {
          query: string
          comm_id: string
        }
        Returns: Database["public"]["Tables"]["businesses"]["Row"][]
      }
      nearby_businesses: {
        Args: {
          lat: number
          lng: number
          radius_km: number
          comm_id: string
        }
        Returns: Database["public"]["Tables"]["businesses"]["Row"][]
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
