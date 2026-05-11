import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendAdminFlaggedContentNotification } from '@/lib/notifications/community'

const FlagSchema = z.object({
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres').max(200),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

    const body = await request.json()
    const parsed = FlagSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Get the post and its community
    const { data: post, error: postError } = await (supabase as any)
      .from('community_posts')
      .select('id, title, community_id, author_id, communities!inner(slug)')
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Publicación no encontrada.' }, { status: 404 })
    }

    // Users cannot flag their own posts
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'No puedes reportar tu propia publicación.' }, { status: 400 })
    }

    // Check for duplicate report by this user
    const { data: existing } = await (supabase as any)
      .from('community_reports')
      .select('id')
      .eq('reported_entity_id', id)
      .eq('reporter_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya reportaste esta publicación.' }, { status: 400 })
    }

    // Count existing reports to decide if admin notification is needed
    const { count: existingCount } = await (supabase as any)
      .from('community_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_entity_id', id)
      .eq('reported_entity_type', 'post')

    // Insert the report
    const { error: insertError } = await (supabase as any)
      .from('community_reports')
      .insert({
        community_id: post.community_id,
        reporter_id: user.id,
        reported_entity_id: id,
        reported_entity_type: 'post',
        reason: parsed.data.reason,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error inserting community report:', insertError)
      return NextResponse.json({ error: 'Error al reportar.' }, { status: 500 })
    }

    // Notify admins only on first report (avoids flooding)
    if ((existingCount ?? 0) === 0) {
      sendAdminFlaggedContentNotification(post.community_id, {
        type: 'post',
        title: post.title,
        reason: parsed.data.reason,
        adminPanelUrl: `https://barriored.co/admin/community-posts`,
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/community/posts/[id]/flag:', err)
    return NextResponse.json({ error: 'Error al reportar.' }, { status: 500 })
  }
}
