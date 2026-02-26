import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BusinessHero } from '@/components/business/business-hero'
import { BusinessInfo } from '@/components/business/business-info'
import { LocationMap } from '@/components/business/location-map'
import { WhatsAppButton } from '@/components/shared/whatsapp-button'
import { ShareButton } from '@/components/business/share-button'
import { ReportButton } from '@/components/shared/report-button'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export async function generateMetadata({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { community: commSlug, slug } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, categories(name)')
    .eq('slug', slug)
    .single()

  if (!business) return {}
  return {
    title: `${business.name} | BarrioRed`,
    description: business.description || `${business.name} en BarrioRed`,
  }
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { community: commSlug, slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', commSlug).single()

  if (!community) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single()

  if (!business) notFound()

  // Extract lat/lng from PostGIS geography
  const location = business.location as any
  const lat = location?.coordinates?.[1]
  const lng = location?.coordinates?.[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${commSlug}` },
          { label: 'Directorio', href: `/${commSlug}/directory` },
          { label: business.categories?.name ?? 'Negocio', href: business.categories ? `/${commSlug}/directory/${business.categories.slug}` : undefined },
          { label: business.name, active: true }
        ]}
      />
      <BusinessHero
        name={business.name}
        categoryName={business.categories?.name ?? ''}
        photos={business.photos ?? []}
        isVerified={!!business.is_verified}
      />

      {/* Action buttons row */}
      <div className="flex justify-end gap-3 mb-6">
        <ShareButton
          title={business.name}
          description={business.description || `${business.name} en BarrioRed`}
        />
        <ReportButton entityType="business" entityId={business.id} variant="outline" />
      </div>

      <BusinessInfo
        address={business.address}
        phone={business.phone}
        email={business.email}
        website={business.website}
        hours={business.hours as any}
        description={business.description}
      />
      {lat && lng && <LocationMap lat={lat} lng={lng} name={business.name} address={business.address} />}
      {business.whatsapp && (
        <WhatsAppButton number={business.whatsapp} message={`Hola, te encontre en BarrioRed`} />
      )}
    </div>
  )
}
