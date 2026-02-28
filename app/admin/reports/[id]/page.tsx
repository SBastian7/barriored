'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Flag, CheckCircle, XCircle, Eye, User, Calendar, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Contenido inapropiado',
  spam: 'Spam o publicidad engañosa',
  incorrect: 'Información incorrecta',
  other: 'Otro motivo',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
}

export default function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // Fetch report with all related data
    supabase
      .from('content_reports')
      .select(`
        *,
        reporter:reporter_id(full_name, avatar_url),
        reviewer:reviewed_by(full_name)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setReport(data)

        // Fetch the reported entity details
        if ((data as any)?.reported_entity_type === 'business') {
          supabase
            .from('businesses')
            .select('id, name, description, address, status, categories(name)')
            .eq('id', (data as any).reported_entity_id)
            .single()
            .then(({ data: business }) => {
              setReport((prev: any) => ({ ...prev, entity: business }))
            })
        } else if ((data as any)?.reported_entity_type === 'post') {
          supabase
            .from('community_posts')
            .select('id, title, content, type, status')
            .eq('id', (data as any).reported_entity_id)
            .single()
            .then(({ data: post }) => {
              setReport((prev: any) => ({ ...prev, entity: post }))
            })
        }
      })

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setCurrentUser(data))
      }
    })
  }, [id, supabase])

  async function handleAction(action: 'reviewed' | 'resolved' | 'dismissed') {
    if (!currentUser) {
      toast.error('Usuario no autenticado')
      return
    }

    setLoading(true)
    const { error } = await (supabase as any)
      .from('content_reports')
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser.id,
      })
      .eq('id', id)

    setLoading(false)

    if (error) {
      toast.error('Error actualizando el reporte')
      return
    }

    toast.success(`Reporte marcado como ${STATUS_LABELS[action]}`)
    router.push('/admin/reports')
  }

  if (!report) return <p className="text-center py-8">Cargando...</p>

  const getEntityLink = () => {
    if (report.reported_entity_type === 'business') {
      return `/admin/businesses/${report.reported_entity_id}`
    }
    // For posts, link to the public view
    return `/community/${report.entity?.type}s/${report.reported_entity_id}`
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Reportes', href: '/admin/reports' },
          { label: `Reporte #${report.id.slice(0, 8)}`, active: true }
        ]}
      />

      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden">
        <CardHeader className="border-b-4 border-black bg-muted p-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-4xl font-heading font-black uppercase italic tracking-tighter flex items-center gap-3">
                <Flag className="h-8 w-8 text-primary" />
                Reporte de Contenido
              </CardTitle>
              <p className="text-xs font-black uppercase tracking-widest text-black/50 italic mt-2">
                ID: {report.id}
              </p>
            </div>
            <Badge
              variant={report.status === 'pending' ? 'destructive' : 'default'}
              className="border-2 border-black text-sm font-black uppercase tracking-widest"
            >
              {STATUS_LABELS[report.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Report Details */}
          <div className="space-y-4">
            <h3 className="text-xl font-heading font-black uppercase italic border-b-2 border-black pb-2">
              Detalles del Reporte
            </h3>

            <div className="grid gap-4">
              {/* Reporter */}
              <div className="flex items-center gap-3 border-2 border-black p-4 bg-accent/5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-accent/20 p-2 border-2 border-black">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Reportado por
                  </p>
                  <p className="font-bold text-base">
                    {(report.reporter as any)?.full_name || 'Usuario eliminado'}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-3 border-2 border-black p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-secondary p-2 border-2 border-black">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Fecha del reporte
                  </p>
                  <p className="font-bold text-base">
                    {new Date(report.created_at).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="flex items-center gap-3 border-2 border-black p-4 bg-primary/5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-primary p-2 border-2 border-black">
                  <Flag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Motivo
                  </p>
                  <p className="font-bold text-base">{REASON_LABELS[report.reason]}</p>
                </div>
              </div>

              {/* Description */}
              {report.description && (
                <div className="border-4 border-black p-5 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">
                    Descripción adicional
                  </p>
                  <p className="text-base leading-relaxed italic text-black/80">
                    "{report.description}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reported Entity */}
          <div className="space-y-4">
            <h3 className="text-xl font-heading font-black uppercase italic border-b-2 border-black pb-2 flex items-center justify-between">
              <span>Contenido Reportado</span>
              <Badge className="bg-accent/20 text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
                {report.reported_entity_type === 'business' ? 'Negocio' : 'Publicación'}
              </Badge>
            </h3>

            {report.entity ? (
              <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-2xl font-heading font-black uppercase italic tracking-tighter">
                        {report.entity.name || report.entity.title}
                      </p>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50 mt-1">
                        {report.reported_entity_type === 'business'
                          ? report.entity.categories?.name
                          : `Tipo: ${report.entity.type}`}
                      </p>
                    </div>
                    <Link href={getEntityLink()} target="_blank">
                      <Button
                        variant="outline"
                        size="sm"
                        className="brutalist-button"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver contenido
                      </Button>
                    </Link>
                  </div>

                  {report.entity.description || report.entity.content ? (
                    <div className="border-l-4 border-black/20 pl-4 py-2">
                      <p className="text-sm text-black/70 line-clamp-4">
                        {report.entity.description || report.entity.content}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 pt-2 border-t-2 border-dashed border-black/10">
                    <Badge variant="outline">
                      Estado: {report.entity.status}
                    </Badge>
                    {report.reported_entity_type === 'business' && report.entity.address && (
                      <p className="text-xs text-black/50">{report.entity.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-red-50">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-bold text-red-600">
                    ⚠️ El contenido reportado ya no existe o fue eliminado
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Review Info */}
          {report.reviewed_at && (
            <div className="border-4 border-black p-5 bg-accent/5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">
                Información de revisión
              </p>
              <p className="text-sm">
                <span className="font-bold">Revisado por:</span>{' '}
                {(report.reviewer as any)?.full_name || 'Administrador'}
              </p>
              <p className="text-sm mt-1">
                <span className="font-bold">Fecha:</span>{' '}
                {new Date(report.reviewed_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {report.status === 'pending' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 mt-6 border-t-4 border-dashed border-black">
              <Button
                onClick={() => handleAction('reviewed')}
                disabled={loading}
                variant="outline"
                className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase italic h-14 text-sm"
              >
                <Eye className="h-5 w-5 mr-2" />
                Marcar como Revisado
              </Button>
              <Button
                onClick={() => handleAction('resolved')}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-black uppercase italic h-14 text-sm"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Resolver y Tomar Acción
              </Button>
              <Button
                onClick={() => handleAction('dismissed')}
                disabled={loading}
                variant="destructive"
                className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase italic h-14 text-sm"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Descartar Reporte
              </Button>
            </div>
          )}

          {report.status !== 'pending' && (
            <div className="text-center py-6 border-4 border-dashed border-black/20">
              <p className="text-sm font-black uppercase tracking-widest text-black/40">
                Este reporte ya ha sido procesado
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
