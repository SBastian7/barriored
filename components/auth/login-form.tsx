'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [requestId, setRequestId] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)

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
      setRequestId(data.request_id)
      setStep('otp')
      toast.success('Codigo enviado por WhatsApp')
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, request_id: requestId }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      router.push(returnUrl)
      router.refresh()
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOTP} className="space-y-4">
        <div>
          <Label htmlFor="phone">Numero WhatsApp</Label>
          <Input id="phone" placeholder="573001234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <p className="text-xs text-gray-500 mt-1">Formato: 57 + 10 digitos</p>
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
        <Label htmlFor="otp">Codigo de verificacion</Label>
        <Input id="otp" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
        <p className="text-xs text-gray-500 mt-1">Ingresa el codigo de 6 digitos enviado a tu WhatsApp</p>
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>
    </form>
  )
}
