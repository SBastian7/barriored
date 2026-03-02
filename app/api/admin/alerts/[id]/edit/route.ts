import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    await checkAdminAccess()
    const { id } = await params

    const body = await request.json()
    const { community_id, type, title, description, severity, is_active, ends_at } = body

    if (!community_id || !type || !title || !severity) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('community_alerts')
      .update({
        community_id,
        type,
        title,
        description: description || null,
        severity,
        is_active: is_active !== undefined ? is_active : true,
        ends_at: ends_at || null
      })
      .eq('id', id)
      .select('*, communities(name, slug)')
      .single()

    if (error) {
      console.error('Error updating alert:', error)
      return Response.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return Response.json({ success: true, data })
  } catch (error: any) {
    console.error('Authorization or processing error:', error)
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }
}
