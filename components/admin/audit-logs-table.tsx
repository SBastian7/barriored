'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
  user: {
    full_name: string
    avatar_url: string | null
    role: string
  }
  metadata: any
}

interface Props {
  isSuperAdmin: boolean
}

export function AuditLogsTable({ isSuperAdmin }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [offset])

  async function fetchLogs() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/logs/audit?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function getActionBadge(action: string) {
    if (action.includes('approve')) return 'bg-green-500'
    if (action.includes('reject')) return 'bg-red-500'
    if (action.includes('delete')) return 'bg-red-700'
    if (action.includes('create')) return 'bg-blue-500'
    if (action.includes('update')) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando logs...</div>
  }

  return (
    <div className="brutalist-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Fecha
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Usuario
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Acción
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Entidad
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                IP
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-b border-black">
                <TableCell className="font-mono text-sm">
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {log.user.avatar_url && (
                      <img
                        src={log.user.avatar_url}
                        alt={log.user.full_name}
                        className="w-8 h-8 rounded-full border-2 border-black"
                      />
                    )}
                    <div>
                      <div className="font-bold">{log.user.full_name}</div>
                      <Badge
                        variant="outline"
                        className="text-xs uppercase tracking-widest"
                      >
                        {log.user.role}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getActionBadge(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {log.entity_type}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.metadata?.ip || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t-2 border-black">
        <div className="text-sm text-muted-foreground">
          Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="brutalist-button"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="brutalist-button"
            size="sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
