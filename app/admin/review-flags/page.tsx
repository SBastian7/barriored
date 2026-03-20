'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { FlaggedReviewsTable } from '@/components/admin/flagged-reviews-table'
import { Loader2 } from 'lucide-react'

export default function AdminReviewFlagsPage() {
  const [communityId, setCommunityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_super_admin, community_id')
        .eq('id', user.id)
        .single<{
          role: string | null
          is_super_admin: boolean | null
          community_id: string | null
        }>()

      if (!profile?.is_super_admin && profile?.role !== 'admin') {
        redirect('/')
        return
      }

      setCommunityId(profile.community_id)
      setLoading(false)
    }

    checkAccess()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!communityId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="brutalist-card p-12 text-center border-red-600">
          <p className="font-bold uppercase tracking-widest text-red-600">
            Error: No se pudo determinar la comunidad
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Reseñas Reportadas', active: true }
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic border-b-4 border-black pb-2">
          Reseñas <span className="text-primary">Reportadas</span>
        </h1>
      </div>

      <FlaggedReviewsTable communityId={communityId} />
    </div>
  )
}
