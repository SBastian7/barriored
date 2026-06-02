import Link from 'next/link'
import Image from 'next/image'

export function QuickNav({ communitySlug }: { communitySlug: string }) {
  return (
    <section className="px-6 md:px-8 py-11 bg-[#FFF7ED]">
      <div className="max-w-350 mx-auto">
        <h2 className="font-heading font-black italic uppercase text-[clamp(32px,6vw,64px)] leading-[0.9] tracking-tight mb-6">
          ESCOGE TU<br />
          <span className="text-[#E11D48]">CAMINO</span>
          <span className="font-mono text-xs not-italic font-bold tracking-widest ml-3 align-middle opacity-60">04 SECCIONES</span>
        </h2>

        {/* Desktop mosaic grid */}
        <div className="hidden md:grid grid-cols-6 grid-rows-[180px_180px] gap-4">
          {/* Directorio — large anchor */}
          <Link
            href={`/${communitySlug}/directory`}
            className="col-span-4 row-span-2 relative border-3 border-black bg-black text-white shadow-[6px_6px_0_0_#0A0A0A] overflow-hidden flex flex-col justify-between p-6 group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_0_#0A0A0A] transition-all"
          >
            {/* Dark map background */}
            <div className="absolute inset-0 overflow-hidden">
              <Image src="/map_bg2.png" alt="" fill className="object-cover pointer-events-none" />
            </div>
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70 pointer-events-none" />
            <div className="relative">
              <p className="font-mono text-[11px] tracking-widest uppercase text-[#FBBF24] mb-2">SECCIÓN PRINCIPAL · 01</p>
              <h3 className="font-heading font-black italic uppercase text-[clamp(48px,7vw,76px)] leading-[0.88] tracking-tight">DIRECTORIO</h3>
              <p className="mt-3 text-sm leading-relaxed max-w-sm opacity-80">
                Todos los negocios del barrio, filtrables por categoría, ubicación y reseñas. Contacta directo por WhatsApp.
              </p>
            </div>
            <div className="relative flex justify-end" style={{ zIndex: 1 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#E11D48] text-white border-2 border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black uppercase text-xs tracking-wide">
                ABRIR →
              </span>
            </div>
          </Link>

          {/* Comunidad */}
          <Link
            href={`/${communitySlug}/community`}
            className="col-span-2 relative border-3 min-h-20 border-black bg-[#2563EB] text-white shadow-[4px_4px_0_0_#0A0A0A] overflow-hidden flex flex-col justify-between p-4 group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0A0A0A] transition-all"
          >
            <div>
              <p className="font-mono text-[10px] tracking-widest opacity-75">02</p>
              <h3 className="font-heading font-black italic uppercase text-3xl leading-none mt-1">COMUNIDAD</h3>
            </div>
            <div className="flex justify-between items-end">
              <span className="font-heading font-black italic text-3xl">30K+</span>
              <span className="text-xl">→</span>
            </div>
          </Link>

          {/* Marketplace */}
          <Link
            href={`/${communitySlug}/marketplace`}
            className="col-span-1 relative border-3 border-black bg-[#FBBF24] shadow-[4px_4px_0_0_#0A0A0A] overflow-hidden flex flex-col justify-between p-3 group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0A0A0A] transition-all"
          >
            <div>
              <p className="font-mono text-[10px] tracking-widest opacity-60">03</p>
              <h3 className="font-heading font-black uppercase text-lg leading-none mt-1">MARKET</h3>
            </div>
            <p className="font-mono font-bold text-[10px] tracking-widest uppercase">COMPRA · VENDE</p>
          </Link>

          {/* Servicios */}
          <Link
            href={`/${communitySlug}/services`}
            className="col-span-1 relative border-3 border-black bg-[#16A34A] text-white shadow-[4px_4px_0_0_#0A0A0A] overflow-hidden flex flex-col justify-between p-3 group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0A0A0A] transition-all"
          >
            <div>
              <p className="font-mono text-[10px] tracking-widest opacity-75">04</p>
              <h3 className="font-heading font-black uppercase text-lg leading-none mt-1">SERVICIOS</h3>
            </div>
            <p className="font-mono font-bold text-[10px] tracking-widest uppercase text-white">ÚTIL · 24H</p>
          </Link>
        </div>

        {/* Mobile 2×2 grid */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {[
            { label: 'DIRECTORIO', sub: 'Negocios del barrio', href: `/directory`, bg: 'bg-black', fg: 'text-white', num: '01' },
            { label: 'COMUNIDAD', sub: '30K+ vecinos', href: `/community`, bg: 'bg-[#2563EB]', fg: 'text-white', num: '02' },
            { label: 'MARKETPLACE', sub: 'Compra · Vende', href: `/marketplace`, bg: 'bg-[#FBBF24]', fg: 'text-black', num: '03' },
            { label: 'SERVICIOS', sub: 'Info útil · 24h', href: `/services`, bg: 'bg-[#16A34A]', fg: 'text-white', num: '04' },
          ].map((s) => (
            <Link
              key={s.label}
              href={`/${communitySlug}${s.href}`}
              className={`${s.bg} ${s.fg} border-3 border-black shadow-[4px_4px_0_0_#0A0A0A] p-4 flex flex-col gap-2 min-h-27.5 justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all`}
            >
              <div>
                <p className="font-mono text-[9px] tracking-widest opacity-60">{s.num}</p>
                <h3 className="font-heading font-black italic uppercase text-xl leading-tight mt-0.5">{s.label}</h3>
              </div>
              <p className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-75">{s.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
