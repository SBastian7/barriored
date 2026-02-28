'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SuspendedPage() {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkSuspensionStatus()
  }, [])

  async function checkSuspensionStatus() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, suspension_reason')
      .eq('id', user.id)
      .single()

    if (!profile?.is_suspended) {
      // User is not suspended, redirect to home
      router.push('/')
      return
    }

    setReason(profile.suspension_reason || '')
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="brutalist-card max-w-md bg-red-50 border-red-600 border-4">
        <CardHeader className="border-b-4 border-black bg-red-600 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            <CardTitle className="font-heading font-black uppercase italic text-2xl tracking-tighter">
              Cuenta Suspendida
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <p className="text-black/80">
            Tu cuenta ha sido suspendida temporalmente por un administrador.
          </p>

          {reason && (
            <div className="border-l-4 border-red-600 pl-4 py-2 bg-white">
              <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-1">
                Razón de Suspensión:
              </p>
              <p className="text-sm">{reason}</p>
            </div>
          )}

          <div className="border-2 border-black bg-white p-4">
            <p className="text-sm text-black/60">
              <strong>¿Qué significa esto?</strong>
            </p>
            <ul className="text-sm text-black/60 mt-2 space-y-1 ml-4">
              <li>• No puedes acceder a la plataforma</li>
              <li>• Tus negocios y publicaciones siguen visibles</li>
              <li>• Puedes contactar al administrador para apelar</li>
            </ul>
          </div>

          <p className="text-sm text-black/60">
            Si crees que esto es un error, contacta al equipo de BarrioRed para resolver la
            situación.
          </p>

          <Button onClick={handleLogout} className="brutalist-button w-full h-12 bg-black text-white">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
