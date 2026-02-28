'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RoleAssignmentDialogProps {
  userId: string
  currentRole: 'user' | 'moderator' | 'admin' | null
  userName: string
  onSuccess: () => void
}

const ROLE_DESCRIPTIONS = {
  user: {
    label: 'Usuario',
    description: 'Sin permisos administrativos',
    permissions: ['Ver contenido', 'Crear negocios', 'Publicar en comunidad'],
  },
  moderator: {
    label: 'Moderador',
    description: 'Puede aprobar negocios y moderar contenido',
    permissions: [
      'Aprobar/rechazar negocios',
      'Editar negocios',
      'Moderar posts de comunidad',
      'Ver estadísticas',
      'Ver usuarios (solo lectura)',
    ],
  },
  admin: {
    label: 'Administrador',
    description: 'Control total de la comunidad',
    permissions: [
      'Todos los permisos de moderador',
      'Gestionar categorías',
      'Asignar roles',
      'Suspender usuarios',
      'Eliminar usuarios',
      'Exportar datos',
    ],
  },
}

export function RoleAssignmentDialog({
  userId,
  currentRole,
  userName,
  onSuccess,
}: RoleAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [newRole, setNewRole] = useState<'user' | 'moderator' | 'admin'>(currentRole || 'user')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAssignRole() {
    if (newRole === currentRole) {
      toast.info('El rol no ha cambiado')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`Rol actualizado a ${ROLE_DESCRIPTIONS[newRole].label}`)
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Error al actualizar rol')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="brutalist-button">
          <Shield className="h-4 w-4 mr-2" /> Cambiar Rol
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-2xl">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            Asignar Rol: {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Current Role */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Rol Actual
            </Label>
            <div className="mt-2">
              <Badge variant="outline" className="font-black uppercase">
                {currentRole ? ROLE_DESCRIPTIONS[currentRole].label : 'Usuario'}
              </Badge>
            </div>
          </div>

          {/* New Role Selection */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Nuevo Rol *
            </Label>
            <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.user.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.user.description}</p>
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.moderator.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.moderator.description}</p>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.admin.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.admin.description}</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Preview */}
          <div className="border-2 border-black p-4 bg-accent/5">
            <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">
              Permisos de {ROLE_DESCRIPTIONS[newRole].label}
            </p>
            <ul className="space-y-1">
              {ROLE_DESCRIPTIONS[newRole].permissions.map((perm, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Warning */}
          {newRole !== currentRole && (
            <Alert className="border-2 border-black bg-secondary/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> Este cambio de rol será inmediato y afectará los permisos del usuario.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAssignRole}
              disabled={loading || newRole === currentRole}
              className="brutalist-button flex-1 bg-primary text-white h-12"
            >
              {loading ? 'Actualizando...' : 'Asignar Rol'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="brutalist-button flex-1 h-12"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
