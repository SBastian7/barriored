import Link from 'next/link'
import type { CommunityData } from '@/lib/types'

export function HeroBanner({
  community,
  businessCount,
}: {
  community: CommunityData
  businessCount: number
}) {
  const nameParts = community.name.split(' ')
  const firstWord = nameParts[0]
  const rest = nameParts.slice(1).join(' ')

  const hasCover = !!community.cover_image_url

  return (
    <section
      className="relative overflow-hidden border-b-4 border-black"
      style={hasCover ? {
        backgroundImage: `url(${community.cover_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { backgroundColor: '#FFF7ED' }}
    >
      {/* Dark photo overlay OR diagonal pattern */}
      {hasCover ? (
        <div className="absolute inset-0 bg-black/65 pointer-events-none" />
      ) : (
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(10,10,10,0.07) 12px 14px)' }}
        />
      )}
      {/* Red blob top-right */}
      <div className="absolute -top-20 -right-20 w-90 h-90 rounded-full bg-[#E11D48] border-4 border-black shadow-[-12px_12px_0_0_#0A0A0A] pointer-events-none opacity-80" />
      {/* Yellow square accent */}
      <div className="absolute top-20 right-10 w-28 h-28 bg-[#FBBF24] border-4 border-black rotate-8 shadow-[6px_6px_0_0_#0A0A0A] pointer-events-none hidden md:block opacity-90" />

      <div className="relative px-6 md:px-8 py-10 md:py-14 grid md:grid-cols-[1.6fr_1fr] gap-8 items-center max-w-350 mx-auto">
        {/* Left — big type */}
        <div>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="inline-block px-3 py-1.5 bg-[#FBBF24] border-[2.5px] border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black italic text-xs uppercase tracking-wide -rotate-2">
              ✦ {community.municipality} · {community.department}
            </span>
            <span className="inline-block bg-black text-white font-mono text-[11px] tracking-widest uppercase px-2 py-1">
              {community.description ? community.description.split(',')[0] : 'BARRIO LOCAL'}
            </span>
          </div>

          <h1 className={`font-heading font-black italic uppercase leading-[0.84] tracking-[-0.035em] text-[clamp(56px,10vw,120px)] ${hasCover ? 'text-white' : ''}`}>
            <span className="block">{firstWord}</span>
            {rest && (
              <span className="block text-[#E11D48] ml-8">{rest}</span>
            )}
            <span className={`block font-heading font-black not-italic text-[clamp(16px,2vw,28px)] tracking-wide leading-normal mt-3 ${hasCover ? 'text-white/90' : 'text-black/90'}`}>
              {community.description ?? 'el barrio que se mueve.'}
            </span>
          </h1>

          <div className="flex flex-wrap gap-3 mt-7">
            <Link
              href={`/${community.slug}/directory`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#E11D48] text-white border-2 border-black shadow-[4px_4px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
            >
              VER TODOS LOS NEGOCIOS →
            </Link>
            <Link
              href={`/${community.slug}/directory`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-black text-white border-2 border-black shadow-[4px_4px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
            >
              ABRIR EL MAPA
            </Link>
          </div>
        </div>

        {/* Right — rotated stat stickers */}
        <div className="hidden md:flex flex-col gap-4">
          <div className="bg-white border-3 border-black shadow-[6px_6px_0_0_#0A0A0A] p-5 -rotate-2">
            <p className="font-mono text-[11px] tracking-widest uppercase text-black/60 mb-1">◉ EN VIVO</p>
            <p className="font-heading font-black italic text-[#E11D48] text-6xl leading-none">{businessCount}</p>
            <p className="font-mono font-bold text-[11px] tracking-widest uppercase mt-1">NEGOCIOS VERIFICADOS</p>
          </div>
          <div className="bg-[#FBBF24] border-3 border-black shadow-[6px_6px_0_0_#0A0A0A] p-4 rotate-3 ml-16">
            <p className="font-heading font-black italic text-4xl leading-none">+30K</p>
            <p className="font-mono font-bold text-[11px] tracking-widest uppercase mt-1">VECINOS CONECTADOS</p>
          </div>
          <div className="bg-[#2563EB] text-white border-3 border-black shadow-[6px_6px_0_0_#0A0A0A] p-4 -rotate-3">
            <p className="font-heading font-black italic text-4xl leading-none">100%</p>
            <p className="font-mono font-bold text-[11px] tracking-widest uppercase mt-1 text-white">LOCAL · BARRIO</p>
          </div>
        </div>

        {/* Mobile stats strip (instead of tilted cards) */}
        <div className="md:hidden grid grid-cols-3 border-2 border-black shadow-[4px_4px_0_0_#0A0A0A]">
          {[
            { v: String(businessCount), l: 'NEGOCIOS', bg: 'bg-[#E11D48]', fg: 'text-white' },
            { v: '+30K', l: 'VECINOS', bg: 'bg-[#FBBF24]', fg: 'text-black' },
            { v: '100%', l: 'LOCAL', bg: 'bg-[#2563EB]', fg: 'text-white' },
          ].map((s, i, arr) => (
            <div key={s.l} className={`${s.bg} ${s.fg} px-3 py-2 ${i < arr.length - 1 ? 'border-r-2 border-black' : ''}`}>
              <p className="font-heading font-black italic text-2xl leading-none">{s.v}</p>
              <p className="font-mono text-[9px] tracking-widest uppercase font-bold">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
