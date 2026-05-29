'use client'

import { useState } from 'react'
import {
  Phone, MapPin, Clock, Bookmark, Siren, Wrench, HeartPulse, Flag,
} from 'lucide-react'
import type { PublicService }      from '@/lib/types'
import { downloadVcf }             from '@/lib/utils/vcf'
import { ServiceSuggestionDialog } from '@/components/community/service-suggestion-dialog'
import { ServiceReportDialog }     from '@/components/community/service-report-dialog'
import type React from 'react'

const GROUPS = {
  emergency: { label: 'EMERGENCIAS',        short: 'EMERGENCIAS', color: '#E11D48', Icon: Siren,     patternClass: 'br-pattern-diag' },
  health:    { label: 'SALUD',              short: 'SALUD',       color: '#16A34A', Icon: HeartPulse, patternClass: 'br-pattern-grid' },
  utilities: { label: 'SERVICIOS PÚBLICOS', short: 'SERVICIOS',   color: '#2563EB', Icon: Wrench,     patternClass: 'br-pattern-dots' },
} as const

type GroupKey    = keyof typeof GROUPS
type ActiveFilter = 'todos' | GroupKey

const DISPLAY_GROUPS: GroupKey[] = ['emergency', 'health', 'utilities']

interface Props {
  services:      PublicService[]
  communityName: string
  communityId:   string
}

