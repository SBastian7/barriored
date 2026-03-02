import { createClient } from '@/lib/supabase/server'
import { checkModeratorAccess } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify moderator access
    await checkModeratorAccess()
    const { id } = await params

    const supabase = await createClient()

    // First get current is_pinned value
    const { data: currentPost } = await supabase
      .from('community_posts')
      .select('is_pinned')
      .eq('id', id)
      .single()

    if (!currentPost) {
      return Response.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Toggle is_pinned
    const { data, error } = await supabase
      .from('community_posts')
      .update({ is_pinned: !currentPost.is_pinned })
      .eq('id', id)
      .select('*, profiles(full_name), communities(name, slug)')
      .single()

    if (error) {
      console.error('Error toggling pin:', error)
      return Response.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      data,
      is_pinned: data.is_pinned
    })
  } catch (error: any) {
    console.error('Authorization or processing error:', error)
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }
}
