import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, slug, municipality, description')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">BarrioRed</h1>
          <p className="text-xl text-gray-600">
            Tu barrio, conectado. Descubre los negocios de tu comunidad.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {communities?.map((community) => (
            <Link key={community.id} href={`/${community.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <CardTitle>{community.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {community.municipality} - {community.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {(!communities || communities.length === 0) && (
          <p className="text-center text-gray-500 mt-8">
            Pronto estaremos en tu barrio. ¡Mantente atento!
          </p>
        )}
      </div>
    </main>
  )
}
