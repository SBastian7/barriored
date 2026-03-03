import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdminAccess()
    const { id } = await params

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('public_services')
      .select('*, communities(name, slug)')
      .eq('id', id)
      .single()

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return Response.json({ data })
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdminAccess()
    const { id } = await params

    const body = await request.json()
    const { community_id, category, name, description, phone, address, hours, is_active, sort_order } = body

    if (!community_id || !category || !name) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('public_services')
      .update({
        community_id,
        category,
        name,
        description: description || null,
        phone: phone || null,
        address: address || null,
        hours: hours || null,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order !== undefined ? sort_order : 10
      })
      .eq('id', id)
      .select('*, communities(name, slug)')
      .single()

    if (error) {
      console.error('Error updating service:', error)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdminAccess()
    const { id } = await params

    const supabase = await createClient()

    const { error } = await supabase
      .from('public_services')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting service:', error)
      return Response.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Authorization or processing error:', error)
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }
}
