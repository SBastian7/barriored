import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { RegisterBusinessForm } from '@/components/registration/register-business-form'

export const metadata = { title: 'Registrar negocio | BarrioRed' }

export default async function RegisterPage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase.from('communities').select('name').eq('slug', slug).single()

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: community?.name ?? 'Barrio', href: `/${slug}` },
          { label: 'Registra tu negocio', active: true }
        ]}
      />

      <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tighter italic text-center mb-12">
        Registra tu <span className="text-primary italic">Negocio</span>
      </h1>
      <div className="max-w-3xl mx-auto">
        <RegisterBusinessForm />
      </div>
    </div>
  )
}
