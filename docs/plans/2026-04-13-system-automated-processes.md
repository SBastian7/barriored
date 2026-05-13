# System / Automated Processes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up email verification, password reset flow, transactional emails via Resend, image optimization via Sharp, and client-side error logging.

**Architecture:** Five independent feature areas. Two are already complete (Zod validation, RLS policies). Each remaining area adds new files or modifies existing API routes/components in isolation — no shared state changes between tasks.

**Tech Stack:** Next.js 15 App Router, Supabase Auth, Resend (email), Sharp (image processing), TypeScript

---

## Prerequisites

```bash
npm install resend sharp
npm install --save-dev @types/sharp
```

Add to `.env.local`:
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@barriored.co
```

---

## Task 1: Email Verification UI on Signup

**Files:**
- Modify: `components/auth/signup-form.tsx`

The `supabase.auth.signUp()` call already exists. Supabase sends a verification email automatically when "Confirm email" is enabled in the project Auth settings (Settings → Auth → Email → Confirm email). Enable that in the Supabase dashboard first.

**Step 1: Update signup form to show verification prompt**

Replace the current success handler in `components/auth/signup-form.tsx`. Find the block after `toast.success('Cuenta creada exitosamente')` and replace the entire `else` branch:

```tsx
} else {
  // Update profile with community_id
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
```

Add `emailSent` state at the top of the component:
```tsx
const [emailSent, setEmailSent] = useState(false)
```

Add a conditional render before the `<form>` return:
```tsx
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
```

**Step 2: Verify manually**

1. Run `npm run dev`
2. Go to `/auth/signup`, register with a real email
3. After submit: form should replace itself with the "Revisa tu correo" panel
4. Check inbox for verification email from Supabase

**Step 3: Commit**

```bash
git add components/auth/signup-form.tsx
git commit -m "feat(auth): show email verification prompt after signup"
```

---

## Task 2: Forgot Password Page

**Files:**
- Create: `app/auth/forgot-password/page.tsx`

**Step 1: Create the page**

```tsx
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
```

**Step 2: Verify manually**

1. `npm run dev`
2. Go to `/auth/forgot-password`
3. Enter a registered email, submit
4. Should show "Revisa tu correo" panel
5. Check inbox for password reset email

**Step 3: Commit**

```bash
git add app/auth/forgot-password/page.tsx
git commit -m "feat(auth): add forgot password page"
```

---

## Task 3: Reset Password Page

**Files:**
- Create: `app/auth/reset-password/page.tsx`

**Step 1: Create the page**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

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
      router.push('/auth/login')
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
            Nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!ready ? (
            <p className="text-center text-sm text-black/60 py-4">
              Verificando enlace...
            </p>
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
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Add "Forgot password?" link to login form**

Find the login form component (likely `components/auth/login-form.tsx` or inline in `app/auth/login/page.tsx`). Add below the submit button:

```tsx
<div className="text-center mt-2">
  <Link href="/auth/forgot-password" className="text-xs text-black/60 hover:text-primary italic underline">
    ¿Olvidaste tu contraseña?
  </Link>
</div>
```

**Step 3: Verify manually**

1. Go to `/auth/forgot-password`, enter email, submit
2. Click the link in the reset email
3. Should land on `/auth/reset-password` with the form visible (not "Verificando enlace...")
4. Enter new password, submit — should redirect to `/auth/login`
5. Login with new password — should work

**Step 4: Commit**

```bash
git add app/auth/reset-password/page.tsx
git commit -m "feat(auth): add reset password page"
git add app/auth/login/page.tsx  # or components/auth/login-form.tsx
git commit -m "feat(auth): add forgot password link to login form"
```

---

## Task 4: Resend Email Utility

**Files:**
- Create: `lib/email/resend.ts`

**Step 1: Create the email utility**

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@barriored.co'

export async function sendBusinessSubmittedEmail(ownerEmail: string, businessName: string) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu negocio "${businessName}" está en revisión — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Recibimos el registro de tu negocio <strong>${businessName}</strong>. Nuestro equipo lo revisará en las próximas 24-48 horas.</p>
        <p>Te notificaremos por correo cuando sea aprobado.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendBusinessApprovedEmail(
  ownerEmail: string,
  businessName: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `¡Tu negocio "${businessName}" fue aprobado! — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>¡Felicidades!</p>
        <p>Tu negocio <strong>${businessName}</strong> fue aprobado y ya aparece en el directorio de BarrioRed.</p>
        <p>
          <a href="https://barriored.co/${communitySlug}/directory" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase;">
            Ver mi negocio
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendBusinessRejectedEmail(
  ownerEmail: string,
  businessName: string,
  reason?: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Actualización sobre tu negocio "${businessName}" — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Tu registro de <strong>${businessName}</strong> no pudo ser aprobado en este momento.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Si tienes dudas, responde a este correo o contáctanos por WhatsApp.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}
```

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/email/resend.ts`

**Step 3: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): add Resend email utility for business notifications"
```

---

## Task 5: Wire Emails to Business API Routes

**Files:**
- Modify: `app/api/businesses/route.ts`
- Modify: `app/api/businesses/[id]/approve/route.ts`
- Modify: `app/api/businesses/[id]/reject/route.ts`

**Step 1: Add email on business submission**

In `app/api/businesses/route.ts`, after `return NextResponse.json(data, { status: 201 })`, add before that line:

```ts
// Fire-and-forget confirmation email
const ownerEmail = user.email
if (ownerEmail) {
  sendBusinessSubmittedEmail(ownerEmail, rest.name).catch(console.error)
}
```

Add import at top:
```ts
import { sendBusinessSubmittedEmail } from '@/lib/email/resend'
```

**Step 2: Add email on approval**

Read `app/api/businesses/[id]/approve/route.ts` first, then after the approval DB update succeeds, fetch the business owner's email and send:

```ts
import { sendBusinessApprovedEmail } from '@/lib/email/resend'

