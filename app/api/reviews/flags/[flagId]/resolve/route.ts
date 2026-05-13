import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ResolveSchema = z.object({
  action: z.enum(['dismiss', 'remove'], {
    errorMap: () => ({ message: 'Acción inválida.' })
  })
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  try {
    const { flagId } = await params
    const supabase = await createClient()

    if (!UUID_REGEX.test(flagId)) {
      return NextResponse.json({ error: 'ID de reporte inválido.' }, { status: 400 })
    }

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const result = ResolveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { action } = result.data

    // Fetch the flag and linked review
    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .select('id, review_id, status')
      .eq('id', flagId)
      .single()

    if (flagError || !flag) {
      return NextResponse.json({ error: 'Reporte no encontrado.' }, { status: 404 })
    }

    if (action === 'dismiss') {
      const { error } = await supabase
        .from('review_flags')
        .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
        .eq('id', flagId)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === 'remove') {
      // Delete the review — flags will cascade or we update them first
      const { error: reviewError } = await supabase
        .from('business_reviews')
        .delete()
        .eq('id', flag.review_id)

      if (reviewError) throw reviewError

      // Mark flag as reviewed (in case cascade didn't delete it)
      await supabase
        .from('review_flags')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', flagId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/reviews/flags/[flagId]/resolve:', error)
    return NextResponse.json({ error: 'Error al resolver reporte.' }, { status: 500 })
  }
}
