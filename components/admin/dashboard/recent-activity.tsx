import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface RecentActivityProps {
  communityId: string
}

interface Business {
  name: string
  category: string
  created_at: string
  slug: string
}

interface User {
  full_name: string | null
  role: string
  created_at: string
  id: string
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  } else if (diffDays === 1) {
    return 'Ayer'
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`
  } else {
    return past.toLocaleDateString('es-CO')
  }
}

async function getRecentActivity(communityId: string) {
  const supabase = await createClient()

  const { data: recentBusinesses } = await supabase
    .from('businesses')
    .select('name, category, created_at, slug')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('full_name, role, created_at, id')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    businesses: (recentBusinesses || []) as Business[],
    users: (recentUsers || []) as User[],
  }
}

export async function RecentActivity({ communityId }: RecentActivityProps) {
  const { businesses, users } = await getRecentActivity(communityId)

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest mb-4">
        Actividad Reciente
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="bg-background border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="text-lg font-black uppercase tracking-widest mb-4">
            Negocios Recientes
          </h3>
          <div className="space-y-3">
            {businesses.length > 0 ? (
              <>
                {businesses.map((business) => (
                  <Link
                    key={business.slug}
                    href={`/admin/businesses/${business.slug}`}
                    className="block border-b border-gray-200 last:border-0 pb-3 last:pb-0 hover:bg-gray-50 transition-colors p-2 -mx-2"
                  >
                    <p className="font-bold text-base">{business.name}</p>
                    <p className="text-sm text-gray-600">
                      {business.category} • {formatRelativeTime(business.created_at)}
                    </p>
                  </Link>
                ))}
                <Link
                  href="/admin/businesses"
                  className="flex items-center gap-2 text-accent font-bold uppercase text-sm hover:underline pt-2"
                >
                  Ver más
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No hay negocios registrados aún</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-background border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="text-lg font-black uppercase tracking-widest mb-4">
            Usuarios Recientes
          </h3>
          <div className="space-y-3">
            {users.length > 0 ? (
              <>
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="block border-b border-gray-200 last:border-0 pb-3 last:pb-0 hover:bg-gray-50 transition-colors p-2 -mx-2"
                  >
                    <p className="font-bold text-base">
                      {user.full_name || 'Usuario sin nombre'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'Moderador' : 'Usuario'} • {formatRelativeTime(user.created_at)}
                    </p>
                  </Link>
                ))}
                <Link
                  href="/admin/users"
                  className="flex items-center gap-2 text-accent font-bold uppercase text-sm hover:underline pt-2"
                >
                  Ver más
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No hay usuarios registrados aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
