import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch most recent storage snapshot
    let query = (supabase
      .from('image_storage_analytics') as any)
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100)

    // Community admins see only their data
    if (!profile.is_super_admin && profile.community_id) {
      query = query.eq('community_id', profile.community_id)
    }

    const { data: snapshots, error } = await query

    if (error) throw error

    // Aggregate by bucket
    const bucketMap = new Map<string, { bytes: number, count: number }>()
    let totalBytes = 0

    snapshots?.forEach((snap: any) => {
      const existing = bucketMap.get(snap.bucket_name) || { bytes: 0, count: 0 }
      bucketMap.set(snap.bucket_name, {
        bytes: existing.bytes + snap.total_size_bytes,
        count: existing.count + snap.file_count
      })
      totalBytes += snap.total_size_bytes
    })

    const buckets = Array.from(bucketMap.entries()).map(([name, data]) => ({
      name,
      bytes: data.bytes,
      gb: (data.bytes / (1024 ** 3)).toFixed(2),
      file_count: data.count
    }))

    // Get last sync timestamp
    const lastSync = snapshots?.[0]?.recorded_at || null

    return NextResponse.json({
      total: {
        bytes: totalBytes,
        gb: (totalBytes / (1024 ** 3)).toFixed(2)
      },
      buckets,
      last_synced: lastSync
    })
  } catch (error) {
    console.error('Storage summary error:', error)
    return NextResponse.json({
      error: 'Failed to fetch storage summary'
    }, { status: 500 })
  }
}
