import Link from 'next/link'
import { Card } from '@/components/ui/card'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Category = { id: string; name: string; slug: string; icon: string | null }

export function CategoryGrid({ categories, communitySlug }: { categories: Category[]; communitySlug: string }) {
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-xl font-semibold mb-4">Categorias</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const IconComponent = (cat.icon && (Icons as unknown as Record<string, LucideIcon>)[cat.icon]) || Icons.Store
            return (
              <Link key={cat.id} href={`/${communitySlug}/directory/${cat.slug}`}>
                <Card className="p-4 text-center hover:shadow-md transition-shadow">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium truncate">{cat.name}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
