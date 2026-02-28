import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check permission (admins only can export)
  const auth = await requirePermission('canExportData', supabase)
  if (!auth.authorized) return auth.error

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id, is_super_admin')
    .eq('id', user!.id)
    .single() as { data: any }

  // Build query
  let query = supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      status,
      created_at,
      address,
      phone,
      whatsapp,
      email,
      website,
      is_featured,
      categories(name),
      profiles!businesses_owner_id_profiles_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  // Filter by community for non-super-admins
  if (!profile?.is_super_admin && profile?.community_id) {
    query = query.eq('community_id', profile.community_id)
  }

  const { data: businesses, error } = await query

  if (error) {
    console.error('Error fetching businesses for export:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate CSV
  const headers = [
    'ID',
    'Nombre',
    'Slug',
    'Categoría',
    'Estado',
    'Fecha Creación',
    'Dirección',
    'Teléfono',
    'WhatsApp',
    'Email',
    'Sitio Web',
    'Destacado',
    'Propietario',
    'Email Propietario',
  ]

  const rows = businesses?.map((b: any) => [
    b.id,
    b.name,
    b.slug,
    (b.categories as any)?.name || '',
    b.status || '',
    b.created_at ? new Date(b.created_at).toLocaleDateString('es-CO') : '',
    b.address || '',
    b.phone || '',
    b.whatsapp || '',
    b.email || '',
    b.website || '',
    b.is_featured ? 'Sí' : 'No',
    (b.profiles as any)?.full_name || '',
    (b.profiles as any)?.email || '',
  ]) || []

  // Escape CSV values (wrap in quotes, escape existing quotes)
  const escapeCSV = (value: string) => {
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  // Add BOM for proper UTF-8 encoding in Excel
  const bom = '\uFEFF'
  const csvWithBOM = bom + csv

  // Return CSV file
  return new NextResponse(csvWithBOM, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="negocios-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
