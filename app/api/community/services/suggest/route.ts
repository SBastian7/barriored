import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceSuggestionSchema } from '@/lib/validations/service-feedback'

const RATE_LIMIT     = 20
const RATE_WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: Request) {
  try {
    const body   = await request.json()
    const parsed = serviceSuggestionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const {
      community_id, service_name, category, phone,
      address, message, reporter_name, reporter_whatsapp,
    } = parsed.data

    const supabase    = await createClient()
    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()

    const { count } = await supabase
      .from('service_feedback' as any)
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .eq('type', 'suggestion')
      .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Demasiados envíos. Espera un momento.' },
        { status: 429 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('service_feedback' as any)
      .insert({
        community_id,
        type:              'suggestion',
        service_name,
        category,
        phone,
        address:           address           || null,
        message:           message           || null,
        reporter_id:       user?.id          ?? null,
        reporter_name:     reporter_name     || null,
        reporter_whatsapp: reporter_whatsapp || null,
        status:            'pending',
      })

    if (error) {
      console.error('[suggest] insert error:', error)
      return NextResponse.json({ error: 'Error al guardar la sugerencia.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[suggest] unhandled error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
