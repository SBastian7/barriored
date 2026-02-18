import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

type Props = {
  name: string
  categoryName: string
  photo: string | null
  isVerified: boolean
}

export function BusinessHeader({ name, categoryName, photo, isVerified }: Props) {
  return (
    <div className="border-b-4 border-black bg-white">
      <div className="aspect-video bg-muted relative w-full overflow-hidden">
        {photo ? (
          <Image src={photo} alt={name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="flex items-center justify-center h-full bg-accent/10 border-b-2 border-black">
            <span className="font-heading font-black uppercase text-black/20 text-4xl italic">Sin Imagen</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <Badge variant="accent" className="text-sm px-4 py-1.5">{categoryName}</Badge>
        </div>
      </div>
      <div className="p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tighter italic leading-none mb-4">
              {name}
            </h1>
            {isVerified && (
              <div className="inline-flex items-center gap-1.5 bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest italic shadow-[2px_2px_0px_0px_rgba(225,29,72,1)]">
                <CheckCircle className="h-3 w-3 text-primary" /> Verificado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
