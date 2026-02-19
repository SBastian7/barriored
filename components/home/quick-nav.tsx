import Link from 'next/link'
import { Store, Users, ShoppingBag, Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  {
    label: 'Directorio',
    icon: Store,
    description: 'Explora los negocios de tu barrio',
    path: '/directory',
    enabled: true,
    color: 'bg-primary',
    iconColor: 'text-primary-foreground',
  },
  {
    label: 'Comunidad',
    icon: Users,
    description: 'Conecta con tus vecinos',
    path: '/community',
    enabled: true,
    color: 'bg-accent',
    iconColor: 'text-accent-foreground',
  },
  {
    label: 'Marketplace',
    icon: ShoppingBag,
    description: 'Compra y vende en tu barrio',
    path: '/marketplace',
    enabled: false,
    color: 'bg-secondary',
    iconColor: 'text-secondary-foreground',
  },
  {
    label: 'Servicios',
    icon: Info,
    description: 'Info util y emergencias',
    path: '/services',
    enabled: true,
    color: 'bg-[oklch(0.5_0.15_150)]',
    iconColor: 'text-white',
  },
]

export function QuickNav({ communitySlug }: { communitySlug: string }) {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-heading font-black uppercase italic tracking-tight mb-8">
          Tu <span className="text-primary underline decoration-4 underline-offset-4">Barrio</span>, todo en un lugar
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {sections.map((section) => {
            const href = `/${communitySlug}${section.path}`
            const Wrapper = section.enabled ? Link : 'div'
            const wrapperProps = section.enabled ? { href } : {}

            return (
              <Wrapper
                key={section.path}
                {...wrapperProps as any}
                className={cn(
                  'group relative border-4 p-5 md:p-6 flex flex-col transition-all',
                  section.enabled
                    ? 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                    : 'border-black/20 bg-white/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] cursor-default'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 md:w-14 md:h-14 flex items-center justify-center border-2 mb-4 rotate-[-3deg] group-hover:rotate-0 transition-transform',
                  section.enabled ? section.color : 'bg-muted',
                  section.enabled ? 'border-black' : 'border-black/20'
                )}>
                  <section.icon className={cn(
                    'h-6 w-6 md:h-7 md:w-7',
                    section.enabled ? section.iconColor : 'text-muted-foreground'
                  )} />
                </div>

                {/* Title */}
                <h3 className={cn(
                  'font-heading font-black text-lg md:text-xl uppercase tracking-tight mb-1',
                  !section.enabled && 'text-black/30'
                )}>
                  {section.label}
                </h3>

                {/* Description */}
                <p className={cn(
                  'text-sm font-medium leading-snug',
                  section.enabled ? 'text-black/60' : 'text-black/20'
                )}>
                  {section.description}
                </p>

                {/* Arrow or Coming Soon */}
                {section.enabled ? (
                  <ArrowRight className="h-5 w-5 mt-4 text-black/40 group-hover:text-black group-hover:translate-x-1 transition-all" />
                ) : (
                  <span className="mt-4 inline-block bg-secondary text-secondary-foreground text-[9px] font-black uppercase tracking-widest px-2 py-1 border border-black/20 w-fit">
                    Proximamente
                  </span>
                )}
              </Wrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}
