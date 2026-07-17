import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buckets = ['business-images', 'community-posts', 'profiles', 'community-logos']
    const storageData = []

    // Query Supabase Storage API for each bucket
    for (const bucketName of buckets) {
      const { data: files, error } = await supabase.storage.from(bucketName).list()

      if (error) {
        console.error(`Error fetching bucket ${bucketName}:`, error)
        continue
      }

      // Calculate total size and count
      let totalSize = 0
      let fileCount = 0

      if (files) {
        for (const file of files) {
          // Note: Supabase Storage list() doesn't return size, we need to fetch metadata
          // For now, store count only and note this limitation
          fileCount += 1
        }
      }

      storageData.push({
        bucket_name: bucketName,
        total_size_bytes: totalSize, // Will be 0 for now
        file_count: fileCount,
        community_id: null // We'll enhance this later to map files to communities
      })
    }

    // Insert snapshot into analytics table
    const { error: insertError } = await (supabase
      .from('image_storage_analytics') as any)
      .insert(storageData)

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      buckets: storageData.length
    })
  } catch (error) {
    console.error('Storage sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync storage'
    }, { status: 500 })
  }
}
