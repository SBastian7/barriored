import { cn } from '@/lib/utils'

/**
 * BarrioRed brand system.
 *
 * The mark is a location pin (lo local, el barrio) carrying the italic sigla
 * "BR" (Barrio Red). The wordmark sets BARRIO in ink and RED in red — a
 * bilingual play: RED is both the color and "la red vecinal".
 *
 * Single source of truth: keep the pin geometry here. The favicon files
 * (app/icon.svg, public/icon.svg) and generated PWA icons mirror this path.
 */

export type LogoColorway = 'color' | 'ink' | 'reverse'

const COLORWAYS: Record<LogoColorway, { pin: string; letter: string; border: string }> = {
  // On light/paper backgrounds (preferred)
  color: { pin: 'var(--primary)', letter: '#FFFFFF', border: '#0A0A0A' },
  // One-ink / stamp usage
  ink: { pin: '#0A0A0A', letter: '#FFFFFF', border: '#0A0A0A' },
  // On dark (ink) backgrounds — white border so it reads
  reverse: { pin: 'var(--primary)', letter: '#FFFFFF', border: '#FFFFFF' },
}

interface BrandMarkProps {
  /** Rendered height in px (the pin is taller than it is wide). */
  size?: number
  /** "head" seats BR in the round head (default); "center" optically centers it. */
  variant?: 'head' | 'center'
  colorway?: LogoColorway
  /** Hard offset shadow in px (neo-brutalist). 0 = none. */
  shadow?: number
  /** Accessible label; pass "" to mark decorative when paired with the wordmark. */
  title?: string
  className?: string
}

export function BrandMark({
  size = 32,
  variant = 'head',
  colorway = 'color',
  shadow = 0,
  title = 'BarrioRed',
  className,
}: BrandMarkProps) {
  const c = COLORWAYS[colorway]
  const width = (size * 120) / 150
  const cy = variant === 'center' ? 72 : 56
  const fs = variant === 'center' ? 46 : 50
  const decorative = title === ''

  return (
    <svg
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      width={width}
      height={size}
      viewBox="0 0 120 150"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        filter: shadow ? `drop-shadow(${shadow}px ${shadow}px 0 #0A0A0A)` : undefined,
      }}
    >
      {!decorative && <title>{title}</title>}
      <path
        d="M60 6 C30 6 10 28 10 56 C10 92 60 144 60 144 C60 144 110 92 110 56 C110 28 90 6 60 6 Z"
        fill={c.pin}
        stroke={c.border}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      <text
        x={61}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-heading), Outfit, sans-serif"
        fontWeight={900}
        fontStyle="italic"
        fontSize={fs}
        letterSpacing={-3}
        fill={c.letter}
      >
        BR
      </text>
    </svg>
  )
}

interface WordmarkProps {
  className?: string
  /** On dark backgrounds, set BARRIO in white instead of ink. */
  reversed?: boolean
}

export function Wordmark({ className, reversed }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-heading font-black uppercase italic tracking-tighter leading-none',
        className
      )}
    >
      <span className={reversed ? 'text-white' : 'text-foreground'}>BARRIO</span>
      <span className="text-primary">RED</span>
    </span>
  )
}

interface LogoProps {
  /** Pin height in px. */
  markSize?: number
  shadow?: number
  colorway?: LogoColorway
  variant?: 'head' | 'center'
  reversed?: boolean
  orientation?: 'horizontal' | 'stacked'
  /** Hide the pin (wordmark only). */
  withMark?: boolean
  /** Optional tagline badge below the wordmark (e.g. "Directorio del barrio"). */
  subtag?: string
  /** Tailwind classes controlling wordmark font-size. */
  textClassName?: string
  className?: string
  /** Accessible name for the whole lockup. */
  title?: string
}

export function Logo({
  markSize = 30,
  shadow = 0,
  colorway = 'color',
  variant = 'head',
  reversed,
  orientation = 'horizontal',
  withMark = true,
  subtag,
  textClassName = 'text-2xl',
  className,
  title = 'BarrioRed',
}: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex',
        orientation === 'stacked'
          ? 'flex-col items-center gap-2 text-center'
          : 'flex-row items-center gap-2',
        className
      )}
      aria-label={title}
      role="img"
    >
      {withMark && (
        <BrandMark
          size={markSize}
          variant={variant}
          colorway={colorway}
          shadow={shadow}
          title=""
        />
      )}
      <span className="inline-flex flex-col">
        <Wordmark className={textClassName} reversed={reversed} />
        {subtag && (
          <span className="mt-1.5 self-start bg-secondary text-secondary-foreground border-2 border-black px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest">
            {subtag}
          </span>
        )}
      </span>
    </span>
  )
}
