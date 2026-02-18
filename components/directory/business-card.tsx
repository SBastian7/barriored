import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/utils'

type BusinessCardProps = {
  business: {
    id: string; name: string; slug: string; description: string | null
    photos: string[] | null; whatsapp: string | null; address: string | null
    categories: { name: string; slug: string } | null
  }
  communitySlug: string
}

export function BusinessCard({ business, communitySlug }: BusinessCardProps) {
  const photo = business.photos?.[0]

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/${communitySlug}/business/${business.slug}`}>
        <div className="aspect-video bg-gray-100 relative">
          {photo ? (
            <Image src={photo} alt={business.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">Sin foto</div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/${communitySlug}/business/${business.slug}`}>
          <h3 className="font-semibold truncate">{business.name}</h3>
        </Link>
        {business.categories && (
          <Badge variant="secondary" className="mt-1 text-xs">{business.categories.name}</Badge>
        )}
        {business.address && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {business.address}
          </p>
        )}
        {business.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{business.description}</p>
        )}
        {business.whatsapp && (
          <a href={whatsappUrl(business.whatsapp, `Hola, te encontre en BarrioRed`)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="mt-3 w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}
