export type CommunityData = {
  id: string
  name: string
  slug: string
  municipality: string
  department: string
  description: string | null
  logo_url: string | null
  primary_color: string
  cover_image_url: string | null
}

export type BusinessStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'neighbor' | 'merchant' | 'admin'

// Phase 3: Community types
export type PostType = 'announcement' | 'event' | 'job'
export type PostStatus = 'pending' | 'approved' | 'rejected'
export type AlertType = 'water' | 'power' | 'security' | 'construction' | 'general'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type ServiceCategory = 'emergency' | 'health' | 'government' | 'transport' | 'utilities'

export type EventMetadata = {
  date: string
  end_date?: string
  location: string
  location_coords?: { lat: number; lng: number }
}

export type JobMetadata = {
  category: string
  salary_range?: string
  contact_method: 'whatsapp' | 'phone' | 'email'
  contact_value: string
}

export type CommunityPost = {
  id: string
  community_id: string
  author_id: string
  type: PostType
  title: string
  content: string
  image_url: string | null
  metadata: EventMetadata | JobMetadata | Record<string, never>
  status: PostStatus
  is_pinned: boolean
  created_at: string
  updated_at: string
  profiles?: { full_name: string; avatar_url: string | null }
}

export type CommunityAlert = {
  id: string
  community_id: string
  author_id: string
  type: AlertType
  title: string
  description: string | null
  severity: AlertSeverity
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
}

export type PublicService = {
  id: string
  community_id: string
  category: ServiceCategory
  name: string
  description: string | null
  phone: string | null
  address: string | null
  hours: string | null
  sort_order: number
  is_active: boolean
}