// After successful approval update:
const { data: business } = await supabase
  .from('businesses')
  .select('name, owner_id, community_id, communities(slug)')
  .eq('id', params.id)
  .single() as any

if (business) {
  const { data: owner } = await supabase.auth.admin.getUserById(business.owner_id)
  const ownerEmail = owner?.user?.email
  const communitySlug = business.communities?.slug ?? ''
  if (ownerEmail) {
    sendBusinessApprovedEmail(ownerEmail, business.name, communitySlug).catch(console.error)
  }
}
```

**Step 3: Add email on rejection**

Read `app/api/businesses/[id]/reject/route.ts`, then after the rejection update succeeds:

```ts
import { sendBusinessRejectedEmail } from '@/lib/email/resend'

// After successful rejection update:
const { data: business } = await supabase
  .from('businesses')
  .select('name, owner_id, rejection_reason')
  .eq('id', params.id)
  .single() as any

if (business) {
  const { data: owner } = await supabase.auth.admin.getUserById(business.owner_id)
  const ownerEmail = owner?.user?.email
  if (ownerEmail) {
    sendBusinessRejectedEmail(ownerEmail, business.name, business.rejection_reason).catch(console.error)
  }
}
```

**Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 5: Manual verification**

1. Register a new business via the form
2. Check that a "en revisión" email arrives at the owner's email
3. Approve the business from admin panel
4. Check that an "aprobado" email arrives
5. Reject a different business
6. Check that a "rechazado" email arrives

**Step 6: Commit**

```bash
git add app/api/businesses/route.ts app/api/businesses/[id]/approve/route.ts app/api/businesses/[id]/reject/route.ts
git commit -m "feat(email): send transactional emails on business submit/approve/reject"
```

---

## Task 6: Sharp Image Optimization in Upload Routes

**Files:**
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/upload/community/route.ts`
- Modify: `app/api/upload/profile/route.ts`

**Step 1: Create a shared Sharp helper**

Create `lib/image/process.ts`:

```ts
import sharp from 'sharp'

export async function processImage(
  buffer: Buffer,
  maxWidth: number,
  quality = 80
): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}
```

**Step 2: Update business image upload route**

