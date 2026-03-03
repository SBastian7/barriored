import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/supabase/admin'

export async function POST() {
  try {
    // Verify admin access
    await checkAdminAccess()

    const supabase = await createClient()

    // Update alerts that are active, have an end date, and that end date has passed
    const { data, error } = await (supabase as any)
      .from('community_alerts')
      .update({ is_active: false })
      .eq('is_active', true)
      .not('ends_at', 'is', null)
      .lt('ends_at', new Date().toISOString())
      .select()

    if (error) {
      console.error('Error deactivating expired alerts:', error)
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      deactivated: data?.length || 0,
      message: `Deactivated ${data?.length || 0} expired alerts`
    })
  } catch (error: any) {
    console.error('Authorization error:', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 403 }
    )
  }
}
