'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function SignupForm() {
  const supabase = createClient()

  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', community_id: '' })
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    supabase.from('communities').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setCommunities(data)
    })
  }, [supabase])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, community_id: form.community_id },
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      // Update profile with community_id (trigger only sets full_name)
      const { data: { user: newUser } } = await supabase.auth.getUser()
      if (newUser) {
        await (supabase as any).from('profiles').update({
          community_id: form.community_id,
          phone: form.phone,
          role: 'user',
        }).eq('id', newUser.id)
      }
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
        <p className="text-xs text-black/50 italic">
          ¿No lo ves? Revisa tu carpeta de spam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_email">Email</Label>
        <Input id="signup_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_phone">Telefono / WhatsApp</Label>
        <PhoneInput
          value={form.phone}
          onChange={(val) => setForm({ ...form, phone: val })}
          placeholder="300 123 4567"
        />
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
