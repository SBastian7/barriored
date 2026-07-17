'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhoneInput } from '@/components/ui/phone-input'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push(returnUrl)
      router.refresh()
    }
  }

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="text-right -mt-2">
            <Link href="/auth/forgot-password" className="text-xs text-black/60 hover:text-primary italic underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="whatsapp">
        <WhatsAppOTPLogin returnUrl={returnUrl} />
      </TabsContent>
    </Tabs>
  )
}

function WhatsAppOTPLogin({ returnUrl }: { returnUrl: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      setStep('otp')
      setCooldown(60)
      toast.success('Codigo enviado por WhatsApp')
    }
  }

  async function resendOTP() {
    if (cooldown > 0) return
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      setCooldown(60)
      toast.success('Nuevo codigo enviado')
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
      setLoading(false)
    } else {
      // Critical fix: set session from returned tokens
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      router.push(returnUrl)
      router.refresh()
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOTP} className="space-y-4">
        <div>
          <Label htmlFor="wa-phone">Numero WhatsApp</Label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="300 123 4567"
          />
        </div>
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar codigo por WhatsApp'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={verifyOTP} className="space-y-4">
      <div>
        <Label htmlFor="wa-otp">Codigo de verificacion</Label>
        <Input
          id="wa-otp"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Codigo de 6 digitos enviado a tu WhatsApp
        </p>
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>
      <button
        type="button"
        onClick={resendOTP}
        disabled={cooldown > 0 || loading}
        className="w-full text-sm text-black/60 hover:text-black disabled:opacity-40 transition-colors"
      >
        {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar codigo'}
      </button>
    </form>
  )
}
