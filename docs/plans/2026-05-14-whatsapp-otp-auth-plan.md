# WhatsApp OTP Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing (but broken) WhatsApp OTP auth system — swap GetOTP.co for Twilio Verify, fix the session bug, add resend, phone-only signup, and link-phone-to-account features.

**Architecture:** All API routes and UI components already exist. We replace the OTP provider (GetOTP.co → Twilio Verify), fix the critical client-side session bug (`supabase.auth.setSession()` never called), then layer on the missing features (resend, phone-only signup tab, profile link section). The Supabase magic-link → `verifyOtp` session trick is kept as-is.

**Tech Stack:** Next.js 14 App Router, Supabase Auth (admin client), Twilio Verify SDK (`twilio` npm package already installed), Zod validation, React hooks, `<PhoneInput>` component at `components/ui/phone-input.tsx`

---

## Pre-Flight: Twilio Setup (Manual)

Before running any code, do this in the Twilio Console:

1. Go to **Verify → Services** → Create a new service named "BarrioRed"
2. Under **Channels**, enable **WhatsApp** (requires a WhatsApp Business sender configured in your account)
3. Copy the `Service SID` (starts with `VA`)
4. Add to `.env.local`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Note: `TWILIO_WHATSAPP_FROM` is used by `sendWhatsAppMessage` for regular messages and is separate from Verify.

---

## Task 1: Add Twilio Verify helpers

**Files:**
- Modify: `lib/twilio.ts`

**Step 1: Add `sendWhatsAppOTP` and `checkWhatsAppOTP` functions**

Open `lib/twilio.ts` and append after `sendWhatsAppMessage`:

```typescript
export async function sendWhatsAppOTP(phone: string): Promise<void> {
  const e164 = normalizeColombianPhone(phone)
  await getClient().verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: e164, channel: 'whatsapp' })
}

export async function checkWhatsAppOTP(phone: string, code: string): Promise<boolean> {
  const e164 = normalizeColombianPhone(phone)
  try {
    const check = await getClient().verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: e164, code })
    return check.status === 'approved'
  } catch {
    return false
  }
}
```

> `normalizeColombianPhone` already converts `573001234567` → `+573001234567`. Twilio Verify needs E.164 (with +). No `whatsapp:` prefix for Verify (unlike `sendWhatsAppMessage`).

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/twilio.ts`

**Step 3: Commit**

```bash
git add lib/twilio.ts
git commit -m "feat(auth): add Twilio Verify helpers to twilio lib"
```

---

## Task 2: Update validation schemas

**Files:**
- Modify: `lib/validations/auth.ts`

**Step 1: Update schemas**

Replace the full file content:

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  community_id: z.string().uuid(),
})

// Phone without + sign: 57XXXXXXXXXX
const colombianPhone = z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido (formato: 57XXXXXXXXXX)')

export const whatsappOtpSendSchema = z.object({
  phone: colombianPhone,
})

// request_id removed — Twilio manages OTP state by phone number
export const whatsappOtpVerifySchema = z.object({
  phone: colombianPhone,
  otp: z.string().length(6, 'Codigo de 6 digitos'),
  // Optional signup metadata — used only when creating a new account
  full_name: z.string().min(2).optional(),
  community_id: z.string().uuid().optional(),
})

export const whatsappOtpLinkSchema = z.object({
  phone: colombianPhone,
  otp: z.string().length(6, 'Codigo de 6 digitos'),
})
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add lib/validations/auth.ts
git commit -m "feat(auth): update OTP schemas for Twilio Verify (remove request_id, add signup fields)"
```

---

## Task 3: Update send API route

**Files:**
- Modify: `app/api/auth/whatsapp-otp/send/route.ts`

**Step 1: Replace GetOTP.co with Twilio Verify**

Replace the full file:

```typescript
import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'
import { sendWhatsAppOTP } from '@/lib/twilio'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  try {
    await sendWhatsAppOTP(parsed.data.phone)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Twilio rate limit
    if (err?.status === 429) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera antes de pedir otro codigo.' }, { status: 429 })
    }
    console.error('[whatsapp-otp/send]', err)
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }
}
```

