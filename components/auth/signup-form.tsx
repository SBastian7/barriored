'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

type Community = { id: string; name: string }

export function SignupForm() {
  const supabase = createClient()
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])

  useEffect(() => {
    supabase.from('communities').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setCommunities(data)
    })
  }, [supabase])

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email">Con Email</TabsTrigger>
        <TabsTrigger value="whatsapp">Con WhatsApp</TabsTrigger>
      </TabsList>
      <TabsContent value="email">
        <EmailSignupForm communities={communities} />
      </TabsContent>
      <TabsContent value="whatsapp">
        <WhatsAppSignupForm communities={communities} supabase={supabase} router={router} />
      </TabsContent>
    </Tabs>
  )
}

function EmailSignupForm({ communities }: { communities: Community[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', community_id: '' })
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Detect email verification completed elsewhere (e.g. link clicked in another tab)
  // and sign the user in here too, without requiring a manual refresh.
  useEffect(() => {
    if (!emailSent) return

    const interval = setInterval(async () => {
      // Fresh client per tick so the cookie-backed session is re-read, not cached
      const { data: { user } } = await createClient().auth.getUser()
      if (user) {
        clearInterval(interval)
        router.push('/')
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [emailSent, router])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user: newUser }, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, community_id: form.community_id },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      if (newUser) {
        await (supabase as any).from('profiles').update({
          community_id: form.community_id,
          phone: form.phone,
        }).eq('id', newUser.id)
      }
      setLoading(false)
      setEmailSent(true)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-5xl">📬</div>
        <h2 className="font-heading font-black text-2xl uppercase tracking-tighter italic">
          Revisa tu correo
        </h2>
        <p className="text-sm text-black/70">
          Te enviamos un enlace de verificación a <strong>{form.email}</strong>.
          Haz clic en el enlace para activar tu cuenta.
        </p>
        <p className="text-xs text-black/50 italic">¿No lo ves? Revisa tu carpeta de spam.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4 pt-4">
      <div>
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_email">Email</Label>
        <Input id="signup_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_phone">Telefono / WhatsApp (Opcional)</Label>
        <PhoneInput value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} placeholder="300 123 4567" />
      </div>
      <div>
        <Label htmlFor="community">Comunidad</Label>
        <Select value={form.community_id} onValueChange={(v) => setForm({ ...form, community_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona tu barrio" /></SelectTrigger>
          <SelectContent>
            {communities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="signup_password">Contrasena</Label>
        <Input id="signup_password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}

function WhatsAppSignupForm({ communities, supabase, router }: {
  communities: Community[]
  supabase: ReturnType<typeof createClient>
  router: ReturnType<typeof import('next/navigation').useRouter>
}) {
  const [form, setForm] = useState({ full_name: '', phone: '', community_id: '' })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('Ingresa tu nombre completo')
      return
    }
    if (!form.community_id) {
      toast.error('Selecciona tu comunidad')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone }),
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

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: form.phone,
        otp,
        full_name: form.full_name,
        community_id: form.community_id,
      }),
    })
    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
      setLoading(false)
    } else {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      router.push('/')
      router.refresh()
    }
  }

  async function resendOTP() {
    if (cooldown > 0) return
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) toast.error(data.error)
    else { setCooldown(60); toast.success('Nuevo codigo enviado') }
  }

  if (step === 'otp') {
    return (
      <div className="space-y-4 pt-4">
        <p className="text-sm text-black/70">
          Ingresa el codigo de 6 digitos enviado a <strong>{form.phone}</strong> por WhatsApp.
        </p>
        <form onSubmit={verifyOTP} className="space-y-4">
          <div>
            <Label htmlFor="signup-otp">Codigo de verificacion</Label>
            <Input id="signup-otp" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
          </div>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? 'Verificando...' : 'Crear cuenta'}
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
      </div>
    )
  }

  return (
    <form onSubmit={sendOTP} className="space-y-4 pt-4">
      <div>
        <Label htmlFor="wa-full_name">Nombre completo</Label>
        <Input id="wa-full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="wa-phone">Numero WhatsApp</Label>
        <PhoneInput value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} placeholder="300 123 4567" />
      </div>
      <div>
        <Label htmlFor="wa-community">Comunidad</Label>
        <Select value={form.community_id} onValueChange={(v) => setForm({ ...form, community_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona tu barrio" /></SelectTrigger>
          <SelectContent>
            {communities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
        {loading ? 'Enviando codigo...' : 'Continuar con WhatsApp'}
      </Button>
    </form>
  )
}
