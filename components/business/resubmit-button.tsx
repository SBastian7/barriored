'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function ResubmitButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleResubmit() {
    setLoading(true)
    const res = await fetch(`/api/businesses/${businessId}/resubmit`, { method: 'POST' })
    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json()
      alert(data.error || 'Error al reenviar')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResubmit}
      disabled={loading}
      className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      {loading ? 'Reenviando...' : 'Reenviar Solicitud'}
    </Button>
  )
}
