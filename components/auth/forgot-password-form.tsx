'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ForgotPasswordForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <>
      {sent ? (
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">📬</div>
          <h2 className="font-heading font-black text-2xl uppercase tracking-tighter italic">
            Revisa tu correo
          </h2>
          <p className="text-sm text-black/70">
            Te enviamos un enlace para restablecer tu contraseña a <strong>{email}</strong>.
          </p>
          <p className="text-xs text-black/50 italic">¿No lo ves? Revisa tu carpeta de spam.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="forgot_email">Email</Label>
            <Input
              id="forgot_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </Button>
          <div className="mt-4 pt-4 border-t-2 border-dashed border-black text-center">
            <Link href="/auth/login" className="text-sm font-bold text-primary hover:underline italic uppercase tracking-tight">
              Volver al login
            </Link>
          </div>
        </form>
      )}
    </>
  )
}
