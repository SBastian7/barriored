import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  bg?: string
}

export function StatCard({ icon: Icon, label, value, bg = 'bg-white' }: StatCardProps) {
  return (
    <Card className={`brutalist-card ${bg}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 border-2 border-black bg-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
