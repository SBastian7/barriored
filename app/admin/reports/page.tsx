import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Flag, AlertTriangle } from 'lucide-react'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Contenido inapropiado',
  spam: 'Spam',
  incorrect: 'Información incorrecta',
  other: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
}

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('community_id').eq('id', user!.id).single()

  const { data: reports } = await supabase
    .from('content_reports')
    .select(`
      *,
      reporter:reporter_id(full_name),
      business:reported_entity_id(name),
      post:reported_entity_id(title)
    `)
    .order('created_at', { ascending: false })

  const pending = reports?.filter((r: any) => r.status === 'pending') ?? []
  const reviewed = reports?.filter((r: any) => r.status === 'reviewed') ?? []
  const resolved = reports?.filter((r: any) => r.status === 'resolved') ?? []
  const dismissed = reports?.filter((r: any) => r.status === 'dismissed') ?? []

  // Helper to get entity name
  const getEntityName = (report: any) => {
    if (report.reported_entity_type === 'business') {
      return report.business?.name || 'Negocio eliminado'
    }
    return report.post?.title || 'Publicación eliminada'
  }

  const getEntityTypeBadge = (type: string) => {
    if (type === 'business') {
      return (
        <Badge className="bg-accent/20 text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
          Negocio
        </Badge>
      )
    }
    return (
      <Badge className="bg-primary/20 text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
        Publicación
      </Badge>
    )
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Reportes', active: true }
        ]}
      />
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Gestión de <span className="text-primary italic">Reportes</span>
        </h1>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3">
            <span className="bg-primary text-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {pending.length}
            </span>
            Reportes Pendientes
          </h2>
          <div className="grid gap-4">
            {pending.map((report: any) => (
              <Card
                key={report.id}
                className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-primary" />
                        <p className="text-2xl font-heading font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">
                          {getEntityName(report)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getEntityTypeBadge(report.reported_entity_type)}
                        <Badge className="bg-secondary/20 text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
                          {REASON_LABELS[report.reason]}
                        </Badge>
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50">
                        Reportado por <span className="text-black">{(report.reporter as any)?.full_name}</span> el{' '}
                        {new Date(report.created_at).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      {report.description && (
                        <p className="text-sm text-black/70 italic border-l-4 border-black/20 pl-3 mt-2">
                          "{report.description}"
                        </p>
                      )}
                    </div>
                    <Link href={`/admin/reports/${report.id}`}>
                      <Button
                        size="lg"
                        className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs h-12 px-6"
                      >
                        <Eye className="h-5 w-5 mr-2" /> Revisar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3 text-black/60">
            Revisados ({reviewed.length})
          </h2>
          <div className="grid gap-3">
            {reviewed.map((report: any) => (
              <Card
                key={report.id}
                className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white/50 rounded-none"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg font-heading font-black uppercase italic tracking-tighter">
                        {getEntityName(report)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                        {REASON_LABELS[report.reason]} — {getEntityTypeBadge(report.reported_entity_type)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="opacity-60">
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3 text-black/40">
            Resueltos ({resolved.length})
          </h2>
          <div className="grid gap-3">
            {resolved.map((report: any) => (
              <Card
                key={report.id}
                className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white/30 rounded-none grayscale"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-lg font-heading font-black uppercase italic tracking-tighter">
                      {getEntityName(report)}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                      {REASON_LABELS[report.reason]}
                    </p>
                  </div>
                  <Badge variant="outline" className="opacity-40">
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {dismissed.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3 text-black/40">
            Descartados ({dismissed.length})
          </h2>
          <div className="grid gap-3">
            {dismissed.map((report: any) => (
              <Card
                key={report.id}
                className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white/30 rounded-none grayscale"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-lg font-heading font-black uppercase italic tracking-tighter">
                      {getEntityName(report)}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                      {REASON_LABELS[report.reason]}
                    </p>
                  </div>
                  <Badge variant="outline" className="opacity-40">
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!reports || reports.length === 0 && (
        <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-accent/5">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-black/20" />
            <p className="text-xl font-black uppercase tracking-wide text-black/40">
              No hay reportes aún
            </p>
            <p className="text-sm text-black/30 mt-2">
              Los reportes de contenido aparecerán aquí
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
