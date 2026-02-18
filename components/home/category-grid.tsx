import Link from 'next/link'
import { Card } from '@/components/ui/card'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Category = { id: string; name: string; slug: string; icon: string | null }

export function CategoryGrid({ categories, communitySlug }: { categories: Category[]; communitySlug: string }) {
  return (
    <section className="py-12 px-4 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-heading font-black uppercase italic mb-8 tracking-tight">
          Explora por <span className="text-accent underline decoration-4 underline-offset-4">Categorías</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories.map((cat) => {
            const IconComponent = (cat.icon && (Icons as unknown as Record<string, LucideIcon>)[cat.icon]) || Icons.Store
            return (
              <Link key={cat.id} href={`/${communitySlug}/directory/${cat.slug}`} className="group">
                <Card className="p-6 text-center border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-secondary group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all h-full flex flex-col items-center justify-center">
                  <div className="bg-white border-2 border-black p-3 mb-4 rotate-3 group-hover:rotate-0 transition-transform">
                    <IconComponent className="h-8 w-8 text-black" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-tighter truncate w-full">{cat.name}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
