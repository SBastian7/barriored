'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, Search, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  businesses: { name: string; slug: string } | null
  profiles: { full_name: string | null } | null
}

export function AdminReviewsTable({ communityId }: { communityId: string | null }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const supabase = createClient()

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      let query = (supabase as any)
        .from('business_reviews')
        .select(`
          id, rating, review_text, created_at,
          businesses!inner(name, slug, community_id),
          profiles!business_reviews_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (communityId) {
        query = query.eq('businesses.community_id', communityId)
      }

      if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter))
      }

      const { data, error } = await query
      if (error) throw error

      const transformed: Review[] = (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        review_text: r.review_text,
        created_at: r.created_at,
        businesses: r.businesses ? { name: r.businesses.name, slug: r.businesses.slug } : null,
        profiles: r.profiles ?? null,
      }))

      const filtered = search.trim()
        ? transformed.filter((r) =>
            r.businesses?.name.toLowerCase().includes(search.toLowerCase()) ||
            r.review_text?.toLowerCase().includes(search.toLowerCase()) ||
            r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
          )
        : transformed

      setReviews(filtered)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar reseñas')
    } finally {
      setLoading(false)
    }
  }, [ratingFilter, search, communityId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function handleDelete(reviewId: string) {
    if (!confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Reseña eliminada')
      fetchReviews()
    } else {
      toast.error('Error al eliminar reseña')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por negocio, usuario o texto..."
            className="brutalist-input pl-10"
          />
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[160px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="5">5 ★</SelectItem>
            <SelectItem value="4">4 ★</SelectItem>
            <SelectItem value="3">3 ★</SelectItem>
            <SelectItem value="2">2 ★</SelectItem>
            <SelectItem value="1">1 ★</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <p className="font-bold uppercase tracking-widest text-black/40">Sin reseñas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <Card key={review.id} className="brutalist-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-secondary text-secondary' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">
                        {review.businesses?.name}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        {review.profiles?.full_name || 'Anónimo'}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-gray-700 line-clamp-2">{review.review_text}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(review.id)}
                    className="brutalist-button border-red-600 text-red-600 hover:bg-red-50 h-9 w-9 flex-shrink-0"
                    title="Eliminar reseña"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
