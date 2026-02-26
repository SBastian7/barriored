'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AvatarUpload } from './avatar-upload'
import { Loader2, Save, X } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.union([
    z.string().regex(/^\+57\d{10}$/, 'Formato inválido. Debe ser +57XXXXXXXXXX'),
    z.literal(''),
  ]).optional(),
  avatar_url: z.string().optional(),
  community_id: z.union([
    z.string().uuid(),
    z.literal(''),
  ]).optional().nullable(),
})

type ProfileFormData = z.infer<typeof profileSchema>

type Props = {
  profile: {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    community_id: string | null
    email: string
  }
  communities: Array<{ id: string; name: string }>
  onCancel: () => void
  onSave: () => void
}

export function ProfileForm({ profile, communities, onCancel, onSave }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      avatar_url: profile.avatar_url || '',
      community_id: profile.community_id || '',
    },
  })

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone || undefined,
          avatar_url: data.avatar_url || undefined,
          community_id: data.community_id || null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.full_name?.[0] || result.error?.phone?.[0] || 'Error al actualizar perfil')
      }

      toast.success('Perfil actualizado correctamente')
      onSave()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex justify-center">
        <AvatarUpload
          currentAvatar={watch('avatar_url') || null}
          onUploadComplete={(url) => setValue('avatar_url', url)}
        />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="font-black uppercase tracking-widest text-xs">
            Nombre Completo
          </Label>
          <Input
            id="full_name"
            placeholder="Tu nombre completo"
            {...register('full_name')}
            className={errors.full_name ? 'border-primary' : ''}
          />
          {errors.full_name && (
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-black uppercase tracking-widest text-xs">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            value={profile.email}
            disabled
            className="bg-black/5 cursor-not-allowed"
          />
          <p className="text-[10px] text-black/40 font-bold italic">
            El correo no se puede cambiar
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="font-black uppercase tracking-widest text-xs">
            Teléfono (Opcional)
          </Label>
          <PhoneInput
            value={watch('phone') || ''}
            onChange={(val) => setValue('phone', val)}
            placeholder="312 345 6789"
            error={errors.phone?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="community_id" className="font-black uppercase tracking-widest text-xs">
            Comunidad Predeterminada (Opcional)
          </Label>
          <Select
            onValueChange={(v) => setValue('community_id', v === '__none__' ? '' : v)}
            defaultValue={watch('community_id') || '__none__'}
          >
            <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
              <SelectValue placeholder="Selecciona tu comunidad" />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="__none__">Ninguna</SelectItem>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t-2 border-black">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar Cambios
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-12 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest"
        >
          <X className="mr-2 h-5 w-5" />
          Cancelar
        </Button>
      </div>
    </form>
  )
}
