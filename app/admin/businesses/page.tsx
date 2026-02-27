'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Loader2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'

type Business = {
  id: string
  name: string
  status: string | null
  created_at: string | null
  featured_requested: boolean | null
  deletion_requested: boolean | null
  deletion_reason: string | null
  categories: { name: string | null } | null
  profiles: { full_name: string | null } | null
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchBusinesses() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id')
        .eq('id', user.id)
        .single()

      if (!profile?.community_id) return

      let query = supabase
        .from('businesses')
        .select('id, name, status, created_at, featured_requested, deletion_requested, deletion_reason, categories(name), profiles!businesses_owner_id_profiles_fkey(full_name)')
        .eq('community_id', profile.community_id)
        .order('created_at', { ascending: false })

      if (statusFilter === 'deletion_requested') {
        query = query.eq('deletion_requested', true)
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter)
      }

      const { data } = await query
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
      toast.error('Error al cargar negocios')
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveDeletion(businessId: string) {
    const { error } = await supabase
      .from('businesses')
      .update({
        is_active: false,
        deletion_requested: false,
        status: 'rejected', // Soft delete by marking inactive
      })
      .eq('id', businessId)

    if (error) {
      toast.error('Error al aprobar eliminación')
    } else {
      toast.success('Negocio desactivado')
      fetchBusinesses()
    }
  }

  async function handleRejectDeletion(businessId: string) {
    const { error } = await supabase
      .from('businesses')
      .update({
        deletion_requested: false,
        deletion_reason: null,
        deletion_requested_at: null,
      })
      .eq('id', businessId)

    if (error) {
      toast.error('Error al rechazar eliminación')
    } else {
      toast.success('Solicitud rechazada')
      fetchBusinesses()
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })

    if (data) setCategories(data)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [statusFilter, categoryFilter])

  const pending = businesses.filter((b) => b.status === 'pending')
  const approved = businesses.filter((b) => b.status === 'approved')
  const deletionRequests = businesses.filter((b) => b.deletion_requested)
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Negocios', active: true }
        ]}
      />
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Gestión de <span className="text-primary italic">Negocios</span>
        </h1>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="brutalist-input w-64">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="deletion_requested">Solicitudes de Eliminación</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="brutalist-input w-64">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && deletionRequests.length > 0 && (statusFilter === 'all' || statusFilter === 'deletion_requested') && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3">
            <span className="bg-red-600 text-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{deletionRequests.length}</span>
            Solicitudes de Eliminación
          </h2>
          <div className="grid gap-4">
            {deletionRequests.map((biz) => (
              <Card key={biz.id} className="border-4 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] bg-red-50 rounded-none">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-2xl font-heading font-black uppercase italic tracking-tighter text-red-600">
                        {biz.name}
                      </p>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">
                        {biz.categories?.name} — Por <span className="text-black">{biz.profiles?.full_name}</span>
                      </p>
                      {biz.deletion_reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Razón: {biz.deletion_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveDeletion(biz.id)}
                      className="brutalist-button bg-red-600 text-white hover:bg-red-700"
                    >
                      Aprobar Eliminación
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectDeletion(biz.id)}
                      className="brutalist-button"
                    >
                      Rechazar
                    </Button>
                    <Link href={`/admin/businesses/${biz.id}`} className="ml-auto">
                      <Button size="sm" variant="outline" className="brutalist-button">
                        <Eye className="h-4 w-4 mr-2" /> Ver Detalles
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && pending.length > 0 && (statusFilter === 'all' || statusFilter === 'pending') && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3">
            <span className="bg-primary text-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{pending.length}</span>
            Pendientes de Aprobación
          </h2>
          <div className="grid gap-4">
            {pending.map((biz) => (
              <Card key={biz.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-2xl font-heading font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">
                      {biz.name}
                      {biz.featured_requested && (
                        <Badge className="ml-2 bg-secondary text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
                          Solicitud destacado
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">
                      {biz.categories?.name} — Por <span className="text-black">{biz.profiles?.full_name}</span>
                    </p>
                  </div>
                  <Link href={`/admin/businesses/${biz.id}`}>
                    <Button size="lg" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs h-12 px-6">
                      <Eye className="h-5 w-5 mr-2" /> Revisar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && approved.length > 0 && (statusFilter === 'all' || statusFilter === 'approved') && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3 text-black/40">
            Aprobados ({approved.length})
          </h2>
          <div className="grid gap-4">
            {approved.map((biz) => (
              <Card key={biz.id} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white/50 rounded-none grayscale hover:grayscale-0 transition-all">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xl font-heading font-black uppercase italic tracking-tighter">
                      {biz.name}
                      {biz.featured_requested && (
                        <Badge className="ml-2 bg-secondary text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
                          Solicitud destacado
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">{biz.categories?.name}</p>
                  </div>
                  <Badge variant="outline" className="opacity-50">Activo</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
