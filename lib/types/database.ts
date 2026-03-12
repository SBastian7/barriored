export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// GeoJSON Polygon type for PostGIS boundary storage
export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type Database = {
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
          primary_color: string | null
          cover_image_url: string | null
          is_active: boolean | null
          boundary: GeoJSONPolygon | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          municipality: string
          department: string
          description?: string | null
          logo_url?: string | null
          primary_color?: string | null
          cover_image_url?: string | null
          is_active?: boolean | null
          boundary?: GeoJSONPolygon | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          municipality?: string
          department?: string
          description?: string | null
          logo_url?: string | null
          primary_color?: string | null
          cover_image_url?: string | null
          is_active?: boolean | null
          boundary?: GeoJSONPolygon | null
          created_at?: string | null
        }
        Relationships: []
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
          role: 'user' | 'moderator' | 'admin' | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
        }
      }
      marketplace_categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string
          description: string | null
          display_order: number
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon: string
          description?: string | null
          display_order?: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string
          description?: string | null
          display_order?: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      classifieds: {
        Row: {
          id: string
          community_id: string
          user_id: string
          category_id: string
          title: string
          description: string
          price: string | null
          images: string[] | null
          whatsapp: string
          status: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
          is_featured: boolean | null
          featured_until: string | null
          last_activity_at: string | null
          archived_at: string | null
          sold_at: string | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          category_id: string
          title: string
          description: string
          price?: string | null
          images?: string[] | null
          whatsapp: string
          status?: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
          is_featured?: boolean | null
          featured_until?: string | null
          last_activity_at?: string | null
          archived_at?: string | null
          sold_at?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          category_id?: string
          title?: string
          description?: string
          price?: string | null
          images?: string[] | null
          whatsapp?: string
          status?: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
          is_featured?: boolean | null
          featured_until?: string | null
          last_activity_at?: string | null
          archived_at?: string | null
          sold_at?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'classifieds_community_id_fkey'
            columns: ['community_id']
            isOneToOne: false
            referencedRelation: 'communities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classifieds_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classifieds_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'marketplace_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classifieds_flagged_by_fkey'
            columns: ['flagged_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      classified_favorites: {
        Row: {
          id: string
          user_id: string
          classified_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          classified_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          classified_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'classified_favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classified_favorites_classified_id_fkey'
            columns: ['classified_id']
            isOneToOne: false
            referencedRelation: 'classifieds'
            referencedColumns: ['id']
          }
        ]
      }
      marketplace_user_bans: {
        Row: {
          id: string
          community_id: string
          user_id: string
          banned_by: string
          reason: string
          banned_at: string | null
          expires_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          banned_by: string
          reason: string
          banned_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          banned_by?: string
          reason?: string
          banned_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'marketplace_user_bans_community_id_fkey'
            columns: ['community_id']
            isOneToOne: false
            referencedRelation: 'communities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'marketplace_user_bans_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'marketplace_user_bans_banned_by_fkey'
            columns: ['banned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
  }
}

export interface AuditLog {
  id: string
  community_id: string | null
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data: any
  new_data: any
  metadata: any
  created_at: string
}

export interface ErrorLog {
  id: string
  community_id: string | null
  user_id: string | null
  error_type: string
  error_message: string | null
  stack_trace: string | null
  request_url: string | null
  request_method: string | null
  request_body: any
  status_code: number | null
  metadata: any
  created_at: string
}

// Classified with relations
export interface ClassifiedWithRelations {
  id: string
  community_id: string
  user_id: string
  category_id: string
  title: string
  description: string
  price: string | null
  images: string[] | null
  whatsapp: string
  status: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
  is_featured: boolean
  featured_until: string | null
  last_activity_at: string
  archived_at: string | null
  sold_at: string | null
  flagged_at: string | null
  flagged_by: string | null
  flagged_reason: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  marketplace_categories: {
    id: string
    name: string
    slug: string
    icon: string
  }
  communities: {
    id: string
    name: string
    slug: string
  }
}

export interface MarketplaceBan {
  id: string
  community_id: string
  user_id: string
  banned_by: string
  reason: string
  banned_at: string
  expires_at: string | null
  is_active: boolean
}