> Response no longer includes `request_id` — Twilio tracks OTP state internally by phone number.

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/auth/whatsapp-otp/send/route.ts
git commit -m "feat(auth): replace GetOTP.co with Twilio Verify in send route"
```

---

## Task 4: Update verify API route

**Files:**
- Modify: `app/api/auth/whatsapp-otp/verify/route.ts`

**Step 1: Replace GetOTP.co check with Twilio check**

Replace the full file:

```typescript
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { whatsappOtpVerifySchema } from '@/lib/validations/auth'
import { checkWhatsAppOTP } from '@/lib/twilio'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp, full_name, community_id } = parsed.data

  const valid = await checkWhatsAppOTP(phone, otp)
  if (!valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if user exists with this phone
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const email = `${phone}@phone.barriored.co`
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: full_name || '', phone },
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
    }
    userId = newUser.user.id

    // Populate profile with signup metadata if provided
    await supabaseAdmin.from('profiles').update({
      phone,
      full_name: full_name || null,
      community_id: community_id || null,
    }).eq('id', userId)
  }

  // Generate session via magic link → verifyOtp
  const email = `${phone}@phone.barriored.co`
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  const url = new URL(linkData.properties.action_link)
  const tokenHash = url.searchParams.get('token')
  if (!tokenHash) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })
  if (sessionError || !sessionData.session) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  })
}
```

> Key changes: Twilio check replaces GetOTP, synthetic email changed from `@whatsapp.barriored.co` → `@phone.barriored.co`, `full_name`/`community_id` populated for new signup users.

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/auth/whatsapp-otp/verify/route.ts
git commit -m "feat(auth): replace GetOTP with Twilio in verify route, handle signup metadata"
```

---

## Task 5: Create link-phone API route

**Files:**
- Create: `app/api/auth/whatsapp-otp/link/route.ts`

**Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { whatsappOtpLinkSchema } from '@/lib/validations/auth'
import { checkWhatsAppOTP } from '@/lib/twilio'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp } = parsed.data

  // Verify caller is authenticated
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify OTP
  const valid = await checkWhatsAppOTP(phone, otp)
  if (!valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check phone not already taken by another account
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .neq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este numero ya esta registrado en otra cuenta' }, { status: 409 })
  }

  // Link phone to current user's profile
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ phone })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Error vinculando numero' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/auth/whatsapp-otp/link/route.ts
git commit -m "feat(auth): add link-phone-to-account API route"
```

---

## Task 6: DB migration — unique phone index

**Files:**
- Create: `supabase/migrations/20260514000000_add_phone_unique_index.sql`

**Step 1: Create migration file**

```sql
-- Prevent two accounts from sharing the same WhatsApp number.
-- Partial index: only applies when phone is not null.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
ON public.profiles (phone)
WHERE phone IS NOT NULL;
```

**Step 2: Apply to Supabase**

Use the Supabase MCP tool to run:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
ON public.profiles (phone)
WHERE phone IS NOT NULL;
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260514000000_add_phone_unique_index.sql
git commit -m "feat(db): add unique partial index on profiles.phone"
```

---

## Task 7: Fix login form — session bug, PhoneInput, resend button

**Files:**
- Modify: `components/auth/login-form.tsx`

**Step 1: Replace the `WhatsAppOTPLogin` component**

The current `WhatsAppOTPLogin` (lines 71-143) has three problems:
1. Uses plain `<Input>` instead of `<PhoneInput>` 
2. After verify, never calls `supabase.auth.setSession()`
3. No resend button

Replace the entire `WhatsAppOTPLogin` function (lines 71-143) with:

```typescript
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
```

**Step 2: Add missing import**

At the top of `login-form.tsx`, add `PhoneInput` and `useEffect` imports:

```typescript
import { useState, useEffect } from 'react'
import { PhoneInput } from '@/components/ui/phone-input'
```

(`useEffect` is not in the current imports — `useState` is already imported, so just add `useEffect`)

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/auth/login-form.tsx
git commit -m "fix(auth): setSession after OTP verify, use PhoneInput, add resend button"
```

---

## Task 8: Add WhatsApp signup tab to signup form

**Files:**
- Modify: `components/auth/signup-form.tsx`

**Step 1: Replace the full file**

```typescript
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
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', community_id: '' })
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user: newUser }, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, community_id: form.community_id },
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
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add components/auth/signup-form.tsx
git commit -m "feat(auth): add WhatsApp phone-only signup tab"
```

---

## Task 9: Add "Vincular WhatsApp" to profile settings

**Files:**
- Modify: `components/profile/profile-form.tsx`

**Step 1: Add a `LinkWhatsApp` sub-component**

After the existing `ProfileForm` component definition (after line 201), add:

```typescript
type LinkWhatsAppProps = {
  onLinked: () => void
}

