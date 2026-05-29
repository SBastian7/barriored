import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceReportSchema } from '@/lib/validations/service-feedback'

const RATE_LIMIT     = 10
const RATE_WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: Request) {
  try {
    const body   = await request.json()
    const parsed = serviceReportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const {
      community_id, service_id, service_name_hint,
      message, reporter_name, reporter_whatsapp,
    } = parsed.data

    const supabase = await createClient()

    if (service_id) {
      const { data: svc } = await supabase
        .from('public_services')
        .select('id')
        .eq('id', service_id)
        .eq('is_active', true)
        .single()

      if (!svc) {
        return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
      }
    }

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count }   = await supabase
      .from('service_feedback' as any)
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .eq('type', 'report')
      .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Demasiados reportes. Espera un momento.' },
        { status: 429 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('service_feedback' as any)
      .insert({
        community_id,
        type:              'report',
        service_id:        service_id        ?? null,
        service_name:      service_name_hint  || null,
        message,
        reporter_id:       user?.id           ?? null,
        reporter_name:     reporter_name      || null,
        reporter_whatsapp: reporter_whatsapp  || null,
        status:            'pending',
      })

    if (error) {
      console.error('[report] insert error:', error)
      return NextResponse.json({ error: 'Error al guardar el reporte.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[report] unhandled error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
