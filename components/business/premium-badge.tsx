import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1',
        'bg-secondary text-black',
        'border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        'font-black uppercase text-xs tracking-widest',
        'rotate-[-2deg]',
        className
      )}
    >
      <Crown className="w-3 h-3" />
      <span>Premium</span>
    </div>
  )
}