export function LinkWhatsApp({ onLinked }: LinkWhatsAppProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

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
    if (data.error) toast.error(data.error)
    else { setStep('otp'); setCooldown(60); toast.success('Codigo enviado') }
  }

  async function linkPhone(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      toast.success('Numero de WhatsApp vinculado correctamente')
      onLinked()
    }
  }

  return (
    <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
      <p className="font-black uppercase tracking-widest text-xs">Vincular WhatsApp</p>
      <p className="text-xs text-black/60">Vincula tu numero de WhatsApp para poder iniciar sesion sin contrasena.</p>

      {step === 'phone' ? (
        <form onSubmit={sendOTP} className="space-y-3">
          <PhoneInput value={phone} onChange={setPhone} placeholder="300 123 4567" />
          <Button type="submit" size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar codigo por WhatsApp'}
          </Button>
        </form>
      ) : (
        <form onSubmit={linkPhone} className="space-y-3">
          <Input placeholder="Codigo de 6 digitos" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
          <Button type="submit" size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? 'Verificando...' : 'Vincular numero'}
          </Button>
          <button
            type="button"
            onClick={() => { if (cooldown === 0) sendOTP({ preventDefault: () => {} } as any) }}
            disabled={cooldown > 0 || loading}
            className="w-full text-xs text-black/60 hover:text-black disabled:opacity-40"
          >
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar codigo'}
          </button>
        </form>
      )}
    </div>
  )
}
```

**Step 2: Add `useState` and `useEffect` to imports (they're already imported)**

Check the imports at the top of the file — `useState` is already imported. Add `useEffect` if missing.

**Step 3: Use `LinkWhatsApp` in the page that renders the profile**

Find where `ProfileForm` is rendered (likely in the profile page). Conditionally render `<LinkWhatsApp>` below `<ProfileForm>` when `profile.phone` is null:

```typescript
// In the parent page/component that holds ProfileForm:
{!profile.phone && (
  <LinkWhatsApp onLinked={() => router.refresh()} />
)}
```

The exact location depends on how the profile page is structured. Look in `app/dashboard/` or wherever the profile form is used.

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add components/profile/profile-form.tsx
git commit -m "feat(auth): add LinkWhatsApp component to profile settings"
```

---

## Task 10: Find and update profile page to wire LinkWhatsApp

**Files:**
- Identify: wherever `<ProfileForm>` is rendered (search `grep -r "ProfileForm" app/`)
- Modify: that file

**Step 1: Find the profile page**

```bash
grep -r "ProfileForm" app/ --include="*.tsx" -l
```

**Step 2: Add `LinkWhatsApp` import and conditional render**

At the top of the found file, add:
```typescript
import { LinkWhatsApp } from '@/components/profile/profile-form'
```

Find where `<ProfileForm>` is rendered (in edit mode), and add after it:
```typescript
{!profile.phone && (
  <div className="mt-6">
    <LinkWhatsApp onLinked={() => router.refresh()} />
  </div>
)}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add <profile-page-file>
git commit -m "feat(auth): wire LinkWhatsApp into profile page"
```

---

## Final Verification

**Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

**Step 2: Dev server smoke test**

```bash
npm run dev
```

Test these flows manually:
1. Go to `/auth/login` → WhatsApp tab → enter Colombia number → OTP received → enter code → redirected ✓
2. Go to `/auth/signup` → Con WhatsApp tab → fill name/phone/community → OTP received → enter code → account created + logged in ✓
3. Log in with email account that has no phone → go to profile → "Vincular WhatsApp" section visible → complete OTP flow → phone linked ✓
4. Resend button: appears after code step, disabled with countdown for 60s ✓

**Step 3: Final commit if any cleanup**

```bash
git add -p
git commit -m "feat(auth): whatsapp otp authentication complete"
```
