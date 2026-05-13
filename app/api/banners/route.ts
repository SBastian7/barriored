import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/validations/common'
import type { BannerAd } from '@/lib/types/database'

/**
 * GET /api/banners
 * Authenticated endpoint to retrieve all banners for a specific business
 * Query params: businessId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Inicia sesión para ver tus banners.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Validate required parameter
    if (!businessId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del negocio.' },
        { status: 400 }
      )
    }

    // Validate businessId is a valid UUID
    if (!isValidUUID(businessId)) {
      return NextResponse.json(
        { error: 'ID de negocio inválido.' },
        { status: 400 }
      )
    }

    // Verify user owns the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado.' },
        { status: 404 }
      )
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver los banners de este negocio.' },
        { status: 403 }
      )
    }

    // Get all banners for this business (all statuses)
    const { data: banners, error: bannersError } = await supabase
      .from('banner_ads')
      .select('*')
      .eq('business_id', businessId)
      .order('requested_at', { ascending: false })

    if (bannersError) {
      console.error('Error fetching banners:', bannersError)
      return NextResponse.json(
        { error: 'Error al obtener los banners.' },
        { status: 500 }
      )
    }

    // Return banners (empty array if none found - this is normal)
    return NextResponse.json({ banners: banners || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/banners:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
