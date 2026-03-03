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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  stack_trace: string | null
  request_url: string | null
  status_code: number | null
  created_at: string
  user_id: string | null
  metadata: any
}

export function ErrorLogsTable() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [offset])

  async function fetchLogs() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/logs/error?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()
      setLogs(data.errors || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function getErrorBadgeColor(type: string) {
    switch (type) {
      case 'api_error':
        return 'bg-red-500'
      case 'validation_error':
        return 'bg-yellow-500'
      case 'db_error':
        return 'bg-purple-500'
      case 'client_error':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando error logs...</div>
  }

  return (
    <div className="brutalist-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="w-10"></TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Fecha
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Tipo
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Mensaje
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                URL
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="border-b border-black cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedRow(expandedRow === log.id ? null : log.id)
                  }
                >
                  <TableCell>
                    {expandedRow === log.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={getErrorBadgeColor(log.error_type)}>
                      {log.error_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.error_message}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-xs">
                    {log.request_url || '-'}
                  </TableCell>
                  <TableCell>
                    {log.status_code && (
                      <Badge variant="outline">{log.status_code}</Badge>
                    )}
                  </TableCell>
                </TableRow>

                {expandedRow === log.id && (
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={6} className="p-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold uppercase tracking-widest text-xs mb-2">
                            Stack Trace
                          </h4>
                          <pre className="brutalist-card p-4 text-xs overflow-x-auto bg-black text-green-400 font-mono">
                            {log.stack_trace || 'No stack trace available'}
                          </pre>
                        </div>

                        {log.metadata && (
                          <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs mb-2">
                              Metadata
                            </h4>
                            <pre className="brutalist-card p-4 text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
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
