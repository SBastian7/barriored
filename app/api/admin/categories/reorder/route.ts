import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/api-protection'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  // Check permission
  const permissionCheck = await checkPermission(supabase, 'canManageCategories')
  if (!permissionCheck.authorized) {
    return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status })
  }

  try {
    const { reorderedCategories } = await request.json()

    if (!Array.isArray(reorderedCategories)) {
      return NextResponse.json(
        { error: 'reorderedCategories debe ser un array' },
        { status: 400 }
      )
    }

    // Update sort_order for each category
    const updates = reorderedCategories.map(async (item: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)

      if (error) throw error
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    return NextResponse.json(
      { error: 'Error al reordenar categorías' },
      { status: 500 }
    )
  }
}
