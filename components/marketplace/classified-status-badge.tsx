import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Flag, Archive } from 'lucide-react'

interface ClassifiedStatusBadgeProps {
  status: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
}

export function ClassifiedStatusBadge({ status }: ClassifiedStatusBadgeProps) {
  const statusConfig = {
    active: {
      label: 'ACTIVO',
      className: 'bg-emerald-500 text-white border-black',
      icon: CheckCircle,
    },
    sold: {
      label: 'VENDIDO',
      className: 'bg-blue-500 text-white border-black',
      icon: CheckCircle,
    },
    archived: {
      label: 'ARCHIVADO',
      className: 'bg-gray-400 text-white border-black',
      icon: Archive,
    },
    flagged: {
      label: 'MARCADO',
      className: 'bg-red-500 text-white border-black',
      icon: Flag,
    },
    removed: {
      label: 'ELIMINADO',
      className: 'bg-gray-600 text-white border-black',
      icon: XCircle,
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={`${config.className} rounded-none text-[10px]`}>
      <Icon className="h-2.5 w-2.5 mr-0.5" />
      {config.label}
    </Badge>
  )
}
