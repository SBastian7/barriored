import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface PendingItemsSummaryProps {
  communityId: string
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

export async function PendingItemsSummary({ communityId }: PendingItemsSummaryProps) {
  const { pendingBusinesses, pendingReports } = await getPendingCounts(communityId)

  const hasPendingItems = pendingBusinesses > 0 || pendingReports > 0

  if (!hasPendingItems) {
    return null
  }

  return (
    <div className="bg-secondary border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex items-start gap-4">
        <AlertTriangle className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-black uppercase tracking-widest mb-3">
            Items Pendientes
          </h3>
          <div className="space-y-2">
            {pendingBusinesses > 0 && (
              <p className="text-base">
                <Link
                  href="/admin/businesses?status=pending"
                  className="font-bold hover:text-primary underline"
                >
                  {pendingBusinesses} negocio{pendingBusinesses !== 1 ? 's' : ''} pendiente{pendingBusinesses !== 1 ? 's' : ''} de aprobación
                </Link>
              </p>
            )}
            {pendingReports > 0 && (
              <p className="text-base">
                <Link
                  href="/admin/reports?status=pending"
                  className="font-bold hover:text-primary underline"
                >
                  {pendingReports} reporte{pendingReports !== 1 ? 's' : ''} sin resolver
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
