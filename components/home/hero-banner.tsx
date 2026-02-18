import { SearchBar } from '@/components/shared/search-bar'
import type { CommunityData } from '@/lib/types'

export function HeroBanner({ community, businessCount }: { community: CommunityData; businessCount: number }) {
  return (
    <section className="relative bg-background border-b-4 border-black py-20 px-4 overflow-hidden">
      {/* Decorative patterns */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 border-l-4 border-b-4 border-black -translate-y-8 translate-x-8 rotate-12" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/20 border-t-4 border-r-4 border-black translate-y-4 -translate-x-4 -rotate-12" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="inline-block bg-secondary text-black font-bold px-3 py-1 border-2 border-black rotate-[-2deg] mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase text-xs tracking-widest">
            {community.municipality}, Colombia
          </div>

          <h1 className="text-5xl md:text-7xl font-heading font-black mb-4 uppercase tracking-tighter text-shadow-md">
            {community.name}
          </h1>

          <p className="text-xl md:text-2xl font-medium mb-10 max-w-2xl text-balance">
            Impulsando <span className="underline decoration-primary decoration-4 underline-offset-4">{businessCount} negocios</span> que hacen latir nuestro barrio.
          </p>

          <div className="w-full max-w-lg mx-auto transform rotate-[1deg]">
            <SearchBar />
          </div>
        </div>
      </div>
    </section>
  )
}
