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
