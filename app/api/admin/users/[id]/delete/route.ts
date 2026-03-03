import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Get current user's profile to check permissions
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', currentUser.id)
      .single() as {
        data: {
          role: string | null
          is_super_admin: boolean | null
          community_id: string | null
        } | null
      }

    if (!currentProfile || (currentProfile.role !== 'admin' && !currentProfile.is_super_admin)) {
      return NextResponse.json(
        { error: 'No autorizado - se requieren permisos de administrador' },
        { status: 403 }
      )
    }

    // Get the user to be deleted to verify community access
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('community_id')
      .eq('id', userId)
      .single() as {
        data: {
          community_id: string | null
        } | null
      }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check if admin has permission (super admin or same community)
    if (!currentProfile.is_super_admin && targetUser.community_id !== currentProfile.community_id) {
      return NextResponse.json(
        { error: 'No autorizado - no puedes eliminar usuarios de otra comunidad' },
        { status: 403 }
      )
    }

    // Delete user's businesses (RLS policy allows admin to delete)
    const { error: businessError } = await supabase
      .from('businesses')
      .delete()
      .eq('owner_id', userId)

    if (businessError) {
      console.error('Error deleting businesses:', businessError)
      throw new Error(`Error eliminando negocios: ${businessError.message}`)
    }

    // Delete user's community posts (RLS policy allows admin to delete)
    const { error: postsError } = await supabase
      .from('community_posts')
      .delete()
      .eq('author_id', userId)

    if (postsError) {
      console.error('Error deleting posts:', postsError)
      throw new Error(`Error eliminando publicaciones: ${postsError.message}`)
    }

    // Delete user's push subscriptions (cascades automatically via FK)
    const { error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (subscriptionsError) {
      console.error('Error deleting push subscriptions:', subscriptionsError)
      // Continue anyway, not critical
    }

    // Delete user profile (now has RLS policy allowing admin to delete)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw new Error(`Error eliminando perfil: ${profileError.message}`)
    }

    // Delete user from auth.users using admin API
    // This requires service_role key which has admin privileges
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      throw new Error(`Error eliminando usuario de autenticación: ${authError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error eliminando usuario'
      },
      { status: 500 }
    )
  }
}
