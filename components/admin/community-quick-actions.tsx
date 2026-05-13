import Link from 'next/link'
import { Building2, Users, Bell, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  communityId: string
}

const actions = [
  { label: 'Ver Negocios',     href: '/admin/businesses',  icon: Building2 },
  { label: 'Ver Usuarios',     href: '/admin/users',       icon: Users },
  { label: 'Ver Alertas',      href: '/admin/alerts',      icon: Bell },
  { label: 'Ver Marketplace',  href: '/admin/marketplace', icon: ShoppingBag },
]

export function CommunityQuickActions({ communityId }: Props) {
  return (
    <div className="brutalist-card p-6 space-y-4">
      <h3 className="font-black uppercase tracking-widest text-xs">Acceso Rápido</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={`${href}?community_id=${communityId}`}>
            <Button variant="outline" className="brutalist-button w-full justify-start gap-2">
              <Icon className="h-4 w-4" />
              <span className="uppercase tracking-widest text-xs font-bold">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
