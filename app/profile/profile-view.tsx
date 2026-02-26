'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { User, Edit } from 'lucide-react'

type Props = {
  profile: {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    community_id: string | null
    email: string
    role: string
  }
  communities: Array<{ id: string; name: string }>
}

export function ProfileView({ profile, communities }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  const selectedCommunity = communities.find((c) => c.id === profile.community_id)

  function handleSave() {
    setIsEditing(false)
    router.refresh()
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: 'BarrioRed', href: '/' },
          { label: 'Mi Perfil', active: true },
        ]}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter leading-none">
            Mi Perfil
          </h1>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Perfil
            </Button>
          )}
        </div>

        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {isEditing ? (
            <ProfileForm
              profile={profile}
              communities={communities}
              onCancel={() => setIsEditing(false)}
              onSave={handleSave}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-24 h-24 border-4 border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                      <User className="h-12 w-12 text-black/40" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Nombre
                  </p>
                  <p className="text-xl font-heading font-black uppercase italic">
                    {profile.full_name || 'Sin nombre'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Correo Electrónico
                  </p>
                  <p className="text-lg font-bold">{profile.email}</p>
                </div>

                {profile.phone && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                      Teléfono
                    </p>
                    <p className="text-lg font-bold">{profile.phone}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Comunidad Predeterminada
                  </p>
                  <p className="text-lg font-bold">
                    {selectedCommunity?.name || 'Ninguna'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Rol
                  </p>
                  <span className="inline-block bg-secondary text-black px-3 py-1 border-2 border-black uppercase tracking-widest text-xs font-black">
                    {profile.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
