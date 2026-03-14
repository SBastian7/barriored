import { cn } from '@/lib/utils'

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block px-3 py-1 rotate-[-2deg]',
        'bg-secondary text-black',
        'border-2 border-black',
        'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        'font-bold uppercase tracking-widest text-xs',
        className
      )}
    >
      DESTACADO
    </div>
  )
}
