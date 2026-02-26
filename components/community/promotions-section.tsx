import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PromotionCard } from '@/components/community/promotion-card'
import { ArrowRight } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

interface PromotionsSectionProps {
  posts: CommunityPost[]
  communitySlug: string
}

export function PromotionsSection({ posts, communitySlug }: PromotionsSectionProps) {
  if (posts.length === 0) return null

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-heading font-black uppercase italic">
          <span className="text-secondary">Promociones</span>
        </h2>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="brutalist-button"
        >
          <Link href={`/${communitySlug}/community/promotions`}>
            Ver todas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PromotionCard
            key={post.id}
            post={post}
            communitySlug={communitySlug}
          />
        ))}
      </div>
    </section>
  )
}
