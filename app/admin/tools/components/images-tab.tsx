'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'
import { StorageOverviewCards } from './storage-overview-cards'

interface StorageSummary {
  total: { bytes: number; gb: string }
  buckets: Array<{ name: string; bytes: number; gb: string; file_count: number }>
  last_synced: string | null
}

export function ImagesTab() {
  const [data, setData] = useState<StorageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function fetchSummary() {
    try {
      const res = await fetch('/api/admin/storage/summary')
      if (!res.ok) throw new Error('Failed to fetch')
      const summary = await res.json()
      setData(summary)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar datos de almacenamiento')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/storage/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      toast.success('✅ Almacenamiento sincronizado')
      await fetchSummary()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Error al sincronizar almacenamiento')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-black/40 font-bold uppercase mb-4">No hay datos disponibles</p>
        <Button onClick={handleSync} disabled={syncing} className="brutalist-button">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sincronizar Ahora
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-black/60">
            Última sincronización: {data.last_synced ? new Date(data.last_synced).toLocaleString('es-CO') : 'Nunca'}
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="brutalist-button"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar Ahora
        </Button>
      </div>

      <StorageOverviewCards total={data.total} buckets={data.buckets} />
    </div>
  )
}
