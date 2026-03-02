import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

/**
 * Supabase Admin Client
 * Uses service_role key for admin operations like deleting users
 * ⚠️ NEVER expose this client to the browser - server-side only!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Verify user is authenticated and has moderator or admin role
 * @throws Error if unauthorized or insufficient permissions
 */
export async function checkModeratorAccess() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized - Authentication required')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, id, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  if (!['admin', 'moderator'].includes(profile.role)) {
    throw new Error('Insufficient permissions - Admin or Moderator role required')
  }

  return { user, profile }
}

/**
 * Verify user is authenticated and has admin role
 * @throws Error if unauthorized or not admin
 */
export async function checkAdminAccess() {
  const { user, profile } = await checkModeratorAccess()

  if (profile.role !== 'admin') {
    throw new Error('Insufficient permissions - Admin role required')
  }

  return { user, profile }
}
