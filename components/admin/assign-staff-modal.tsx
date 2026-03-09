'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

interface Props {
  communityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignStaffModal({
  communityId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>(
    'moderator'
  )
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, community_id')
        .or(`full_name.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`)
        .limit(20)

      setSearchResults(data || [])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleAssign() {
    if (!selectedUser) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selectedUser.id,
            role: selectedRole,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al asignar staff')
      }

      toast({
        title: 'Staff asignado',
        description: `${selectedUser.full_name} ha sido asignado como ${selectedRole}`,
      })

      onSuccess()
      onOpenChange(false)
      setSearchQuery('')
      setSelectedUser(null)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al asignar staff',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brutalist-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
            Asignar Staff
          </DialogTitle>
          <DialogDescription>
            Busca un usuario para asignarlo como admin o moderador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search input */}
          <div className="space-y-2">
            <Label className="uppercase tracking-widest font-bold text-xs">
              Buscar Usuario
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre o ID del usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="brutalist-input pl-10"
              />
            </div>
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="brutalist-card max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-8 text-center text-muted-foreground">
                  Buscando...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="divide-y-2 divide-black">
                  {searchResults.map((user) => {
                    const isInThisCommunity = user.community_id === communityId
                    const isDisabled = isInThisCommunity

                    return (
                      <button
                        key={user.id}
                        onClick={() => !isDisabled && setSelectedUser(user)}
                        disabled={isDisabled}
                        className={`w-full p-4 flex items-center gap-4 hover:bg-accent transition-colors text-left ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          selectedUser?.id === user.id ? 'bg-accent' : ''
                        }`}
                      >
                        {user.avatar_url && (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full border-2 border-black"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-bold">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.id}
                          </div>
                        </div>
                        {user.role && user.role !== 'user' && (
                          <Badge>{user.role}</Badge>
                        )}
                        {isInThisCommunity && (
                          <Badge variant="outline">Ya asignado</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Role selection */}
          {selectedUser && (
            <div className="space-y-4 brutalist-card p-6">
              <div className="font-bold text-lg">Usuario seleccionado:</div>
              <div className="flex items-center gap-4">
                {selectedUser.avatar_url && (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-12 h-12 rounded-full border-2 border-black"
                  />
                )}
                <div>
                  <div className="font-bold">{selectedUser.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedUser.id}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t-2 border-black">
                <Label className="uppercase tracking-widest font-bold text-xs">
                  Rol
                </Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as 'admin' | 'moderator')
                  }
                >
                  <div className="flex items-start space-x-3 brutalist-card p-4">
                    <RadioGroupItem value="admin" id="admin" />
                    <div className="flex-1">
                      <Label htmlFor="admin" className="font-bold cursor-pointer">
                        Admin
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Control total de la comunidad
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 brutalist-card p-4">
                    <RadioGroupItem value="moderator" id="moderator" />
                    <div className="flex-1">
                      <Label htmlFor="moderator" className="font-bold cursor-pointer">
                        Moderador
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Gestión de contenido solamente
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="brutalist-button flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUser || loading}
              className="brutalist-button flex-1"
            >
              {loading ? 'Asignando...' : 'Asignar Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