// ─── Service Card ────────────────────────────────────────────
function ServiceCard({
  service, groupKey, rot, communityId,
}: {
  service:     PublicService
  groupKey:    GroupKey
  rot:         number
  communityId: string
}) {
  const g            = GROUPS[groupKey]
  const Icon         = g.Icon
  const isShortPhone = !!service.phone && service.phone.replace(/\D/g, '').length <= 4

  return (
    <div className="br-rot" style={{ '--rot': `${rot}deg` } as React.CSSProperties}>
      <div className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden h-full transition-[transform,box-shadow] duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)]">
        {/* Color spine */}
        <div className="h-2 border-b-[3px] border-black flex-shrink-0" style={{ background: g.color }} />

        <div className="flex flex-col gap-3 p-5 flex-1">
          {/* Header */}
          <div className="flex gap-3 items-start">
            <div
              className="w-11 h-11 shrink-0 border-[2.5px] border-black shadow-[2px_2px_0px_black] flex items-center justify-center"
              style={{ background: g.color }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-black italic uppercase tracking-tight text-[19px] leading-[1.02]">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-[12.5px] leading-snug text-black/55 italic mt-1 line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
            {/* Flag / report button */}
            <ServiceReportDialog
              communityId={communityId}
              serviceId={service.id}
              serviceName={service.name}
            >
              <button
                className="border-2 border-black shadow-[2px_2px_0px_black] p-1.5 flex-shrink-0 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_black] hover:bg-primary hover:text-white transition-all"
                title="Reportar dato errado"
                type="button"
              >
                <Flag className="w-3 h-3" />
              </button>
            </ServiceReportDialog>
          </div>

          {/* Phone */}
          {service.phone && (
            <a
              href={`tel:${service.phone.replace(/[^\d+]/g, '')}`}
              className="border-[2.5px] border-black shadow-[2px_2px_0px_black] overflow-hidden flex no-underline"
            >
              <div className="w-11 flex-shrink-0 bg-black flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-[#FFEFD9] px-3.5 py-2 flex items-center justify-between gap-2">
                <span
                  className="font-heading font-black italic leading-none"
                  style={{ color: g.color, fontSize: isShortPhone ? '2.1rem' : '1.375rem', letterSpacing: '-0.02em' }}
                >
                  {service.phone}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 text-right leading-snug">
                  LLAMAR<br />AHORA
                </span>
              </div>
            </a>
          )}

          {/* Address */}
          {service.address && (
            <div className="flex gap-2 items-start text-[12.5px]">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-55" />
              <span className="font-semibold text-[#333]">{service.address}</span>
            </div>
          )}

          {/* Hours */}
          <div className="mt-auto pt-3 border-t-[1.5px] border-dashed border-black/20 flex items-center">
            {service.hours && (
              <span
                className="inline-flex items-center gap-1.5 border border-black px-2 py-1 font-heading font-black text-[10px] uppercase tracking-widest"
                style={{ background: service.hours.toUpperCase().includes('24') ? '#FBBF24' : 'white' }}
              >
                <Clock className="w-2.5 h-2.5" /> {service.hours}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page Client ─────────────────────────────────────────────
export function ServicesPageClient({ services, communityName, communityId }: Props) {
  const [active, setActive] = useState<ActiveFilter>('todos')

  const visibleGroups = active === 'todos' ? DISPLAY_GROUPS : [active as GroupKey]

  const tabs: Array<{ key: ActiveFilter; label: string; color: string }> = [
    { key: 'todos', label: 'TODOS', color: '#E11D48' },
    ...DISPLAY_GROUPS.map(k => ({ key: k as ActiveFilter, label: GROUPS[k].short, color: GROUPS[k].color })),
  ]

  const hasPhones = services.some(s => s.phone)

  function handleDownloadVcf() {
    if (!hasPhones) return
    downloadVcf(services, `emergencias-${communityName.toLowerCase().replace(/\s+/g, '-')}.vcf`)
  }

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-[#FFF7ED] border-b-4 border-black px-4 md:px-8 pt-8 pb-9">
        <div className="br-pattern-diag absolute inset-0 opacity-30 pointer-events-none" />
        <div className="absolute -top-16 -right-12 w-56 md:w-72 h-56 md:h-72 bg-primary border-4 border-black rounded-full shadow-[-12px_12px_0_black] pointer-events-none" />
        <div className="absolute top-16 right-52 w-16 h-16 bg-[#16A34A] border-[3px] border-black rotate-12 shadow-[6px_6px_0px_black] pointer-events-none hidden md:block" />
        <div className="absolute bottom-5 right-36 w-20 h-20 bg-accent border-[3px] border-black -rotate-[8deg] shadow-[6px_6px_0px_black] pointer-events-none hidden md:block" />

        <div className="relative grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-8 items-end max-w-7xl mx-auto">
          {/* Left */}
          <div>
            <div className="flex gap-1.5 items-center flex-wrap">
              {['INICIO', communityName.toUpperCase(), 'SERVICIOS'].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center border-2 border-black px-3 py-2 font-heading font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0px_black] ${i === arr.length - 1 ? 'bg-primary text-white' : 'bg-white'}`}>
                    {item}
                  </span>
                  {i < arr.length - 1 && <span className="text-black/50 text-sm">›</span>}
                </span>
              ))}
            </div>

            <div className="flex gap-2.5 items-center mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black italic uppercase text-sm tracking-widest -rotate-[3deg]">
                <Siren className="w-3.5 h-3.5" /> DIRECTORIO PÚBLICO
              </span>
              <span className="font-mono text-[13px] uppercase tracking-widest bg-black text-white px-2.5 py-1">
                {communityName.toUpperCase()}
              </span>
            </div>

            <h1
              className="font-heading font-black italic uppercase mt-3.5 leading-[0.84]"
              style={{ fontSize: 'clamp(3rem, 8vw, 96px)', letterSpacing: '-0.035em' }}
            >
              <span className="block">SERVICIOS</span>
              <span className="block text-primary ml-4 md:ml-8">Y EMERGENCIAS</span>
            </h1>

            <p className="mt-4 max-w-lg text-base font-medium leading-relaxed">
              Líneas de atención, centros de salud y servicios oficiales para los habitantes de{' '}
              <strong>{communityName}</strong>. Verificados por la comunidad.
            </p>

            <div className="flex gap-2.5 mt-5 flex-wrap">
              {/* GUARDAR NÚMEROS */}
              <button
                onClick={handleDownloadVcf}
                disabled={!hasPhones}
                className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-black text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                type="button"
              >
                <Bookmark className="w-3.5 h-3.5" /> GUARDAR NÚMEROS
              </button>

              {/* INFORMAR SERVICIO (hero) */}
              <ServiceSuggestionDialog communityId={communityId} communityName={communityName}>
                <button
                  className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-secondary border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  type="button"
                >
                  <Siren className="w-3.5 h-3.5" /> + INFORMAR SERVICIO
                </button>
              </ServiceSuggestionDialog>
            </div>
          </div>

          {/* Right — Emergency 123 card */}
          <div className="border-[3px] border-black bg-primary text-white overflow-hidden shadow-[12px_12px_0px_black] mt-6 md:mt-0">
            <div className="px-4 py-3 border-b-[3px] border-black bg-black flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-secondary">
                ● LÍNEA ÚNICA NACIONAL
              </span>
              <Siren className="w-4 h-4 text-white" />
            </div>
            <a href="tel:123" className="block px-5 py-5 no-underline text-white">
              <div className="font-mono text-[11px] uppercase tracking-widest opacity-85 mb-1">EMERGENCIAS · 24 HORAS</div>
              <div className="flex items-center gap-3.5">
                <span className="font-heading font-black italic leading-[0.8]" style={{ fontSize: 'clamp(60px, 8vw, 92px)', letterSpacing: '-0.04em' }}>123</span>
                <div className="w-12 h-12 bg-white border-[3px] border-black shadow-[4px_4px_0px_black] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
              </div>
            </a>
            <div className="grid grid-cols-3 border-t-[3px] border-black">
              {[['119', 'BOMBEROS'], ['125', 'AMBULANCIA'], ['132', 'CRUZ ROJA']].map(([n, l], i) => (
                <a key={n} href={`tel:${n}`} className={`py-3 px-2 text-center no-underline text-white bg-black/10 hover:bg-black/20 transition-colors ${i < 2 ? 'border-r-2 border-r-white/30' : ''}`}>
                  <div className="font-heading font-black italic text-2xl leading-tight">{n}</div>
                  <div className="font-mono text-[8.5px] mt-0.5 opacity-85">{l}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <section className="px-4 md:px-8 py-4 bg-[#F5E6CB] border-b-[3px] border-black flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap overflow-x-auto">
          {tabs.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              type="button"
              className="inline-flex items-center px-3.5 py-2.5 border-2 border-black font-heading font-black text-[11px] uppercase tracking-widest transition-all flex-shrink-0"
              style={active === key ? { background: color, color: 'white', boxShadow: '2px 2px 0 black' } : { background: 'white', boxShadow: '2px 2px 0 black' }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest opacity-55 flex-shrink-0">
          {services.length} SERVICIOS
        </span>
      </section>

      {/* ─── SECTIONS ─── */}
      <div className="px-4 md:px-8 pt-9 pb-2 max-w-7xl mx-auto">
        {services.length === 0 ? (
          <div className="py-20 border-4 border-dashed border-black text-center bg-white">
            <p className="font-heading font-black italic uppercase text-3xl text-black/30">No hay servicios registrados</p>
            <p className="font-semibold text-black/50 mt-2">Pronto añadiremos los contactos de emergencia de tu barrio.</p>
          </div>
        ) : (
          visibleGroups.map(gk => {
            const g    = GROUPS[gk]
            const Icon = g.Icon
            const list = services.filter(s => s.category === gk)
            if (list.length === 0) return null

            return (
              <section key={gk} className="mb-11">
                <div className="flex items-center gap-3 md:gap-4 mb-5 flex-wrap">
                  <div className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 border-[3px] border-black shadow-[6px_6px_0px_black] flex items-center justify-center" style={{ background: g.color }}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <h2 className="font-heading font-black italic uppercase leading-[0.9]" style={{ fontSize: 'clamp(2rem, 5vw, 46px)', letterSpacing: '-0.03em' }}>
                    {g.label}
                  </h2>
                  <span className="font-mono text-[11px] font-bold tracking-widest bg-black text-white px-2 py-1 shrink-0">
                    {list.length} LÍNEAS
                  </span>
                  <div className="flex-1 h-[3px] bg-black opacity-85 hidden sm:block" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((s, i) => (
                    <ServiceCard key={s.id} service={s} groupKey={gk} rot={[-0.6, 0, 0.6][i % 3]} communityId={communityId} />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* ─── MARQUEE ─── */}
      <div className="bg-black text-white border-t-4 border-black border-b-4 py-3 overflow-hidden">
        <div className="flex overflow-hidden">
          <div className="br-marquee-track flex">
            {[...Array(2)].flatMap((_, j) =>
              ['POLICÍA 123', 'BOMBEROS 119', 'AMBULANCIA 125', 'CRUZ ROJA 132', 'ENERGÍA 115', 'GAS 164', 'ACUEDUCTO 116', 'SALUD MENTAL 106'].map((text, i) => (
                <span key={`${j}-${i}`} className="flex items-center gap-5 px-6 whitespace-nowrap">
                  <span className="font-heading font-black italic uppercase text-2xl">{text}</span>
                  <span className="text-secondary text-xl">✦</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <section className="px-4 md:px-8 py-11 max-w-7xl mx-auto">
        <div className="border-[3px] border-black grid grid-cols-1 md:grid-cols-[1.2fr_1fr] overflow-hidden">
          {/* Left */}
          <div className="relative p-7 md:p-9">
            <div className="br-pattern-dots absolute inset-0 opacity-[0.14] pointer-events-none" />
            <div className="relative">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest bg-primary text-white px-2 py-0.5 inline-block">
                AYUDA AL BARRIO
              </span>
              <h2 className="font-heading font-black italic uppercase leading-tight mt-3.5" style={{ fontSize: 'clamp(2rem, 5vw, 64px)', letterSpacing: '-0.02em' }}>
                ¿FALTA UNA<br /><span className="text-primary">LÍNEA?</span>
              </h2>
              <p className="mt-3.5 text-sm max-w-md leading-relaxed">
                Si conoces una línea de emergencia, un centro de salud o un servicio público que debería estar aquí,
                avísanos. Lo verificamos y lo agregamos para todos.
              </p>
              <div className="flex gap-2.5 mt-5 flex-wrap">
                {/* INFORMAR SERVICIO (CTA) */}
                <ServiceSuggestionDialog communityId={communityId} communityName={communityName}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] transition-all"
                  >
                    <Siren className="w-3.5 h-3.5" /> INFORMAR SERVICIO
                  </button>
                </ServiceSuggestionDialog>

                {/* REPORTAR DATO ERRADO (CTA, generic) */}
                <ServiceReportDialog communityId={communityId}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] transition-all"
                  >
                    REPORTAR DATO ERRADO
                  </button>
                </ServiceReportDialog>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="bg-black text-white p-7 md:p-9 flex flex-col gap-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-secondary">EN CASO DE EMERGENCIA</div>
            {[
              ['01', 'MANTÉN LA CALMA',  'Respira y ubica la dirección exacta donde estás.'],
              ['02', 'LLAMA AL 123',      'La línea única conecta con policía, salud y bomberos.'],
              ['03', 'DA TUS DATOS',      'Nombre, qué pasa y cuántas personas necesitan ayuda.'],
            ].map(([n, t, d]) => (
              <div key={n} className="grid gap-3.5 items-center" style={{ gridTemplateColumns: '50px 1fr' }}>
                <span className="font-heading font-black italic text-primary leading-none" style={{ fontSize: '2.6rem' }}>{n}</span>
                <div>
                  <div className="font-heading font-black italic uppercase text-base leading-tight">{t}</div>
                  <div className="text-xs opacity-80 mt-0.5">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
