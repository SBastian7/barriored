'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', community_id: '' })
  const [loading, setLoading] = useState(false)

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
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          community_id: form.community_id,
          phone: form.phone,
          role: 'merchant',
        }).eq('id', user.id)
      }
      toast.success('Cuenta creada exitosamente')
      router.push('/')
      router.refresh()
    }
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
        <Input id="signup_phone" placeholder="573001234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
