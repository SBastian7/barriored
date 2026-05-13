'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    if (code) {
      // Exchange the recovery code client-side so PASSWORD_RECOVERY event fires
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setTimedOut(true)
      })
    }

    const timeout = setTimeout(() => setTimedOut(true), 8000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase, searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Contraseña actualizada')
      router.push('/')
    }
  }

  return (
    <>
      {!ready ? (
        timedOut ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-sm text-black/70">El enlace no es válido o ya expiró.</p>
            <Link href="/auth/forgot-password" className="text-sm font-bold text-primary hover:underline italic uppercase tracking-tight">
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm text-black/60 py-4">
            Verificando enlace...
          </p>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new_password">Nueva contraseña</Label>
            <Input
              id="new_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </Button>
        </form>
      )}
    </>
  )
}
