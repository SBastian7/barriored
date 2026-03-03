'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { Flag, Store, MessageSquare, CheckCircle, XCircle, Clock, Eye, Filter, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    reason: 'all'
  })

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!reporter_id(full_name, id),
        reviewer:profiles!reviewed_by(full_name, id)
      `)
      .order('created_at', { ascending: false })

    setReports(data || [])
    setLoading(false)
  }

  async function updateReportStatus(reportId: string, newStatus: string) {
    setProcessing(reportId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No autenticado')
        return
      }

      const { error } = await supabase
        .from('content_reports')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', reportId)

      if (error) throw error

      toast.success(`Reporte ${newStatus === 'resolved' ? 'resuelto' : newStatus === 'dismissed' ? 'descartado' : 'marcado como revisado'}`)
      fetchReports()
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error('Error al actualizar reporte')
    } finally {
      setProcessing(null)
    }
  }

  const filteredReports = reports.filter(report => {
    if (filters.type !== 'all' && report.reported_entity_type !== filters.type) return false
    if (filters.status !== 'all' && report.status !== filters.status) return false
    if (filters.reason !== 'all' && report.reason !== filters.reason) return false
    return true
  })

  const pending = filteredReports.filter(r => r.status === 'pending')
  const reviewed = filteredReports.filter(r => r.status === 'reviewed')
  const resolved = filteredReports.filter(r => r.status === 'resolved')

  const statusColors: any = {
    pending: 'bg-yellow-200 text-black border-black',
    reviewed: 'bg-blue-200 text-black border-black',
    resolved: 'bg-emerald-500 text-white border-black',
    dismissed: 'bg-gray-300 text-black border-black'
  }

  const reasonLabels: any = {
    inappropriate: 'Inapropiado',
    spam: 'Spam',
    incorrect: 'Información incorrecta',
    other: 'Otro'
  }

  const handleClearFilters = () => {
    setFilters({ type: 'all', status: 'all', reason: 'all' })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Moderación de <span className="text-primary">Reportes</span>
        </h1>
        <p className="font-bold text-black/60">Gestiona los reportes de contenido inapropiado de la comunidad.</p>
      </header>

      {/* Stats Strip */}
      <div className="flex divide-x-4 divide-black border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-yellow-600">{pending.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">Pendientes</p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-blue-600">{reviewed.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">Revisados</p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-emerald-600">{resolved.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">Resueltos</p>
        </div>
      </div>

      {/* Filter Controls */}
      <section className="flex flex-wrap items-center gap-4 p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <span className="font-black uppercase tracking-widest text-[10px] text-black/40">Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-black uppercase tracking-widest text-[10px] text-black/60">Tipo:</label>
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger className="brutalist-input w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="business">Negocios</SelectItem>
              <SelectItem value="post">Publicaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-black uppercase tracking-widest text-[10px] text-black/60">Estado:</label>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="brutalist-input w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="reviewed">Revisado</SelectItem>
              <SelectItem value="resolved">Resuelto</SelectItem>
              <SelectItem value="dismissed">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-black uppercase tracking-widest text-[10px] text-black/60">Razón:</label>
          <Select value={filters.reason} onValueChange={(v) => setFilters({ ...filters, reason: v })}>
            <SelectTrigger className="brutalist-input w-52 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inappropriate">Inapropiado</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="incorrect">Información incorrecta</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(filters.type !== 'all' || filters.status !== 'all' || filters.reason !== 'all') && (
          <Button
            onClick={handleClearFilters}
            variant="outline"
            size="sm"
            className="brutalist-button h-10 gap-2"
          >
            <X className="h-4 w-4" /> Limpiar Filtros
          </Button>
        )}

        <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-black/40">
          Mostrando {filteredReports.length} de {reports.length} reportes
        </div>
      </section>

      {/* Reports List */}
      <section className="space-y-6">
        {filteredReports.length === 0 ? (
          <Card className="border-4 border-black border-dashed bg-white shadow-none py-12 text-center">
            <p className="font-bold text-black/30 uppercase tracking-widest">No hay reportes que coincidan con los filtros</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map(report => (
              <Card key={report.id} className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
                    {/* Icon */}
                    <div className="p-4 md:w-16 bg-primary/10 flex items-center justify-center shrink-0">
                      {report.reported_entity_type === 'business' ? (
                        <Store className="h-6 w-6 text-black" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-black" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
                        <Badge variant="outline" className="text-[10px] rounded-none py-0 px-1 border-black">
                          {report.reported_entity_type === 'business' ? 'Negocio' : 'Publicación'}
                        </Badge>
                        <Badge className={statusColors[report.status]}>
                          {report.status === 'pending' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                          {report.status === 'resolved' && <CheckCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {report.status === 'dismissed' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {report.status.toUpperCase()}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>

                      <div>
                        <p className="font-bold text-sm">
                          <span className="text-primary">Razón:</span> {reasonLabels[report.reason]}
                        </p>
                        {report.description && (
                          <p className="text-sm text-black/70 mt-1">{report.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-black/50">
                        <span>Reportado por: {report.reporter?.full_name || 'Desconocido'}</span>
                        {report.reviewed_by && (
                          <>
                            <span>•</span>
                            <span>Revisado por: {report.reviewer?.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col divide-y-2 divide-black md:w-48">
                      <Link
                        href={report.reported_entity_type === 'business'
                          ? `/admin/businesses/${report.reported_entity_id}`
                          : `/admin/community/${report.reported_entity_id}`}
                        className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-black/5 transition-colors p-4"
                      >
                        <Eye className="h-3 w-3" /> Ver Contenido
                      </Link>

                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateReportStatus(report.id, 'reviewed')}
                            disabled={processing === report.id}
                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors p-4"
                          >
                            {processing === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            Revisar
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                            disabled={processing === report.id}
                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors p-4"
                          >
                            {processing === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Resolver
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                            disabled={processing === report.id}
                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors p-4"
                          >
                            {processing === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Descartar
                          </button>
                        </>
                      )}

                      {report.status !== 'pending' && (
                        <button
                          onClick={() => updateReportStatus(report.id, 'pending')}
                          disabled={processing === report.id}
                          className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors p-4"
                        >
                          {processing === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                          Reabrir
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
