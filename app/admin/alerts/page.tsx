'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Trash2, Power, Droplets, Shield, Construction, Info, Loader2 } from 'lucide-react'
import type { CommunityAlert } from '@/lib/types'

export default function AdminAlertsPage() {
    const supabase = createClient()
    const [alerts, setAlerts] = useState<any[]>([])
    const [communities, setCommunities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        community_id: '',
        type: 'general',
        title: '',
        description: '',
        severity: 'info',
        is_active: true
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const [alertsRes, communitiesRes] = await Promise.all([
            supabase.from('community_alerts').select('*, communities(name)').order('created_at', { ascending: false }),
            supabase.from('communities').select('id, name').order('name')
        ])

        setAlerts(alertsRes.data || [])
        setCommunities(communitiesRes.data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.community_id || !formData.title) {
            toast.error('Completa los campos obligatorios')
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error('No autenticado')
            return
        }

        setSubmitting(true)
        const { error } = await supabase.from('community_alerts').insert([{ ...formData, author_id: user.id }])
        setSubmitting(false)

        if (error) {
            toast.error('Error al crear alerta: ' + error.message)
        } else {
            toast.success('Alerta creada con éxito')
            setFormData({ ...formData, title: '', description: '' })
            fetchData()
        }
    }

    async function toggleStatus(id: string, current: boolean) {
        const { error } = await supabase.from('community_alerts').update({ is_active: !current }).eq('id', id)
        if (error) toast.error('Error al actualizar')
        else fetchData()
    }

    async function deleteAlert(id: string) {
        if (!confirm('¿Estás seguro de eliminar esta alerta?')) return
        const { error } = await supabase.from('community_alerts').delete().eq('id', id)
        if (error) toast.error('Error al eliminar')
        else fetchData()
    }

    const alertIcons: any = {
        water: Droplets,
        power: Power,
        security: Shield,
        construction: Construction,
        general: Info
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>

    return (
        <div className="space-y-12 pb-24">
            <header className="space-y-2">
                <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
                    Gestión de <span className="text-primary">Alertas</span>
                </h1>
                <p className="font-bold text-black/60 text-sm">Crea avisos críticos o de servicios públicos para las comunidades.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form */}
                <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(255,59,48,1)] bg-white lg:sticky lg:top-24">
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight border-b-2 border-black pb-2">Nueva Alerta</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Comunidad</Label>
                                <Select onValueChange={(v) => setFormData({ ...formData, community_id: v })} value={formData.community_id}>
                                    <SelectTrigger className="border-2 border-black rounded-none h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <SelectValue placeholder="Seleccionar Barrio" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black rounded-none">
                                        {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Tipo</Label>
                                    <Select onValueChange={(v) => setFormData({ ...formData, type: v })} value={formData.type}>
                                        <SelectTrigger className="border-2 border-black rounded-none h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-2 border-black rounded-none">
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="water">Agua</SelectItem>
                                            <SelectItem value="power">Energía</SelectItem>
                                            <SelectItem value="security">Seguridad</SelectItem>
                                            <SelectItem value="construction">Obras</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Gravedad</Label>
                                    <Select onValueChange={(v) => setFormData({ ...formData, severity: v })} value={formData.severity}>
                                        <SelectTrigger className="border-2 border-black rounded-none h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-2 border-black rounded-none">
                                            <SelectItem value="info">Informativa</SelectItem>
                                            <SelectItem value="warning">Advertencia</SelectItem>
                                            <SelectItem value="critical">Crítica</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Título</Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Corte de agua mañana" />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Descripción</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalles de la alerta..." rows={3} />
                            </div>

                            <Button disabled={submitting} className="w-full border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs h-12">
                                {submitting ? <Loader2 className="animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Crear Alerta</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight">Alertas Existentes</h2>

                    {alerts.length === 0 ? (
                        <div className="p-20 text-center border-4 border-black border-dashed font-black uppercase text-black/20 italic">
                            No hay alertas registradas
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map(alert => {
                                const Icon = alertIcons[alert.type] || Info
                                const severityColors: any = {
                                    info: 'bg-emerald-500',
                                    warning: 'bg-yellow-400',
                                    critical: 'bg-primary'
                                }
                                return (
                                    <Card key={alert.id} className={`border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all ${!alert.is_active ? 'opacity-50 grayscale' : ''}`}>
                                        <CardContent className="p-0">
                                            <div className="flex divide-x-2 divide-black">
                                                <div className={`w-12 flex items-center justify-center shrink-0 ${severityColors[alert.severity] || 'bg-white'}`}>
                                                    <Icon className={`h-6 w-6 ${alert.severity === 'warning' ? 'text-black' : 'text-white'}`} />
                                                </div>
                                                <div className="p-4 flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Badge variant="outline" className="text-[9px] rounded-none py-0 px-1 border-black bg-white">{alert.communities?.name}</Badge>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-black/40">{new Date(alert.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <h4 className="font-heading font-black uppercase text-lg italic leading-tight">{alert.title}</h4>
                                                    <p className="text-xs text-black/60 line-clamp-2 mt-1">{alert.description}</p>
                                                </div>
                                                <div className="flex flex-col divide-y-2 divide-black w-32">
                                                    <button
                                                        onClick={() => toggleStatus(alert.id, alert.is_active)}
                                                        className={`flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-black/5 transition-colors ${alert.is_active ? 'text-emerald-600' : 'text-primary'}`}
                                                    >
                                                        <AlertTriangle className="h-3 w-3" /> {alert.is_active ? 'Activa' : 'Inactiva'}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAlert(alert.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Trash2 className="h-3 w-3" /> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
