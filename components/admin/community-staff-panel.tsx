'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, UserMinus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  communityId: string
  staff: any[]
}

export function CommunityStaffPanel({ communityId, staff }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase tracking-tighter italic">
          Staff de la Comunidad
        </h3>
        <Button className="brutalist-button">
          <Plus className="h-4 w-4 mr-2" />
          Asignar Staff
        </Button>
      </div>

      <div className="brutalist-card">
        {staff.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No hay staff asignado a esta comunidad
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {staff.map((member: any) => (
              <div
                key={member.id}
                className="p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url && (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-12 h-12 rounded-full border-2 border-black"
                    />
                  )}
                  <div>
                    <div className="font-bold text-lg">{member.full_name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge
                        className={
                          member.role === 'admin'
                            ? 'bg-primary'
                            : 'bg-secondary text-foreground'
                        }
                      >
                        {member.role === 'admin' ? 'Admin' : 'Moderador'}
                      </Badge>
                      <span>•</span>
                      <span>
                        Desde{' '}
                        {format(new Date(member.created_at), 'MMM yyyy', {
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="brutalist-button"
                  size="icon"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
