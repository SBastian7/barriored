import { SearchBar } from '@/components/shared/search-bar'
import type { CommunityData } from '@/lib/types'

export function HeroBanner({ community, businessCount }: { community: CommunityData; businessCount: number }) {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
        <p className="text-blue-100 mb-6">
          {businessCount} negocios registrados en tu comunidad
        </p>
        <div className="max-w-md mx-auto">
          <SearchBar />
        </div>
      </div>
    </section>
  )
}
