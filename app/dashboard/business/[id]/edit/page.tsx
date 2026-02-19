import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditBusinessForm } from '@/components/dashboard/edit-business-form'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

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
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Panel de Control', href: '/dashboard' },
          { label: `Editar: ${business.name}`, active: true }
        ]}
      />
      <h1 className="text-4xl font-heading font-black uppercase tracking-tighter italic border-b-4 border-black pb-4 mb-12">
        Editar: <span className="text-primary italic">{business.name}</span>
      </h1>
      <div className="max-w-3xl">
        <EditBusinessForm business={business} />
      </div>
    </div>
  )
}