Replace the content of `app/api/upload/route.ts` with:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuid } from 'uuid'
import { processImage } from '@/lib/image/process'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imagenes (JPG, PNG, WebP)' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen muy grande (max 5MB)' }, { status: 400 })
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const id = uuid()
  const basePath = `${user.id}/${id}`

  const [fullBuffer, thumbBuffer] = await Promise.all([
    processImage(rawBuffer, 1200, 80),
    processImage(rawBuffer, 400, 70),
  ])

  const [fullUpload, thumbUpload] = await Promise.all([
    supabase.storage.from('business-images').upload(`${basePath}.webp`, fullBuffer, { contentType: 'image/webp', upsert: false }),
    supabase.storage.from('business-images').upload(`${basePath}-thumb.webp`, thumbBuffer, { contentType: 'image/webp', upsert: false }),
  ])

  if (fullUpload.error) return NextResponse.json({ error: fullUpload.error.message }, { status: 500 })
  if (thumbUpload.error) return NextResponse.json({ error: thumbUpload.error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('business-images').getPublicUrl(fullUpload.data.path)
  const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from('business-images').getPublicUrl(thumbUpload.data.path)

  return NextResponse.json({ url: publicUrl, thumbnailUrl })
}
```

**Step 3: Update community upload route**

Read `app/api/upload/community/route.ts` first, then apply the same pattern:
- Convert to WebP, max 1200px full + 400px thumb
- Return `{ url, thumbnailUrl }`

**Step 4: Update profile upload route**

Read `app/api/upload/profile/route.ts` first, then:
- Avatar only needs one size: 200px WebP, quality 80
- Return `{ url }` (no thumbnail for profiles)

```ts
const processedBuffer = await processImage(rawBuffer, 200, 80)
// upload as `${user.id}/avatar.webp` (overwrite on update)
```

**Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 6: Manual verification**

1. Go to business registration form
2. Upload a large JPEG photo (>500KB)
3. Verify the stored file in Supabase Storage is `.webp` and noticeably smaller
4. Verify both `{id}.webp` and `{id}-thumb.webp` appear in the bucket

**Step 7: Commit**

```bash
git add lib/image/process.ts app/api/upload/route.ts app/api/upload/community/route.ts app/api/upload/profile/route.ts
git commit -m "feat(upload): optimize images with Sharp (WebP, resize, thumbnails)"
```

---

## Task 7: Error Logger Utility

**Files:**
- Create: `lib/logger.ts`

**Step 1: Create the logger**

```ts
type ErrorContext = {
  url?: string
  method?: string
  statusCode?: number
  [key: string]: unknown
}

export async function logError(error: unknown, context: ErrorContext = {}) {
  try {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    await fetch('/api/admin/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_type: 'client',
        error_message: message,
        stack_trace: stack,
        request_url: context.url ?? (typeof window !== 'undefined' ? window.location.href : ''),
        request_method: context.method ?? 'GET',
        status_code: context.statusCode,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    })
  } catch {
    // Never let the logger throw
  }
}
```

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/logger.ts
git commit -m "feat(logging): add client-side error logger utility"
```

---

## Task 8: React Error Boundary

**Files:**
- Create: `components/shared/error-boundary.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create the error boundary**

```tsx
'use client'

import { Component, ReactNode } from 'react'
import { logError } from '@/lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    logError(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background">
          <div className="text-center space-y-4 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white max-w-sm">
            <p className="text-4xl font-heading font-black uppercase tracking-tighter italic">
              Algo salió mal
            </p>
            <p className="text-sm text-black/70">Recarga la página e intenta de nuevo.</p>
            <button
              onClick={() => window.location.reload()}
              className="brutalist-button px-6 py-2 text-sm"
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Step 2: Wrap root layout**

In `app/layout.tsx`, import and wrap the children:

```tsx
import { ErrorBoundary } from '@/components/shared/error-boundary'

// Inside the <body> tag, wrap {children}:
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Manual verification**

To test: temporarily throw in a client component, confirm the error boundary renders the fallback UI.

**Step 5: Commit**

```bash
git add components/shared/error-boundary.tsx app/layout.tsx
git commit -m "feat(logging): add React error boundary with error reporting"
```

---

## Summary

| Task | Status |
|------|--------|
| Business data validation (Zod) | Already done |
| RLS policies on DB | Already done |
| Email verification on signup | Task 1 |
| Password reset — forgot page | Task 2 |
| Password reset — reset page + login link | Task 3 |
| Resend email utility | Task 4 |
| Wire emails to business API routes | Task 5 |
| Sharp image optimization + thumbnails | Task 6 |
| Error logger utility | Task 7 |
| React error boundary + root layout | Task 8 |
