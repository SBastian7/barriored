import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access (only admins can delete)
    await checkAdminAccess()
    const { id } = await params

    const supabase = await createClient()

    // Get post data before deletion for audit log
    const { data: post } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .single()

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

    // Log audit action
    if (post) {
      await logAuditAction({
        action: 'delete_post',
        entityType: 'post',
        entityId: id,
        oldData: post,
        communityId: post.community_id,
      })
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
