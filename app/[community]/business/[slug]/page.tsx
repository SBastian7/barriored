import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReviewList } from '@/components/reviews/review-list'
import { WriteReviewButton } from '@/components/reviews/write-review-button'
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker'
import { BusinessFavoriteButton } from '@/components/business/business-favorite-button'
import { ShareButton } from '@/components/business/share-button'
import { ReportButton } from '@/components/shared/report-button'
import { BusinessCard } from '@/components/directory/business-card'
import { getCategoryStyle } from '@/lib/category-colors'
import { whatsappUrl } from '@/lib/utils'
import { getThumbUrl } from '@/lib/image/thumbnail'
import { WhatsAppShareButton } from '@/components/business/whatsapp-share-button'
import { BusinessLocationMap } from '@/components/business/business-location-map'

export async function generateMetadata({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description')
    .eq('slug', slug)
    .single<{ name: string; description: string | null }>()
  if (!business) return {}
  return {
    title: `${business.name} | BarrioRed`,
    description: business.description || `${business.name} en BarrioRed`,
  }
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-px" style={{ fontSize: size }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < Math.round(value) ? '#E11D48' : 'rgba(0,0,0,0.18)' }}>★</span>
      ))}
    </span>
  )
}

function CatPlaceholder({ slug, initials, size = 'md' }: { slug: string; initials: string; size?: 'md' | 'lg' }) {
  const style = getCategoryStyle(slug)
  return (
    <div className={`w-full h-full ${style.bg} flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,0.15) 12px 14px)'
      }} />
      <span className={`relative font-heading font-black italic ${size === 'lg' ? 'text-7xl' : 'text-4xl'} ${style.text} opacity-50`}>{initials}</span>
    </div>
  )
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { community: commSlug, slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', commSlug).single<{ id: string; name: string }>()
  if (!community) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single<{ id: string; [key: string]: any }>()
  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let isFavorited = false
  if (user) {
    const { data: fav } = await (supabase as any)
      .from('business_favorites').select('id')
      .eq('user_id', user.id).eq('business_id', business.id).single()
    isFavorited = !!fav
  }

  const { data: reviewStats } = await supabase
    .from('business_reviews').select('rating').eq('business_id', business.id)

  const reviewCount = reviewStats?.length ?? 0
  const averageRating = reviewCount > 0 && reviewStats
    ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0

  const [linkedEventsRes, linkedJobsRes, relatedRes] = await Promise.all([
    supabase.from('community_posts').select('*').eq('type', 'event').eq('status', 'approved')
      .contains('metadata', { linked_business_id: business.id }).order('created_at', { ascending: false }).limit(3),
    supabase.from('community_posts').select('*').eq('type', 'job').eq('status', 'approved')
      .contains('metadata', { linked_business_id: business.id }).order('created_at', { ascending: false }).limit(3),
    (supabase as any).from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id).eq('status', 'approved')
      .eq('categories.slug', business.categories?.slug).neq('id', business.id).limit(4),
  ])

  const linkedEvents = linkedEventsRes.data ?? []
  const linkedJobs = linkedJobsRes.data ?? []
  const relatedBusinesses = (relatedRes.data ?? []).filter(Boolean)

  const catSlug = business.categories?.slug ?? 'otros'
  const catStyle = getCategoryStyle(catSlug)
  const initials = business.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const photos: string[] = business.photos ?? []
  const lat = business?.latitude as number | undefined
  const lng = business?.longitude as number | undefined

  const hours: Array<[string, string]> = Array.isArray(business.hours)
    ? business.hours
    : business.hours
      ? Object.entries(business.hours as Record<string, string>)
      : []

  const tags: string[] = [
    business.categories?.name,
    ...(business.tags ?? []),
  ].filter(Boolean)

  return (
    <div className="pb-24 md:pb-0">
      <AnalyticsTracker businessId={business.id} />

      {/* ── MAGAZINE HERO ── */}
      <section className="border-b-4 border-black">
        <div className="grid md:grid-cols-[1fr_1.2fr]">
          {/* Left — red slab */}
          <div className="bg-[#E11D48] text-white px-6 md:px-8 py-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.6px)',
              backgroundSize: '14px 14px'
            }} />
            {/* Breadcrumb */}
            <div className="relative flex gap-1.5 items-center flex-wrap mb-5">
              <Link href={`/${commSlug}`} className="font-mono text-[10px] tracking-widest uppercase text-white/60 hover:text-white transition-colors">INICIO</Link>
              <span className="text-white/40">›</span>
              <Link href={`/${commSlug}/directory`} className="font-mono text-[10px] tracking-widest uppercase text-white/60 hover:text-white transition-colors">DIRECTORIO</Link>
              {business.categories && (
                <>
                  <span className="text-white/40">›</span>
                  <Link href={`/${commSlug}/directory`} className="font-mono text-[10px] tracking-widest uppercase text-white/60 hover:text-white transition-colors">{business.categories.name.toUpperCase()}</Link>
                </>
              )}
            </div>

            <div className="relative flex flex-wrap gap-2 items-center mb-5">
              <span className={`inline-block ${catStyle.bg} ${catStyle.text} border-2 border-black px-2 py-0.5 font-heading font-bold text-[10px] uppercase tracking-wider shadow-[1px_1px_0_0_#0A0A0A]`}>
                {business.categories?.name ?? 'NEGOCIO'}
              </span>
              {business.is_verified && (
                <span className="inline-block bg-black text-[#FBBF24] border-2 border-black font-mono text-[10px] tracking-widest uppercase px-2 py-0.5">
                  ◉ VERIFICADO
                </span>
              )}
            </div>

            <h1 className="relative font-heading font-black italic uppercase text-[clamp(44px,7vw,96px)] leading-[0.85] tracking-tight">
              {business.name.split(' ').map((word: string, i: number) => (
                <span key={i} className="block" style={{ color: i === 1 ? '#FBBF24' : 'white' }}>
                  {word.toUpperCase()}
                </span>
              ))}
            </h1>

            {business.description && (
              <p className="relative mt-5 text-base italic font-medium leading-snug max-w-sm opacity-90">
                &ldquo;{business.description}&rdquo;
              </p>
            )}

            {reviewCount > 0 && (
              <div className="relative flex items-center gap-3 mt-5">
                <Stars value={averageRating} size={20} />
                <span className="font-heading font-black italic text-[#FBBF24] text-3xl leading-none">{averageRating.toFixed(1)}</span>
                <span className="font-mono text-[11px] tracking-widest uppercase text-white/70">{reviewCount} RESEÑAS</span>
              </div>
            )}
          </div>

          {/* Right — photo collage (only show slots that have photos) */}
          <div className="bg-[#0A0A0A] p-4 min-h-72 md:min-h-96">
            {photos.length === 0 ? (
              <div className="border-3 border-black h-full overflow-hidden relative">
                <CatPlaceholder slug={catSlug} initials={initials} size="lg" />
              </div>
            ) : photos.length === 1 ? (
              <div className="border-3 border-black h-full overflow-hidden relative br-rot" style={{ transform: 'rotate(-1deg)' }}>
                <Image src={photos[0]} alt={business.name} fill className="object-cover" sizes="50vw" priority />
              </div>
            ) : photos.length === 2 ? (
              <div className="grid grid-cols-[2fr_1fr] gap-3 h-full">
                <div className="border-3 border-black overflow-hidden relative br-rot" style={{ transform: 'rotate(-1deg)' }}>
                  <Image src={photos[0]} alt={business.name} fill className="object-cover" sizes="30vw" priority />
                </div>
                <div className="border-3 border-black overflow-hidden relative br-rot" style={{ transform: 'rotate(2deg)' }}>
                  <Image src={getThumbUrl(photos[1])} alt={`${business.name} 2`} fill className="object-cover" sizes="15vw" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[2fr_1fr] grid-rows-2 gap-3 h-full relative">
                <div className="border-3 border-black row-span-2 overflow-hidden relative br-rot" style={{ transform: 'rotate(-1deg)' }}>
                  <Image src={photos[0]} alt={business.name} fill className="object-cover" sizes="30vw" priority />
                </div>
                <div className="border-3 border-black overflow-hidden relative br-rot" style={{ transform: 'rotate(2deg)' }}>
                  <Image src={getThumbUrl(photos[1])} alt={`${business.name} 2`} fill className="object-cover" sizes="15vw" />
                </div>
                <div className="border-3 border-black overflow-hidden relative br-rot" style={{ transform: 'rotate(-2deg)' }}>
                  <Image src={getThumbUrl(photos[2])} alt={`${business.name} 3`} fill className="object-cover" sizes="15vw" />
                </div>
                {photos.length > 3 && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-block bg-[#FBBF24] border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] px-2 py-1 font-heading font-black italic uppercase text-[11px] rotate-6">
                      ★ +{photos.length - 3} FOTOS
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA bar */}
        <div className="bg-[#0A0A0A] px-6 md:px-8 py-3.5 flex flex-wrap gap-3 items-center justify-between border-t-3 border-black">
          <div className="flex items-center gap-3 text-white flex-wrap">
            <span className="text-[#16A34A] font-mono text-[10px]">●</span>
            <span className="font-heading font-black uppercase text-sm text-white">ABIERTO AHORA</span>
            {business.address && (
              <span className="font-mono text-[10px] tracking-widest uppercase text-white/50">· {business.address}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {business.whatsapp && (
              <a
                href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] text-white border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
              >
                <WhatsAppIcon size={14} /> ESCRIBIR POR WHATSAPP
              </a>
            )}
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBBF24] text-black border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                LLAMAR
              </a>
            )}
            {lat && lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                CÓMO LLEGAR
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── TAG MARQUEE ── */}
      {tags.length > 0 && (
        <div className="bg-[#FBBF24] border-b-3 border-black py-2.5 overflow-hidden">
          <div className="flex">
            <div className="br-marquee-track flex shrink-0">
              {[...tags, ...tags, ...tags, ...tags].map((t, i) => (
                <span key={i} className="flex items-center gap-4 px-4">
                  <span className="font-heading font-black italic uppercase text-base whitespace-nowrap">{t}</span>
                  <span className="text-[#E11D48]">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="px-6 md:px-8 py-8 grid md:grid-cols-[1fr_360px] gap-7 max-w-[1400px] mx-auto">
        {/* Main content */}
        <div className="flex flex-col gap-8 min-w-0">

          {/* Story / About */}
          <article>
            <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-2">ACERCA DEL NEGOCIO</p>
            <h2 className="font-heading font-black italic uppercase text-[clamp(28px,4vw,48px)] leading-[0.9] tracking-tight mb-4">
              LA <span className="text-[#E11D48]">HISTORIA</span>
            </h2>
            {business.description ? (
              <p className="text-base leading-relaxed text-black/70 md:columns-2 md:gap-8">{business.description}</p>
            ) : (
              <p className="text-base leading-relaxed text-black/50 italic">Sin descripción por ahora.</p>
            )}
          </article>

          {/* Highlight stats (if we have rating data) */}
          {reviewCount > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { v: averageRating.toFixed(1) + '★', l: `PROMEDIO DE ${reviewCount} RESEÑAS`, bg: 'bg-[#2563EB]', fg: 'text-white' },
                { v: String(reviewCount), l: 'OPINIONES TOTALES', bg: 'bg-[#FBBF24]', fg: 'text-black' },
                { v: '95%', l: 'SATISFACCIÓN', bg: 'bg-[#E11D48]', fg: 'text-white' },
              ].map((s, i) => (
                <div key={i} className={`border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] p-4 ${s.bg} ${s.fg}`}>
                  <p className="font-heading font-black italic text-[clamp(28px,3.5vw,44px)] leading-none">{s.v}</p>
                  <p className="font-mono text-[9px] tracking-widest uppercase mt-2 font-bold opacity-80">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h2 className="font-heading font-black italic uppercase text-[clamp(28px,4vw,48px)] leading-[0.9] tracking-tight">
                LO QUE DICEN LOS <span className="text-[#E11D48]">VECINOS</span>
              </h2>
              <WriteReviewButton
                businessId={business.id}
                businessName={business.name}
                businessOwnerId={business.owner_id}
                currentUserId={user?.id ?? null}
              />
            </div>
            <ReviewList
              businessId={business.id}
              businessName={business.name}
              currentUserId={user?.id ?? null}
              businessOwnerId={business.owner_id}
            />
          </div>

          {/* Linked events */}
          {linkedEvents.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-2">EVENTOS RELACIONADOS</p>
              <div className="flex flex-col gap-2">
                {linkedEvents.map((event: any) => (
                  <Link
                    key={event.id}
                    href={`/${commSlug}/community`}
                    className="border-3 border-black p-4 bg-[#FBBF24] shadow-[3px_3px_0_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
                  >
                    <h3 className="font-heading font-black italic uppercase text-sm">{event.title}</h3>
                    <p className="font-mono text-[10px] tracking-widest uppercase mt-1 text-black/60">
                      {new Date(event.metadata.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Linked jobs */}
          {linkedJobs.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-2">OFERTAS DE EMPLEO</p>
              <div className="flex flex-col gap-2">
                {linkedJobs.map((job: any) => (
                  <Link
                    key={job.id}
                    href={`/${commSlug}/community`}
                    className="border-3 border-black p-4 bg-[#2563EB] text-white shadow-[3px_3px_0_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
                  >
                    <h3 className="font-heading font-black italic uppercase text-sm">{job.title}</h3>
                    {job.metadata?.category && (
                      <p className="font-mono text-[10px] tracking-widest uppercase mt-1 text-white/70">{job.metadata.category}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Hours */}
          {hours.length > 0 && (
            <div className="border-3 border-black overflow-hidden shadow-[4px_4px_0_0_#0A0A0A]">
              <div className="bg-[#16A34A] text-white px-4 py-2.5 border-b-3 border-black flex justify-between items-center">
                <span className="font-mono text-[11px] tracking-widest uppercase font-bold">● ABIERTO</span>
              </div>
              <div className="bg-[#0A0A0A] px-4 py-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-[#FBBF24] mb-3">HORARIO COMPLETO</p>
                {hours.map(([day, time], i) => (
                  <div key={i} className="flex justify-between py-1.5" style={{ borderBottom: i < hours.length - 1 ? '1px dashed rgba(255,255,255,0.15)' : 'none' }}>
                    <span className="font-mono text-[11px] tracking-widest uppercase text-white/80">{day}</span>
                    <span className="font-mono text-[11px] font-bold text-white">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location map */}
          {lat && lng && (
            <div className="border-3 border-black overflow-hidden shadow-[4px_4px_0_0_#0A0A0A]">
              <div className="bg-[#E11D48] text-white px-4 py-2.5 border-b-3 border-black">
                <p className="font-mono text-[11px] tracking-widest uppercase font-bold">◉ DÓNDE QUEDA</p>
                {business.address && (
                  <p className="font-heading font-black italic uppercase text-sm mt-1 leading-tight">{business.address}</p>
                )}
              </div>
              <div className="h-52 overflow-hidden">
                <BusinessLocationMap lat={lat} lng={lng} name={business.name} address={business.address} />
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2563EB] text-white border-t-3 border-black font-heading font-black uppercase text-xs tracking-wide w-full hover:bg-[#1d4ed8] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                CÓMO LLEGAR
              </a>
            </div>
          )}

          {/* Contact */}
          <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] p-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-3">CONTACTO DIRECTO</p>
            <div className="flex flex-col gap-2">
              {business.whatsapp && (
                <a
                  href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#16A34A] text-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all w-full"
                >
                  <WhatsAppIcon size={16} /> WHATSAPP
                </a>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                  {business.phone}
                </a>
              )}
              {business.website && (
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all w-full truncate"
                >
                  {business.website}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] p-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-3">ACCIONES</p>
            <div className="flex flex-col gap-2">
              <BusinessFavoriteButton businessId={business.id} initialFavorited={isFavorited} isLoggedIn={!!user} />
              <ShareButton title={business.name} description={business.description ?? `${business.name} en BarrioRed`} />
              <ReportButton entityType="business" entityId={business.id} variant="outline" />
            </div>
          </div>
        </aside>
      </div>

      {/* ── RELATED BUSINESSES ── */}
      {relatedBusinesses.length > 0 && (
        <section className="bg-[#0A0A0A] text-white border-t-4 border-black px-6 md:px-8 py-10">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <h2 className="font-heading font-black italic uppercase text-[clamp(32px,5vw,56px)] leading-[0.9] tracking-tight">
                NEGOCIOS<br />
                <span className="text-[#E11D48]">SIMILARES</span>
              </h2>
              <Link
                href={`/${commSlug}/directory`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBBF24] text-black border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all shrink-0"
              >
                VER {business.categories?.name?.toUpperCase() ?? 'DIRECTORIO'} →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedBusinesses.slice(0, 4).map((b: any, i: number) => (
                <div key={b.id} className="br-rot" style={{ transform: `rotate(${[-1, 1, -0.5, 0.8][i] ?? 0}deg)` }}>
                  <BusinessCard business={b} communitySlug={commSlug} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SHARE / ENGAGE STRIP ── */}
      <section className="border-t-4 border-black">
        {/* Red band — copy + primary WhatsApp CTA */}
        <div className="bg-[#E11D48] text-white px-6 md:px-8 py-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.6px)',
            backgroundSize: '14px 14px'
          }} />
          <div className="relative max-w-350 mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Left: copy */}
            <div>
              <p className="font-mono text-[11px] tracking-widest uppercase text-[#FBBF24] mb-2">HACÉ BARRIO</p>
              <h2 className="font-heading font-black italic uppercase text-[clamp(40px,6vw,80px)] leading-[0.85] tracking-tight">
                ¿ES BUEN<br />
                <span className="text-[#FBBF24]">{business.name.split(' ')[0].toUpperCase()}?</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed max-w-md opacity-90">
                Recomienda este negocio a tus vecinos. Una reseña tuya ayuda más que cualquier publicidad.{' '}
                <strong><br /> El barrio crece cuando compartimos lo bueno.</strong>
              </p>
            </div>
            {/* Right: WhatsApp hero CTA */}
            <WhatsAppShareButton
              businessName={business.name}
              className="flex items-center gap-5 px-7 py-8 bg-[#16A34A] text-white border-3 border-black shadow-[6px_6px_0_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#0A0A0A] transition-all cursor-pointer"
            >
              <span className="shrink-0 w-14 h-14 flex items-center justify-center bg-white/15 border-2 border-white/30">
                <WhatsAppIcon size={32} />
              </span>
              <div className="text-left">
                <span className="block font-heading font-black italic uppercase text-2xl leading-none">COMPARTIR</span>
                <span className="block font-mono text-[11px] tracking-widest uppercase opacity-80 mt-1.5">RECOMENDAR POR WHATSAPP</span>
                <span className="block text-xs opacity-70 mt-1 not-italic font-normal">Tu recomendación vale más que cualquier aviso</span>
              </div>
            </WhatsAppShareButton>
          </div>
        </div>

        {/* Dark band — secondary actions */}
        {/* <div className="bg-[#0A0A0A] border-t-3 border-black px-6 md:px-8 py-5">
          <div className="max-w-350 mx-auto flex flex-wrap items-center gap-4">
            <p className="font-mono text-[11px] tracking-widest uppercase text-[#FBBF24] shrink-0">TAMBIÉN PUEDES:</p>
            <div className="flex flex-wrap gap-3 items-center" role="group" aria-label="Acciones secundarias">
              <WriteReviewButton
                businessId={business.id}
                businessName={business.name}
                businessOwnerId={business.owner_id}
                currentUserId={user?.id ?? null}
              />
              <BusinessFavoriteButton businessId={business.id} initialFavorited={isFavorited} isLoggedIn={!!user} />
              <ReportButton entityType="business" entityId={business.id} variant="outline" />
            </div>
          </div>
        </div> */}
      </section>

      {/* ── CONTRIBUTE STRIP ── */}
      <section className="bg-[#FFF7ED] px-6 md:px-8 py-8 border-t-4 border-black">
        <div className="max-w-350 mx-auto grid sm:grid-cols-3 gap-4">
          <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] bg-[#FBBF24] p-5 flex flex-col gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all cursor-pointer">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>
            <h4 className="font-heading font-black italic uppercase text-base">¿INFO INCORRECTA?</h4>
            <p className="text-xs leading-relaxed text-black/70">Sugerí una corrección. Mantengamos al barrio al día.</p>
            <span className="font-mono text-[10px] tracking-widest uppercase font-bold mt-auto">SUGERIR CAMBIO →</span>
          </div>
          <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] bg-[#2563EB] text-white p-5 flex flex-col gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all cursor-pointer">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l2-4h14l2 4"/><path d="M3 7v13h18V7"/><path d="M9 20v-6h6v6"/></svg>
            <h4 className="font-heading font-black italic uppercase text-base text-white">¿ES TU NEGOCIO?</h4>
            <p className="text-xs leading-relaxed text-white/80">Reclamá la página y respondé reseñas, publicá eventos y mucho más.</p>
            <Link href={`/${commSlug}/register`} className="font-mono text-[10px] tracking-widest uppercase font-bold mt-auto text-white">RECLAMAR NEGOCIO →</Link>
          </div>
          {user ? (
            <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] bg-[#16A34A] text-white p-5 flex flex-col gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
              <h4 className="font-heading font-black italic uppercase text-base text-white">¡YA ERES DEL BARRIO!</h4>
              <p className="text-xs leading-relaxed text-white/85">Gracias por ser parte de la comunidad. Explorá más negocios, reseñá y conectá con tus vecinos.</p>
              <Link href={`/${commSlug}/community`} className="font-mono text-[10px] tracking-widest uppercase font-bold mt-auto text-[#FBBF24]">VER COMUNIDAD →</Link>
            </div>
          ) : (
            <div className="border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] bg-[#0A0A0A] text-white p-5 flex flex-col gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all cursor-pointer">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M15 20c0-2.5 2-4 4-4"/></svg>
              <h4 className="font-heading font-black italic uppercase text-base text-white">SUMATE AL BARRIO</h4>
              <p className="text-xs leading-relaxed text-white/70">Creá tu cuenta gratis. Reseñá, guardá favoritos y conectá con vecinos.</p>
              <Link href="/auth/signup" className="font-mono text-[10px] tracking-widest uppercase font-bold mt-auto text-[#FBBF24]">CREAR CUENTA →</Link>
            </div>
          )}
        </div>
      </section>

      {/* Mobile sticky CTA bar */}
      {business.whatsapp && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-[#FFF7ED] border-t-3 border-black px-4 py-2.5 grid grid-cols-[2fr_1fr] gap-2 md:hidden">
          <a
            href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-[#16A34A] text-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide"
          >
            <WhatsAppIcon size={15} /> WHATSAPP
          </a>
          {lat && lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 bg-[#2563EB] text-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
              LLEGAR
            </a>
          ) : business.phone ? (
            <a href={`tel:${business.phone}`} className="flex items-center justify-center gap-1.5 py-3 bg-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
              LLAMAR
            </a>
          ) : null}
        </div>
      )}
    </div>
  )
}
