import Link from 'next/link'
import { Clock, Bell, Users, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

interface QuickActionsProps {
  communityId: string
}

interface ActionButtonProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}

function ActionButton({ href, icon, label, badge }: ActionButtonProps) {
  return (
    <Link href={href} className="block">
      <Button
        className="brutalist-button w-full h-20 text-base justify-start relative"
        variant="outline"
      >
        <span className="flex items-center gap-3 flex-1">
          {icon}
          <span className="font-black uppercase tracking-wide">{label}</span>
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-secondary text-foreground border-2 border-black px-3 py-1 text-sm font-black">
            {badge}
          </span>
        )}
      </Button>
    </Link>
  )
}

async function getPendingCounts(communityId: string) {
  const supabase = await createClient()

  const { count: pendingBusinesses } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending')

  const { count: pendingReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending')

  return {
    pendingBusinesses: pendingBusinesses || 0,
    pendingReports: pendingReports || 0,
  }
}

export async function QuickActions({ communityId }: QuickActionsProps) {
  const { pendingBusinesses, pendingReports } = await getPendingCounts(communityId)

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest mb-4">
        Acciones Rápidas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          href="/admin/businesses?status=pending"
          icon={<Clock className="h-6 w-6" />}
          label="Revisar Negocios Pendientes"
          badge={pendingBusinesses}
        />
        <ActionButton
          href="/admin/alerts"
          icon={<Bell className="h-6 w-6" />}
          label="Crear Alerta Comunitaria"
        />
        <ActionButton
          href="/admin/users"
          icon={<Users className="h-6 w-6" />}
          label="Gestionar Usuarios"
        />
        <ActionButton
          href="/admin/reports"
          icon={<Flag className="h-6 w-6" />}
          label="Ver Reportes"
          badge={pendingReports}
        />
      </div>
    </div>
  )
}
