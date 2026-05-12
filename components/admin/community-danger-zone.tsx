'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  communityId: string
  communitySlug: string
  isActive: boolean
}

export function CommunityDangerZone({ communityId, communitySlug, isActive }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  if (isActive) return null

  async function handlePermanentDelete() {
    if (confirmSlug !== communitySlug) {
      toast.error('El slug no coincide')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/communities/${communityId}?permanent=true`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Comunidad eliminada permanentemente')
      router.push('/admin/communities')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="brutalist-card border-destructive p-6 space-y-4">
      <h3 className="font-black uppercase tracking-tighter text-destructive">Zona de Peligro</h3>
      <p className="text-sm text-muted-foreground">
        Esta comunidad está archivada. Puedes eliminarla permanentemente si no tiene datos asociados.
      </p>
      <Button
        variant="destructive"
        className="brutalist-button"
        onClick={() => setDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Eliminar Permanentemente
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-destructive">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-destructive">
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Esta acción es <strong>irreversible</strong>. Escribe el slug <code className="font-mono bg-muted px-1">{communitySlug}</code> para confirmar.
          </p>
          <Input
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={communitySlug}
            className="brutalist-input font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button
              variant="destructive"
              className="brutalist-button"
              disabled={confirmSlug !== communitySlug || deleting}
              onClick={handlePermanentDelete}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Para Siempre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
