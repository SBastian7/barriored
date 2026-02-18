import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditBusinessForm } from '@/components/dashboard/edit-business-form'

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single()

  if (!business) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar: {business.name}</h1>
      <EditBusinessForm business={business} />
    </div>
  )
}
