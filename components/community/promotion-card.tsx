import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImageLoader } from '@/components/ui/image-loader'
import { Building, Calendar } from 'lucide-react'
import type { CommunityPost, PromotionMetadata } from '@/lib/types'

interface PromotionCardProps {
  post: CommunityPost
  communitySlug: string
}

export function PromotionCard({ post, communitySlug }: PromotionCardProps) {
  const metadata = post.metadata as PromotionMetadata
  const validUntil = metadata?.valid_until
    ? new Date(metadata.valid_until)
    : null

  return (
    <Link href={`/${communitySlug}/community/promotions/${post.id}`}>
      <Card className="brutalist-card border-secondary shadow-[6px_6px_0px_0px_oklch(0.85_0.17_85)] hover:shadow-[8px_8px_0px_0px_oklch(0.85_0.17_85)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all group">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <Badge className="bg-secondary border-2 border-black uppercase font-bold text-xs text-black">
              Promoción
            </Badge>
            {validUntil && validUntil > new Date() && (
              <Badge variant="outline" className="border-2 border-black text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Hasta {validUntil.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-heading font-black uppercase italic leading-tight group-hover:text-primary transition-colors">
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.image_url && (
            <ImageLoader
              src={post.image_url}
              alt={post.title}
              width={400}
              height={225}
              aspectRatio="16/9"
              className="border-2 border-black"
            />
          )}
          <p className="text-sm line-clamp-3">{post.content}</p>
          {metadata?.linked_business_name && (
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Building className="h-4 w-4" />
              <span>{metadata.linked_business_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
