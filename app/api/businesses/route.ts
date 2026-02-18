import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBusinessSchema } from '@/lib/validations/business'
import { slugify } from '@/lib/utils'

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

  const { data, error } = await supabase
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

  // Update user role to merchant if not already
  await supabase.from('profiles').update({ role: 'merchant' }).eq('id', user.id)

  return NextResponse.json(data, { status: 201 })
}
