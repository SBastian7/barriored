import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ClassifiedForm } from '@/components/marketplace/classified-form'

export const metadata = {
  title: 'Editar Clasificado | BarrioRed',
  description: 'Edita tu clasificado en el marketplace'
}

export default async function EditClassifiedPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/marketplace/${id}/edit`)
  }

  // Fetch classified (RLS ensures user owns it)
  const { data: classified } = await supabase
    .from('classifieds')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!classified) {
    notFound()
  }

  // Fetch marketplace categories
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Panel de Control', href: '/dashboard' },
          { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
          { label: 'Editar', active: true }
        ]}
      />

      <div>
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic mb-2">
          Editar <span className="text-primary">Clasificado</span>
        </h1>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          {classified.title}
        </p>
      </div>

      <ClassifiedForm
        mode="edit"
        initialData={classified}
        categories={categories || []}
      />
    </div>
  )
}
