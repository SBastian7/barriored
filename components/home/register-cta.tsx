import Link from 'next/link'

export function RegisterCTA({ communitySlug }: { communitySlug: string }) {
  const benefits = [
    ['GRATIS', 'Sin costos, sin trámites'],
    ['RÁPIDO', 'Tu perfil listo en 3 minutos'],
    ['VECINOS', '+30K personas del barrio'],
    ['RESEÑAS', 'Construye reputación local'],
  ] as const

  return (
    <section className="px-6 md:px-8 pb-11">
      <div className="max-w-350 mx-auto">
        <div className="border-3 border-black shadow-[6px_6px_0_0_#0A0A0A] overflow-hidden grid md:grid-cols-[3fr_2fr]">
          {/* Left — yellow CTA */}
          <div className="bg-[#FBBF24] p-8 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, #0A0A0A 1.5px, transparent 1.6px)', backgroundSize: '14px 14px' }}
            />
            <div className="relative">
              <span className="inline-block bg-black text-[#FBBF24] font-mono text-[10px] tracking-widest uppercase px-2 py-1 mb-4">
                PARA NEGOCIOS
              </span>
              <h2 className="font-heading font-black italic uppercase text-[clamp(40px,6vw,72px)] leading-[0.88] tracking-tight">
                ¿TIENES UN<br />
                <span className="text-[#E11D48]">NEGOCIO?</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed max-w-sm">
                Regístralo gratis y llega a todos los vecinos del barrio.{' '}
                <strong>Sin barreras, sin costos.</strong>
              </p>
              <Link
                href={`/${communitySlug}/register`}
                className="inline-flex items-center gap-2 mt-5 px-5 py-3 bg-[#E11D48] text-white border-2 border-black shadow-[4px_4px_0_0_#0A0A0A] font-heading font-black uppercase text-sm tracking-wide hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
              >
                REGISTRAR MI NEGOCIO →
              </Link>
            </div>
          </div>

          {/* Right — dark benefits list */}
          <div className="bg-[#0A0A0A] text-white p-8 flex flex-col justify-center gap-4">
            {benefits.map(([title, desc]) => (
              <div key={title} className="flex items-center gap-4">
                <span className="font-heading font-black italic text-[#FBBF24] text-2xl w-28 shrink-0 leading-none">
                  {title}
                </span>
                <span className="text-sm text-white/80">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
