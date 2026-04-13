'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rotate-12 border-4 border-black -z-10" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/10 -rotate-12 border-4 border-black -z-10" />

      <Card className="w-full max-w-md border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-5xl font-heading font-black uppercase tracking-tighter italic mb-2">
            Barrio<span className="text-primary italic">Red</span>
          </CardTitle>
          <CardDescription className="text-xs font-black uppercase tracking-widest text-black/60 italic">
            Recupera tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  )
}
