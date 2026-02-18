import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, MessageCircle, ArrowUpRight } from 'lucide-react'
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
    <Card className="group overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <Link href={`/${communitySlug}/business/${business.slug}`} className="relative block">
        <div className="aspect-video bg-muted relative border-b-2 border-black overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt={business.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground font-bold uppercase tracking-widest text-xs">Sin foto</div>
          )}
          <div className="absolute top-2 right-2 bg-black text-white p-1 border border-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex-1">
          <div className="flex justify-between items-start gap-2 mb-2">
            <Link href={`/${communitySlug}/business/${business.slug}`}>
              <h3 className="font-heading font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1 italic uppercase tracking-tight">
                {business.name}
              </h3>
            </Link>
          </div>

          {business.categories && (
            <Badge className="bg-secondary text-black border-2 border-black hover:bg-secondary mb-3 rounded-none font-bold uppercase text-[10px] tracking-widest">
              {business.categories.name}
            </Badge>
          )}

          {business.description && (
            <p className="text-sm text-foreground/80 line-clamp-2 mb-4 font-medium leading-relaxed">
              {business.description}
            </p>
          )}

          {business.address && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/60 mb-4 uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="line-clamp-1">{business.address}</span>
            </div>
          )}
        </div>

        {business.whatsapp && (
          <a href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)} target="_blank" rel="noopener noreferrer" className="mt-auto">
            <Button className="w-full bg-[#25D366] hover:bg-[#22c35e] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <MessageCircle className="h-4 w-4 mr-2 fill-current" />
              <span className="font-black uppercase tracking-tighter">Contactar</span>
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}
