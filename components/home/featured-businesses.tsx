import Link from 'next/link'
import Image from 'next/image'
import { whatsappUrl } from '@/lib/utils'
import { getThumbUrl } from '@/lib/image/thumbnail'
import { getCategoryStyle } from '@/lib/category-colors'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  photos: string[] | null
  whatsapp: string | null
  address: string | null
  categories: { name: string; slug: string } | null
  is_featured?: boolean | null
  created_at?: string | null
}

function CategoryBadge({ name, slug, index = 0 }: { name: string; slug: string; index?: number }) {
  const style = getCategoryStyle(slug, index)
  return (
    <span className={`inline-flex items-center ${style.bg} ${style.text} border-2 border-black px-2 py-0.5 font-heading font-bold text-[10px] uppercase tracking-wider shadow-[1px_1px_0_0_#0A0A0A]`}>
      {name}
    </span>
  )
}

function CatPlaceholder({ slug, initials, index = 0 }: { slug: string; initials: string; index?: number }) {
  const style = getCategoryStyle(slug, index)
  return (
    <div className={`w-full h-full ${style.bg} flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,0.15) 12px 14px)'
      }} />
      <span className={`relative font-heading font-black italic text-4xl ${style.text} opacity-60`}>{initials}</span>
    </div>
  )
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function FeaturedCard({ business, communitySlug, rotation = 0 }: { business: Business; communitySlug: string; rotation?: number }) {
  const photo = business.photos?.[0]
  const initials = business.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const catSlug = business.categories?.slug ?? 'otros'

  return (
    <div
      className="br-rot"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="border-3 border-black bg-white shadow-[6px_6px_0_0_#0A0A0A] flex flex-col overflow-hidden h-full">
        {/* Photo */}
        <div className="relative aspect-16/11 border-b-3 border-black">
          {photo ? (
            <Image src={getThumbUrl(photo)} alt={business.name} fill className="object-cover" sizes="25vw" />
          ) : (
            <CatPlaceholder slug={catSlug} initials={initials} />
          )}
          <div className="absolute -top-2 -left-2 bg-[#FBBF24] border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] px-2 py-1 font-heading font-black italic text-[10px] uppercase -rotate-3">
            ★ DESTACADO
          </div>
          <div className="absolute top-2.5 right-2.5">
            {business.categories && (
              <CategoryBadge name={business.categories.name} slug={catSlug} />
            )}
          </div>
        </div>
        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <Link href={`/${communitySlug}/business/${business.slug}`}>
            <h3 className="font-heading font-black italic uppercase text-lg leading-tight hover:text-[#E11D48] transition-colors line-clamp-1">
              {business.name}
            </h3>
          </Link>
          {business.description && (
            <p className="text-xs leading-relaxed text-black/60 line-clamp-2">{business.description}</p>
          )}
          {business.address && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-black/50 uppercase tracking-wide">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <span className="line-clamp-1">{business.address}</span>
            </div>
          )}
          <div className="flex gap-1.5 mt-auto pt-1">
            {business.whatsapp ? (
              <a
                href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#16A34A] text-white border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] font-heading font-bold uppercase text-[10px] tracking-wide hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
              >
                <WhatsAppIcon size={11} /> WHATSAPP
              </a>
            ) : null}
            <Link
              href={`/${communitySlug}/business/${business.slug}`}
              className="inline-flex items-center justify-center px-3 py-2 bg-white text-black border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] font-heading font-bold uppercase text-[10px] tracking-wide hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
            >
              VER →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentCard({ business, communitySlug, daysAgo }: { business: Business; communitySlug: string; daysAgo: number }) {
  const photo = business.photos?.[0]
  const initials = business.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const catSlug = business.categories?.slug ?? 'otros'

  return (
    <div className="border-3 border-black bg-white shadow-[4px_4px_0_0_#0A0A0A] flex flex-col overflow-hidden hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all">
      <div className="relative h-36 border-b-3 border-black">
        {photo ? (
          <Image src={getThumbUrl(photo)} alt={business.name} fill className="object-cover" sizes="33vw" />
        ) : (
          <CatPlaceholder slug={catSlug} initials={initials} />
        )}
        <div className="absolute top-2.5 left-2.5 bg-black text-[#FBBF24] font-mono text-[10px] tracking-widest uppercase px-2 py-1 shadow-[1px_1px_0_0_#0A0A0A]">
          HACE {daysAgo} {daysAgo === 1 ? 'DÍA' : 'DÍAS'}
        </div>
        <div className="absolute top-2.5 right-2.5">
          {business.categories && (
            <CategoryBadge name={business.categories.name} slug={catSlug} />
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <Link href={`/${communitySlug}/business/${business.slug}`}>
          <h3 className="font-heading font-black italic uppercase text-base leading-tight hover:text-[#E11D48] transition-colors line-clamp-1">
            {business.name}
          </h3>
        </Link>
        {business.description && (
          <p className="text-xs leading-relaxed text-black/60 line-clamp-2">{business.description}</p>
        )}
        {business.address && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-black/50 uppercase tracking-wide mt-auto">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span className="line-clamp-1">{business.address}</span>
          </div>
        )}
        <div className="flex gap-1.5 pt-1">
          {business.whatsapp ? (
            <a
              href={whatsappUrl(business.whatsapp, `Hola ${business.name}, te encontré en BarrioRed`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-[#16A34A] text-white border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] font-heading font-bold uppercase text-[9px] tracking-wide hover:-translate-x-px hover:-translate-y-px transition-all"
            >
              <WhatsAppIcon size={10} /> WHATSAPP
            </a>
          ) : null}
          <Link
            href={`/${communitySlug}/business/${business.slug}`}
            className="inline-flex items-center justify-center px-3 py-1.5 bg-white border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] font-heading font-bold uppercase text-[9px] tracking-wide hover:-translate-x-px hover:-translate-y-px transition-all"
          >
            VER →
          </Link>
        </div>
      </div>
    </div>
  )
}

const ROTATIONS = [-1.5, 1, -0.5, 1.5]

export function FeaturedSection({
  businesses,
  communitySlug,
}: {
  businesses: Business[]
  communitySlug: string
}) {
  if (businesses.length === 0) return null

  return (
    <section className="bg-[#0A0A0A] text-white border-t-4 border-b-4 border-black py-11 px-6 md:px-8">
      <div className="max-w-350 mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase text-[#FBBF24] mb-1">LO MEJOR DEL BARRIO</p>
            <h2 className="font-heading font-black italic uppercase text-[clamp(36px,6vw,76px)] leading-[0.88] tracking-tight">
              <span className="text-[#E11D48]">DESTACADOS</span><br />
              DE LA SEMANA
            </h2>
          </div>
          <Link
            href={`/${communitySlug}/directory`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBBF24] text-black border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide self-start sm:self-auto hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0A0A0A] transition-all shrink-0"
          >
            VER TODOS →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {businesses.slice(0, 4).map((b, i) => (
            <FeaturedCard key={b.id} business={b} communitySlug={communitySlug} rotation={ROTATIONS[i] ?? 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function RecentSection({
  businesses,
  communitySlug,
}: {
  businesses: Business[]
  communitySlug: string
}) {
  if (businesses.length === 0) return null

  return (
    <section className="bg-[#FFF7ED] py-11 px-6 md:px-8">
      <div className="max-w-350 mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <h2 className="font-heading font-black italic uppercase text-[clamp(36px,5vw,56px)] leading-[0.9] tracking-tight">
            RECIÉN<br />
            <span className="text-[#E11D48]">LLEGADOS</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-widest uppercase opacity-60">ÚLTIMOS 30 DÍAS</span>
            <span className="inline-block px-3 py-1 bg-[#16A34A] text-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black italic uppercase text-xs -rotate-2">
              +{businesses.length} NUEVOS
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.slice(0, 6).map((b, i) => {
            const createdAt = b.created_at ? new Date(b.created_at) : new Date()
            const daysAgo = Math.max(1, Math.round((Date.now() - createdAt.getTime()) / 86400000))
            return (
              <RecentCard key={b.id} business={b} communitySlug={communitySlug} daysAgo={daysAgo} />
            )
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href={`/${communitySlug}/directory`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E11D48] text-white border-2 border-black shadow-[4px_4px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
          >
            VER DIRECTORIO COMPLETO →
          </Link>
        </div>
      </div>
    </section>
  )
}

/** @deprecated use FeaturedSection + RecentSection */
export function BusinessSection({
  businesses,
  communitySlug,
  title,
  showBadge = false,
}: {
  businesses: Business[]
  communitySlug: string
  title: string
  showBadge?: boolean
}) {
  if (showBadge) return <FeaturedSection businesses={businesses} communitySlug={communitySlug} />
  return <RecentSection businesses={businesses} communitySlug={communitySlug} />
}
