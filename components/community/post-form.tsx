'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPostSchema, type CreatePostInput } from '@/lib/validations/community'
import { ImageUploadField } from './image-upload-field'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Calendar, Briefcase, Loader2 } from 'lucide-react'

type Props = {
    type: 'announcement' | 'event' | 'job'
    communityId: string
    communitySlug: string
}

export function PostForm({ type, communityId, communitySlug }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [linkToBusiness, setLinkToBusiness] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState('')
    const [ownedBusinesses, setOwnedBusinesses] = useState<{ id: string; name: string }[]>([])
    const supabase = createClient()

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: {
            type,
            community_id: communityId,
            title: '',
            content: '',
            image_url: '',
            ...(type === 'event' ? { metadata: { organizer: '', date: '', location: '' } } : {}),
            ...(type === 'job' ? { metadata: { category: '', contact_method: 'whatsapp', contact_value: '' } } : {}),
        } as any
    })

    useEffect(() => {
        async function fetchOwnedBusinesses() {
            if (type !== 'event' && type !== 'job') return

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('owner_id', user.id)
                .eq('status', 'approved')
                .order('name')

            setOwnedBusinesses(data || [])
        }

        fetchOwnedBusinesses()
    }, [type])

    async function onSubmit(data: CreatePostInput) {
        setIsSubmitting(true)
        try {
            // Add business linking to metadata if selected
            const selectedBusiness = ownedBusinesses.find(b => b.id === selectedBusinessId)
            if (linkToBusiness && selectedBusiness && data.type !== 'announcement' && 'metadata' in data) {
                data.metadata = {
                    ...data.metadata,
                    linked_business_id: selectedBusiness.id,
                    linked_business_name: selectedBusiness.name,
                }
            }

            const res = await fetch('/api/community/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Algo salió mal')
            }

            toast.success('¡Enviado!', {
                description: 'Tu publicación ha sido enviada para revisión por un administrador.'
            })
            router.push(`/${communitySlug}/community`)
            router.refresh()
        } catch (error: any) {
            toast.error('Error', {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const jobMetadata = watch('type') === 'job' ? (watch() as any).metadata : null
    const eventMetadata = watch('type') === 'event' ? (watch() as any).metadata : null

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white border-4 border-black p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mt-8">
            <div className="space-y-6">
                {/* Common Fields */}
                <div className="space-y-2">
                    <Label htmlFor="title" className="font-black uppercase tracking-widest text-xs">Título de la Publicación</Label>
                    <Input
                        id="title"
                        placeholder={type === 'announcement' ? 'Ej: Se perdió un perrito' : type === 'event' ? 'Ej: Bingo Bailable Vecinal' : 'Ej: Se busca Panadero'}
                        {...register('title')}
                        className={errors.title ? 'border-primary' : ''}
                    />
                    {errors.title && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="content" className="font-black uppercase tracking-widest text-xs">Contenido / Descripción</Label>
                    <Textarea
                        id="content"
                        placeholder="Escribe aquí todos los detalles..."
                        rows={6}
                        {...register('content')}
                        className={errors.content ? 'border-primary' : ''}
                    />
                    {errors.content && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{errors.content.message}</p>}
                </div>

                <ImageUploadField
                    value={watch('image_url') || null}
                    onChange={(url) => setValue('image_url', url || '')}
                    label="Imagen (Opcional)"
                />

                {/* Type Specific Fields */}
                {type === 'event' && (
                    <div className="space-y-6 p-6 bg-accent/5 border-2 border-black border-dashed">
                        <div className="space-y-2">
                            <Label htmlFor="event-organizer" className="font-black uppercase tracking-widest text-xs">Organizador</Label>
                            <Input
                                id="event-organizer"
                                placeholder="Ej: Junta de Acción Comunal o Comité Cultural"
                                {...register('metadata.organizer' as any)}
                            />
                            {(errors as any).metadata?.organizer && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{(errors as any).metadata.organizer.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="event-date" className="font-black uppercase tracking-widest text-xs">Fecha y Hora</Label>
                                <Input
                                    id="event-date"
                                    type="datetime-local"
                                    {...register('metadata.date' as any)}
                                />
                                {(errors as any).metadata?.date && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{(errors as any).metadata.date.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-location" className="font-black uppercase tracking-widest text-xs">Lugar / Dirección</Label>
                                <Input
                                    id="event-location"
                                    placeholder="Ej: Salón Comunal o Parque Principal"
                                    {...register('metadata.location' as any)}
                                />
                                {(errors as any).metadata?.location && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{(errors as any).metadata.location.message}</p>}
                            </div>
                        </div>

                        {/* Business Linking */}
                        {ownedBusinesses.length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-black/10">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="linkBusiness"
                                        checked={linkToBusiness}
                                        onCheckedChange={(checked) => {
                                            setLinkToBusiness(checked as boolean)
                                            if (!checked) setSelectedBusinessId('')
                                        }}
                                    />
                                    <Label htmlFor="linkBusiness" className="cursor-pointer font-black uppercase tracking-widest text-xs">
                                        ¿Este evento es de un negocio?
                                    </Label>
                                </div>

                                {linkToBusiness && (
                                    <div className="space-y-2">
                                        <Label htmlFor="business" className="font-black uppercase tracking-widest text-xs">Negocio</Label>
                                        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                                            <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                                                <SelectValue placeholder="Selecciona tu negocio" />
                                            </SelectTrigger>
                                            <SelectContent className="border-2 border-black rounded-none">
                                                {ownedBusinesses.map((business) => (
                                                    <SelectItem key={business.id} value={business.id}>
                                                        {business.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {type === 'job' && (
                    <div className="space-y-6 p-6 bg-secondary/5 border-2 border-black border-dashed">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job-category" className="font-black uppercase tracking-widest text-xs">Categoría</Label>
                                <Input
                                    id="job-category"
                                    placeholder="Ej: Ventas, Construcción, Cocina..."
                                    {...register('metadata.category' as any)}
                                />
                                {(errors as any).metadata?.category && <p className="text-primary text-[10px] font-black uppercase tracking-widest">{(errors as any).metadata.category.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="job-salary" className="font-black uppercase tracking-widest text-xs">Rango Salarial (Opcional)</Label>
                                <Input
                                    id="job-salary"
                                    placeholder="Ej: $1.300.000 + Prestaciones"
                                    {...register('metadata.salary_range' as any)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/10">
                            <div className="space-y-2">
                                <Label className="font-black uppercase tracking-widest text-xs">Método de Contacto</Label>
                                <Select
                                    onValueChange={(v) => setValue('metadata.contact_method' as any, v)}
                                    defaultValue="whatsapp"
                                >
                                    <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                                        <SelectValue placeholder="Selecciona uno" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black rounded-none">
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="phone">Llamada Telefónica</SelectItem>
                                        <SelectItem value="email">Correo Electrónico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="job-contact-value" className="font-black uppercase tracking-widest text-xs">Dato de Contacto</Label>
                                {jobMetadata?.contact_method === 'email' ? (
                                    <Input
                                        id="job-contact-value"
                                        type="email"
                                        placeholder="nombre@correo.com"
                                        {...register('metadata.contact_value' as any)}
                                    />
                                ) : (
                                    <PhoneInput
                                        value={watch('metadata.contact_value' as any) || ''}
                                        onChange={(val) => setValue('metadata.contact_value' as any, val)}
                                        placeholder="312 345 6789"
                                        error={(errors as any).metadata?.contact_value?.message}
                                    />
                                )}
                                {jobMetadata?.contact_method === 'email' && (errors as any).metadata?.contact_value && (
                                    <p className="text-primary text-[10px] font-black uppercase tracking-widest">{(errors as any).metadata.contact_value.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Business Linking */}
                        {ownedBusinesses.length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-black/10">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="linkBusinessJob"
                                        checked={linkToBusiness}
                                        onCheckedChange={(checked) => {
                                            setLinkToBusiness(checked as boolean)
                                            if (!checked) setSelectedBusinessId('')
                                        }}
                                    />
                                    <Label htmlFor="linkBusinessJob" className="cursor-pointer font-black uppercase tracking-widest text-xs">
                                        ¿Este empleo es de un negocio?
                                    </Label>
                                </div>

                                {linkToBusiness && (
                                    <div className="space-y-2">
                                        <Label htmlFor="businessJob" className="font-black uppercase tracking-widest text-xs">Negocio</Label>
                                        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                                            <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                                                <SelectValue placeholder="Selecciona tu negocio" />
                                            </SelectTrigger>
                                            <SelectContent className="border-2 border-black rounded-none">
                                                {ownedBusinesses.map((business) => (
                                                    <SelectItem key={business.id} value={business.id}>
                                                        {business.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-6 border-t-4 border-black mt-8">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="w-full h-16 text-xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-widest"
                >
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Procesando...</>
                    ) : (
                        'Publicar en la Red Vecinal'
                    )}
                </Button>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 text-center italic">
                * Todas las publicaciones pasan por un filtro de seguridad antes de ser visibles.
            </p>
        </form>
    )
}
