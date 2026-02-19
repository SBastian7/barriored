'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle, XCircle, ArrowLeft, User, Calendar, MapPin, Briefcase, DollarSign, MessageSquare, Phone, Mail, Pin, Megaphone, Loader2 } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

export default function AdminPostReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [post, setPost] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        async function fetchPost() {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*, profiles(full_name, avatar_url), communities(name, slug)')
                .eq('id', id)
                .single()

            if (error || !data) {
                toast.error('No se pudo encontrar la publicación')
                router.push('/admin/community')
                return
            }

            setPost(data)
            setLoading(false)
        }

        fetchPost()
    }, [id, supabase, router])

    async function handleAction(action: 'approve' | 'reject') {
        setProcessing(true)
        try {
            const res = await fetch(`/api/community/posts/${id}/${action}`, { method: 'POST' })
            if (!res.ok) throw new Error('Error en el servidor')

            toast.success(action === 'approve' ? 'Publicación aprobada' : 'Publicación rechazada')
            router.push('/admin/community')
            router.refresh()
        } catch (e) {
            toast.error('Algo salió mal')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>

    const typeMeta: any = {
        announcement: { label: 'Anuncio', icon: Megaphone, color: 'bg-primary' },
        event: { label: 'Evento', icon: Calendar, color: 'bg-accent' },
        job: { label: 'Empleo', icon: Briefcase, color: 'bg-secondary' },
    }
    const meta = typeMeta[post.type] || typeMeta.announcement
    const Icon = meta.icon

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-heading font-black uppercase italic tracking-tighter">Revisar <span className="text-primary">Publicación</span></h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                        {post.image_url && (
                            <div className="aspect-video w-full border-b-4 border-black">
                                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <CardContent className="p-8 space-y-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge className={`border-black border rounded-none uppercase tracking-widest text-[10px] ${meta.color} ${post.type === 'event' ? 'text-black' : 'text-white'}`}>
                                    <Icon className="h-3 w-3 mr-2" /> {meta.label}
                                </Badge>
                                {post.is_pinned && <Badge variant="outline" className="border-black border rounded-none uppercase tracking-widest text-[10px] bg-yellow-200 text-black"><Pin className="h-3 w-3 mr-2" /> Fijado</Badge>}
                                <Badge variant="outline" className="border-black border rounded-none uppercase tracking-widest text-[10px] bg-black/5">{post.communities?.name}</Badge>
                            </div>

                            <h2 className="text-4xl font-heading font-black uppercase italic tracking-tight italic leading-tight">{post.title}</h2>

                            <div className="prose prose-lg max-w-none text-black font-medium border-t-2 border-black/10 pt-6 whitespace-pre-wrap">
                                {post.content}
                            </div>

                            {post.type === 'event' && post.metadata && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/10 border-2 border-black border-dashed">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-sm">{post.metadata.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-sm">{new Date(post.metadata.date).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {post.type === 'job' && post.metadata && (
                                <div className="p-4 bg-secondary/10 border-2 border-black border-dashed space-y-4">
                                    <div className="grid grid-cols-2 gap-4 border-b border-black/10 pb-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Categoría</p>
                                            <p className="font-bold text-sm">{post.metadata.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Salario</p>
                                            <p className="font-bold text-sm">{post.metadata.salary_range || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Contacto ({post.metadata.contact_method})</p>
                                        <p className="font-bold text-primary">{post.metadata.contact_value}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="font-heading font-black uppercase italic text-xl border-b-2 border-black pb-2">Información del Autor</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 border-2 border-black bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
                                    {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-black/40" />}
                                </div>
                                <div>
                                    <p className="font-bold text-black uppercase tracking-tight">{post.profiles?.full_name}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">Autor de {post.communities.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2 pt-4 border-t border-black/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Estado Actual</p>
                                <Badge variant={post.status === 'pending' ? 'default' : post.status === 'approved' ? 'outline' : 'destructive'} className="rounded-none border-black font-black">
                                    {post.status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 pt-6">
                        <Button
                            onClick={() => handleAction('approve')}
                            disabled={processing}
                            className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-tighter italic"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : <><CheckCircle className="mr-2 h-6 w-6" /> Aprobar Publicación</>}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleAction('reject')}
                            disabled={processing}
                            className="w-full h-16 text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-tighter italic"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : <><XCircle className="mr-2 h-6 w-6" /> Rechazar Contenido</>}
                        </Button>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 text-center italic mt-10">
                        Al aprobar, la publicación será visible de inmediato en la comunidad de {post.communities.name}.
                    </p>
                </div>
            </div>
        </div>
    )
}
