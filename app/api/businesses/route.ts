import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createBusinessSchema } from '@/lib/validations/business'
import { slugify } from '@/lib/utils'
import { sendBusinessSubmittedEmail } from '@/lib/email/resend'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')

  if (!communityId) {
    return NextResponse.json({ error: 'community_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  let query = (supabase as any)
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, location, created_at, is_featured, categories(name, slug)')
    .eq('status', 'approved')
    .eq('community_id', communityId)
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: businesses, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(businesses, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { latitude, longitude, ...rest } = parsed.data
  const slug = slugify(rest.name)

  // Check if community has boundary and validate location
  const { data: community } = await (supabase
    .from('communities')
    .select('boundary')
    .eq('id', rest.community_id)
    .single() as any)

  if (community?.boundary) {
    // Call PostGIS function to validate
    const { data: isInside, error: validationError } = await (supabase as any).rpc(
      'is_location_in_community_boundary',
      {
        community_uuid: rest.community_id,
        lat: latitude,
        lng: longitude,
      }
    )

    if (validationError) {
      console.error('Boundary validation error:', validationError)
      return NextResponse.json(
        { error: 'Error al validar ubicación' },
        { status: 500 }
      )
    }

    if (!isInside) {
      return NextResponse.json(
        {
          error: 'La ubicación está fuera de los límites de la comunidad',
          code: 'LOCATION_OUTSIDE_BOUNDARY',
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await (supabase as any)
    .from('businesses')
    .insert({
      ...rest,
      slug,
      owner_id: user.id,
      location: `POINT(${longitude} ${latitude})`,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Note: Users maintain 'user' role regardless of business ownership
  // Role changes are only for admin/moderator assignments

  // Bust cache so new pending business shows in admin (future-proof for status changes)
  try {
    const { data: comm } = await (supabase as any)
      .from('communities')
      .select('slug')
      .eq('id', rest.community_id)
      .single()
    if (comm?.slug) revalidateTag(`businesses-${comm.slug}`, 'default')
  } catch (e) {
    console.error('[businesses POST] cache bust failed:', e)
  }

  // Fire-and-forget confirmation email
  const ownerEmail = user.email
  if (ownerEmail) {
    sendBusinessSubmittedEmail(ownerEmail, rest.name).catch(console.error)
  }

  return NextResponse.json(data, { status: 201 })
}
