import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPermissions, type UserPermissions } from './permissions'
import { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Require a specific permission for an API route
 * Returns authorization result with error response if unauthorized
 */
export async function requirePermission(
  permission: keyof UserPermissions,
  supabase: SupabaseClient<Database>
): Promise<{ authorized: true } | { authorized: false; error: NextResponse }> {
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
    }
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_super_admin, is_suspended')
    .eq('id', user.id)
    .single() as { data: any; error: any }

  if (profileError || !profile) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      ),
    }
  }

  // Check if user is suspended
  if (profile.is_suspended) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Cuenta suspendida' },
        { status: 403 }
      ),
    }
  }

  // Check permission
  const permissions = getPermissions(
    profile.role as 'user' | 'moderator' | 'admin' | null,
    profile.is_super_admin
  )

  if (!permissions[permission]) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'No autorizado para esta acción' },
        { status: 403 }
      ),
    }
  }

  return { authorized: true }
}
