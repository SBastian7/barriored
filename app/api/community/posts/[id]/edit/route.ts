import { createClient } from '@/lib/supabase/server'
import { checkModeratorAccess } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify moderator access
    const { profile } = await checkModeratorAccess()
    const { id } = await params

    const body = await request.json()
    const { title, content, image_url, metadata } = body

    if (!title || !content) {
      return Response.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('community_posts')
      .update({
        title,
        content,
        image_url: image_url || null,
        metadata: metadata || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, profiles(full_name), communities(name, slug)')
      .single()

    if (error) {
      console.error('Error updating post:', error)
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
