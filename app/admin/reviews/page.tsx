import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Flag, MessageSquare } from 'lucide-react'
import { AdminReviewsTable } from '@/components/admin/admin-reviews-table'

export const revalidate = 60

export default async function AdminReviewsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
    redirect('/')
  }

  const communityId = profile.community_id as string | null

  // Fetch rating data with community filter
  let ratingQuery = (supabase as any)
    .from('business_reviews')
    .select('rating, businesses!inner(community_id)')

  if (communityId) {
    ratingQuery = ratingQuery.eq('businesses.community_id', communityId)
  }

  const { data: ratingData } = await ratingQuery

  const totalReviews = ratingData?.length || 0
  const avgRating = totalReviews > 0
    ? Math.round((ratingData.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0

  const { count: flaggedCount } = await (supabase as any)
    .from('review_flags')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratingData?.filter((r: any) => r.rating === star).length || 0,
  }))

  return (
    <div className="space-y-6">
      <Breadcrumbs homeHref="/admin" items={[{ label: 'Admin', href: '/admin' }, { label: 'Reseñas', active: true }]} />

      <h1 className="text-3xl font-black uppercase tracking-tighter italic">
        Reseñas <span className="text-primary">Plataforma</span>
      </h1>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="brutalist-card">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-3xl font-black">{totalReviews}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Total Reseñas</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-secondary">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-secondary fill-secondary" />
            <div className="text-3xl font-black">{avgRating}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Promedio</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-red-600">
          <CardContent className="p-4 text-center">
            <Flag className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-3xl font-black">{flaggedCount || 0}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Reportadas</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">Distribución</div>
            {ratingDist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-black">{star}</span>
                <Star className="w-3 h-3 fill-secondary text-secondary" />
                <div className="flex-1 bg-gray-200 h-2 border border-black">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-4 text-right font-bold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AdminReviewsTable communityId={communityId} />
    </div>
  )
}
