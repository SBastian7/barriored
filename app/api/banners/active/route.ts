import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/validations/common'

type BannerPlacement = 'homepage' | 'directory'

const VALID_PLACEMENTS: BannerPlacement[] = ['homepage', 'directory']

/**
 * GET /api/banners/active
 * Public endpoint to retrieve active banners for display
 * Query params: communityId (required), placement (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')
    const placement = searchParams.get('placement') as string | null

    // Validate required parameters
    if (!communityId || !placement) {
      return NextResponse.json(
        { error: 'Se requiere el ID de comunidad y la ubicación.' },
        { status: 400 }
      )
    }

    // Validate communityId is a valid UUID
    if (!isValidUUID(communityId)) {
      return NextResponse.json(
        { error: 'ID de comunidad inválido.' },
        { status: 400 }
      )
    }

    // Validate placement
    if (!VALID_PLACEMENTS.includes(placement as BannerPlacement)) {
      return NextResponse.json(
        { error: 'Ubicación inválida. Debe ser "homepage" o "directory".' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Get active banners
    const { data: banners, error } = await supabase
      .from('banner_ads')
      .select('id, title, image_url, link_url, placement')
      .eq('community_id', communityId)
      .eq('placement', placement)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active banners:', error)
      return NextResponse.json(
        { error: 'Error al obtener los banners.' },
        { status: 500 }
      )
    }

    // Return banners (empty array if none found - this is normal)
    return NextResponse.json({ banners: banners || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/banners/active:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
