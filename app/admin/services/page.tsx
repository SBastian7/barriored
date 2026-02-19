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
import { Siren, Plus, Trash2, HeartPulse, Landmark, Bus, Wrench, Edit, Loader2 } from 'lucide-react'
import type { PublicService, ServiceCategory } from '@/lib/types'

export default function AdminServicesPage() {
    const supabase = createClient()
    const [services, setServices] = useState<any[]>([])
    const [communities, setCommunities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        community_id: '',
        category: 'emergency' as ServiceCategory,
        name: '',
        description: '',
        phone: '',
        address: '',
        hours: '',
        is_active: true,
        sort_order: 10
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const [servicesRes, communitiesRes] = await Promise.all([
            supabase.from('public_services').select('*, communities(name)').order('category').order('sort_order'),
            supabase.from('communities').select('id, name').order('name')
        ])

        setServices(servicesRes.data || [])
        setCommunities(communitiesRes.data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.community_id || !formData.name) {
            toast.error('Completa los campos obligatorios')
            return
        }

        setSubmitting(true)
        const { error } = await supabase.from('public_services').insert([formData])
        setSubmitting(false)

        if (error) {
            toast.error('Error al crear servicio: ' + error.message)
        } else {
            toast.success('Servicio creado con éxito')
            setFormData({ ...formData, name: '', description: '', phone: '', address: '', hours: '' })
            fetchData()
        }
    }

    async function deleteService(id: string) {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return
        const { error } = await supabase.from('public_services').delete().eq('id', id)
        if (error) toast.error('Error al eliminar')
        else fetchData()
    }

    const categoryIcons: any = {
        emergency: Siren,
        health: HeartPulse,
        government: Landmark,
        transport: Bus,
        utilities: Wrench
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>

    return (
        <div className="space-y-12 pb-24">
            <header className="space-y-2">
                <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
                    Directorio de <span className="text-emerald-600">Servicios</span>
                </h1>
                <p className="font-bold text-black/60 text-sm">Gestiona los contactos de emergencia y servicios públicos del barrio.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form */}
                <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(16,185,129,1)] bg-white lg:sticky lg:top-24">
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight border-b-2 border-black pb-2">Añadir Servicio</h2>
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

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Categoría</Label>
                                <Select onValueChange={(v) => setFormData({ ...formData, category: v as ServiceCategory })} value={formData.category}>
                                    <SelectTrigger className="border-2 border-black rounded-none h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black rounded-none">
                                        <SelectItem value="emergency">Emergencias</SelectItem>
                                        <SelectItem value="health">Salud</SelectItem>
                                        <SelectItem value="government">Gobierno / CAI</SelectItem>
                                        <SelectItem value="transport">Transporte / Terminal</SelectItem>
                                        <SelectItem value="utilities">Servicios Públicos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Nombre del Servicio</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: CAI Galán" />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Teléfono</Label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="312 345 6789" />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Dirección / Horario (Opcional)</Label>
                                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Calle 123 # 45 - 67" className="mb-2" />
                                <Input value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} placeholder="24/7 o Lun-Vie 8am-5pm" />
                            </div>

                            <Button disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs h-12">
                                {submitting ? <Loader2 className="animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Añadir Servicio</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List grouped by community */}
                <div className="lg:col-span-2 space-y-10">
                    {Array.from(new Set(services.map(s => s.communities?.name))).map(commName => (
                        <div key={commName} className="space-y-6">
                            <h3 className="text-xl font-heading font-black uppercase tracking-tighter italic border-l-4 border-emerald-500 pl-4">{commName}</h3>
                            <div className="grid gap-3">
                                {services.filter(s => s.communities?.name === commName).map(svc => {
                                    const Icon = categoryIcons[svc.category] || Siren
                                    return (
                                        <Card key={svc.id} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                                            <CardContent className="p-0">
                                                <div className="flex divide-x-2 divide-black">
                                                    <div className="p-3 bg-black/5 flex items-center justify-center shrink-0">
                                                        <Icon className="h-5 w-5 text-black/40" />
                                                    </div>
                                                    <div className="p-3 flex-1 flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-bold text-sm uppercase tracking-tight">{svc.name}</h4>
                                                            <p className="text-[10px] font-bold text-primary italic leading-none">{svc.phone || 'Sin teléfono'}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px] rounded-none border-black font-black uppercase">{svc.category}</Badge>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteService(svc.id)}
                                                        className="p-3 text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {services.length === 0 && (
                        <div className="p-20 text-center border-4 border-black border-dashed font-black uppercase text-black/20 italic">
                            Sin servicios configurados
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
