export function MarqueeStrip() {
  const items = ['DEL BARRIO', 'PARA EL BARRIO', 'HECHO AQUÍ', 'VECINOS CONECTADOS', 'NEGOCIO LOCAL', 'ABIERTO HOY']

  return (
    <div className="bg-[#E11D48] border-b-4 border-black py-3 overflow-hidden">
      <div className="flex">
        {/* Two copies for seamless loop */}
        <div className="br-marquee-track flex gap-0 shrink-0">
          {[...items, ...items].map((t, i) => (
            <span key={i} className="flex items-center gap-6 px-6">
              <span className="font-heading font-black italic uppercase text-white text-2xl leading-none whitespace-nowrap">
                {t}
              </span>
              <span className="text-[#FBBF24] text-xl">✦</span>
            </span>
          ))}
        </div>
        <div className="br-marquee-track flex gap-0 shrink-0" aria-hidden>
          {[...items, ...items].map((t, i) => (
            <span key={i} className="flex items-center gap-6 px-6">
              <span className="font-heading font-black italic uppercase text-white text-2xl leading-none whitespace-nowrap">
                {t}
              </span>
              <span className="text-[#FBBF24] text-xl">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
