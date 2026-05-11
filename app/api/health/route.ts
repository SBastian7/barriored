import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const start = Date.now()
  let dbOk = false

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('communities').select('id').limit(1)
    dbOk = !error
  } catch {
    dbOk = false
  }

  const latency = Date.now() - start
  const status = dbOk && latency < 2000 ? 'ok' : 'degraded'

  return NextResponse.json(
    { status, db: dbOk, latencyMs: latency, timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
