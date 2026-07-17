import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Check if user is community staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    const isStaff = profile.is_super_admin ||
                    profile.role === 'admin' ||
                    profile.role === 'moderator'

    if (!isStaff) {
      return NextResponse.json(
        { error: 'No tienes permiso para moderar reseñas.' },
        { status: 403 }
      )
    }

    // Delete review (RLS will enforce community isolation for non-super-admins)
    const { error: deleteError } = await supabase
      .from('business_reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar reseña.' },
        { status: 500 }
      )
    }

    // Log audit entry
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete_review',
      entity_type: 'business_review',
      entity_id: reviewId,
      community_id: profile.community_id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/reviews/[reviewId]:', error)
    return NextResponse.json(
      { error: 'Error al eliminar reseña.' },
      { status: 500 }
    )
  }
}
