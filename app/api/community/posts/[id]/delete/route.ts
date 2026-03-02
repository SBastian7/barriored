import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/supabase/admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access (only admins can delete)
    await checkAdminAccess()
    const { id } = await params

    const supabase = await createClient()

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting post:', error)
      return Response.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return Response.json({ success: true, message: 'Post deleted successfully' })
  } catch (error: any) {
    console.error('Authorization or processing error:', error)
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }
}
