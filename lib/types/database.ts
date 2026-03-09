export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          created_at: string | null
        }
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
