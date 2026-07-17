'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Loader2, Bell } from 'lucide-react'

export function PushTestSender() {
  const [communities, setCommunities] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    community_id: '',
    title: '',
    body: '',
    recipient_mode: 'self' // 'self' or 'all'
  })

  useEffect(() => {
    fetchCommunities()
  }, [])

  async function fetchCommunities() {
    try {
      const res = await fetch('/api/communities')
      if (res.ok) {
        const data = await res.json()
        setCommunities(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, community_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Fetch communities error:', error)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)

    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al enviar')
        return
      }

      toast.success(data.message || `✅ Enviada a ${data.sent_count} suscriptores`)

      // Reset form
      setFormData(prev => ({ ...prev, title: '', body: '' }))
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Error al enviar notificación de prueba')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="font-heading font-black uppercase italic">
          Enviar Prueba
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          {/* Community Selector */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Comunidad
            </Label>
            <Select
              value={formData.community_id}
              onValueChange={(value) => setFormData({ ...formData, community_id: value })}
            >
              <SelectTrigger className="brutalist-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {communities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Mode */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Destinatarios
            </Label>
            <RadioGroup
              value={formData.recipient_mode}
              onValueChange={(value) => setFormData({ ...formData, recipient_mode: value })}
            >
              <div className="flex items-center space-x-2 p-2 border-2 border-black rounded-none">
                <RadioGroupItem value="self" id="self" />
                <Label htmlFor="self" className="cursor-pointer font-bold">
                  Solo yo (para probar)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border-2 border-black rounded-none">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer font-bold">
                  Todos los suscriptores
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Título (Max 50 caracteres)
            </Label>
            <Input
              type="text"
              maxLength={50}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Notificación de prueba"
              className="brutalist-input"
            />
            <p className="text-xs text-black/60 text-right">
              {formData.title.length}/50
            </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Mensaje (Max 200 caracteres)
            </Label>
            <Textarea
              maxLength={200}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Este es un mensaje de prueba del sistema de notificaciones"
              className="brutalist-input min-h-[100px]"
            />
            <p className="text-xs text-black/60 text-right">
              {formData.body.length}/200
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={sending || !formData.title || !formData.body}
            className="w-full brutalist-button bg-primary text-white"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Enviar Prueba
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
