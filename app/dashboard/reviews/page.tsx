import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyReviews } from '@/components/reviews/my-reviews'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export const metadata = {
  title: 'Mis Reseñas | BarrioRed',
  description: 'Administra todas tus reseñas en un solo lugar'
}

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/reviews')
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mis Reseñas', active: true }
        ]}
      />

      <header className="mb-8 mt-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic">
          Mis Re<span className="text-primary">señas</span>
        </h1>
        <p className="text-lg font-bold text-black/60 uppercase tracking-widest mt-2">
          Administra todas tus reseñas en un solo lugar
        </p>
      </header>

      <MyReviews userId={user.id} />
    </div>
  )
}
