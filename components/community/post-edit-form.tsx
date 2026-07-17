'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createPostSchema, type CreatePostInput } from '@/lib/validations/community'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { Loader2 } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

type Props = {
    post: CommunityPost
    communitySlug: string
}

export function PostEditForm({ post, communitySlug }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: {
            type: post.type,
            community_id: post.community_id,
            title: post.title,
            content: post.content,
            image_url: post.image_url || '',
            metadata: post.metadata || {},
        } as any
    })

    async function onSubmit(data: CreatePostInput) {
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/community/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Algo salió mal')
            }

            toast.success('¡Actualizado!', {
                description: 'Tu publicación ha sido actualizada correctamente.'
            })

            const postTypePath = post.type === 'announcement' ? 'announcements' : 'events'
            router.push(`/${communitySlug}/community/${postTypePath}/${post.id}`)
            router.refresh()
        } catch (error: any) {
            toast.error('Error', {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }


    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white border-4 border-black p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mt-8">
            <div className="space-y-6">
                {/* Common Fields */}
                <div className="space-y-2">
                    <Label htmlFor="title" className="font-black uppercase tracking-widest text-xs">Título de la Publicación</Label>
                    <Input
                        id="title"
                        placeholder={post.type === 'announcement' ? 'Ej: Se perdió un perrito' : 'Ej: Bingo Bailable Vecinal'}
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
                    bucket="community-images"
                    aspectRatio="16/9"
                    maxWidth="100%"
                />

                {/* Type Specific Fields */}
                {post.type === 'event' && (
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
                    </div>
                )}

            </div>

            <div className="pt-6 border-t-4 border-black mt-8 flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => router.back()}
                    className="flex-1 h-16 text-xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-widest"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="flex-1 h-16 text-xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-widest"
                >
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Actualizando...</>
                    ) : (
                        'Actualizar Publicación'
                    )}
                </Button>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 text-center italic">
                * Los cambios se guardarán inmediatamente sin necesidad de revisión adicional.
            </p>
        </form>
    )
}
