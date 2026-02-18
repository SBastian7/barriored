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
    <div>
      <div className="aspect-video bg-gray-100 relative w-full">
        {photo ? (
          <Image src={photo} alt={name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-lg">Sin foto</div>
        )}
      </div>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{name}</h1>
          {isVerified && <CheckCircle className="h-5 w-5 text-blue-600" />}
        </div>
        <Badge variant="secondary" className="mt-1">{categoryName}</Badge>
      </div>
    </div>
  )
}
