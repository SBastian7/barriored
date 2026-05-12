'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface StaffMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  created_at: string | null
}

interface Props {
  communityId: string
  staff: StaffMember[]
  primaryAdminId: string | null
}

export function CommunityOwnershipPanel({ communityId, staff, primaryAdminId }: Props) {
  const [currentPrimaryId, setCurrentPrimaryId] = useState<string | null>(primaryAdminId)
  const [loading, setLoading] = useState<string | null>(null)

  const admins = staff.filter((s) => s.role === 'admin')

  async function designateOwner(profileId: string) {
    setLoading(profileId)
    try {
      const res = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_admin_id: profileId }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Error al designar propietario')
        return
      }
      setCurrentPrimaryId(profileId)
      toast.success('Propietario designado correctamente')
    } finally {
      setLoading(null)
    }
  }

  if (admins.length === 0) {
    return (
      <div className="brutalist-card p-6 text-center text-muted-foreground">
        No hay administradores en esta comunidad para designar como propietario.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
        Designar propietario principal
      </p>
      {admins.map((admin) => {
        const isPrimary = admin.id === currentPrimaryId
        return (
          <div key={admin.id} className="brutalist-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPrimary && <Crown className="h-4 w-4 text-yellow-500" />}
              <div>
                <p className="font-bold">{admin.full_name || 'Sin nombre'}</p>
                <Badge variant="outline" className="text-xs uppercase tracking-widest">admin</Badge>
              </div>
            </div>
            {isPrimary ? (
              <Badge className="bg-yellow-500 text-black uppercase tracking-widest text-xs">Propietario</Badge>
            ) : (
              <Button
                size="sm"
                className="brutalist-button"
                disabled={loading === admin.id}
                onClick={() => designateOwner(admin.id)}
              >
                {loading === admin.id ? 'Designando...' : 'Designar Propietario'}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
