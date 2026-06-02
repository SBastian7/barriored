# Services Page Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement production-ready "GUARDAR NÚMEROS" (VCF download), "INFORMAR SERVICIO" (suggestion dialog), and "REPORTAR DATO ERRADO" (report dialog) on the `/{community}/services` page.

**Architecture:** New `service_feedback` Supabase table (anonymous INSERT allowed via RLS) stores both suggestions and reports. Two API routes handle writes. Three client-side components (VCF utility, suggestion dialog, report dialog) are wired into `ServicesPageClient`. No auth required.

**Tech Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS) · Radix UI Dialog · Zod · sonner toast · Tailwind CSS (neo-brutalist)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260528000000_create_service_feedback.sql` | Table DDL + RLS policies |
| Create | `lib/validations/service-feedback.ts` | Zod schemas for both API routes |
| Create | `lib/utils/vcf.ts` | Pure VCF generation + browser download |
| Create | `app/api/community/services/suggest/route.ts` | POST — new service suggestion |
| Create | `app/api/community/services/report/route.ts` | POST — incorrect data report |
| Create | `components/community/service-suggestion-dialog.tsx` | "INFORMAR SERVICIO" dialog |
| Create | `components/community/service-report-dialog.tsx` | "REPORTAR DATO ERRADO" dialog |
| Modify | `components/community/services-page-client.tsx` | Wire all three features + add `communityId` prop |
| Modify | `app/[community]/services/page.tsx` | Pass `communityId` to `ServicesPageClient` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260528000000_create_service_feedback.sql`

- [ ] **Step 1.1: Write the migration file**

```sql
-- supabase/migrations/20260528000000_create_service_feedback.sql

CREATE TABLE public.service_feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('suggestion', 'report')),
  service_id      UUID        REFERENCES public.public_services(id) ON DELETE SET NULL,
  service_name    TEXT,
  category        TEXT,
  phone           TEXT,
  address         TEXT,
  message         TEXT        NOT NULL,
  reporter_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name   TEXT,
  reporter_whatsapp TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_feedback ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated users can submit feedback
CREATE POLICY "service_feedback_insert"
  ON public.service_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can read feedback for their community
CREATE POLICY "service_feedback_select_admin"
  ON public.service_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.is_super_admin = true
        OR (p.role = 'admin' AND p.community_id = service_feedback.community_id)
      )
    )
  );

-- Admins can update status (reviewed/dismissed)
CREATE POLICY "service_feedback_update_admin"
  ON public.service_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.is_super_admin = true
        OR (p.role = 'admin' AND p.community_id = service_feedback.community_id)
      )
    )
  );

-- Only super admins can delete
CREATE POLICY "service_feedback_delete_superadmin"
  ON public.service_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.is_super_admin = true
    )
  );
```

- [ ] **Step 1.2: Apply migration via Supabase CLI**

```bash
npx supabase db push
```

Expected: Migration applies cleanly. If not connected, apply the SQL manually via Supabase Dashboard → SQL Editor.

- [ ] **Step 1.3: Verify table exists**

In Supabase Dashboard → Table Editor, confirm `service_feedback` appears with the correct columns and that RLS is enabled (green shield icon).

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260528000000_create_service_feedback.sql
git commit -m "feat: add service_feedback table with RLS"
```

---

## Task 2: Zod Validation Schemas

**Files:**
- Create: `lib/validations/service-feedback.ts`

- [ ] **Step 2.1: Create the schemas file**

```ts
// lib/validations/service-feedback.ts
import { z } from 'zod'

export const serviceSuggestionSchema = z.object({
  community_id:      z.string().uuid('community_id debe ser UUID'),
  service_name:      z.string().min(2, 'Mínimo 2 caracteres').max(100),
  category:          z.enum(['emergency', 'health', 'utilities']),
  phone:             z.string().min(3, 'Teléfono requerido').max(30),
  address:           z.string().max(200).optional(),
  message:           z.string().max(500).optional(),
  reporter_name:     z.string().max(100).optional(),
  reporter_whatsapp: z.string().max(30).optional(),
})

export const serviceReportSchema = z.object({
  community_id:       z.string().uuid('community_id debe ser UUID'),
  service_id:         z.string().uuid().optional(),
  service_name_hint:  z.string().max(100).optional(),
  message:            z.string().min(5, 'Mínimo 5 caracteres').max(500),
  reporter_name:      z.string().max(100).optional(),
  reporter_whatsapp:  z.string().max(30).optional(),
})

export type ServiceSuggestionInput = z.infer<typeof serviceSuggestionSchema>
export type ServiceReportInput     = z.infer<typeof serviceReportSchema>
```

- [ ] **Step 2.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No new errors from `lib/validations/service-feedback.ts`.

- [ ] **Step 2.3: Commit**

```bash
git add lib/validations/service-feedback.ts
git commit -m "feat: add Zod schemas for service feedback"
```

---

## Task 3: VCF Utility

**Files:**
- Create: `lib/utils/vcf.ts`

- [ ] **Step 3.1: Create the utility**

```ts
// lib/utils/vcf.ts
import type { PublicService } from '@/lib/types'

export function generateVcf(services: PublicService[]): string {
  return services
    .filter(s => Boolean(s.phone))
    .map(s =>
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${s.name}`,
        `ORG:${s.name}`,
        `TEL;TYPE=WORK:${s.phone}`,
        s.address ? `ADR;TYPE=WORK:;;${s.address};;;;` : null,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n')
    )
    .join('\r\n')
}

export function downloadVcf(services: PublicService[], filename: string): void {
  const content = generateVcf(services)
  if (!content) return
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3.3: Commit**

```bash
git add lib/utils/vcf.ts
git commit -m "feat: add VCF generation and download utility"
```

---

## Task 4: Suggestion API Route

**Files:**
- Create: `app/api/community/services/suggest/route.ts`

- [ ] **Step 4.1: Create the route**

```ts
// app/api/community/services/suggest/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceSuggestionSchema } from '@/lib/validations/service-feedback'

const RATE_LIMIT        = 20   // max suggestions per community per window
const RATE_WINDOW_MS    = 60 * 60 * 1_000  // 1 hour

export async function POST(request: Request) {
  try {
    const body   = await request.json()
    const parsed = serviceSuggestionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const {
      community_id, service_name, category, phone,
      address, message, reporter_name, reporter_whatsapp,
    } = parsed.data

    const supabase    = await createClient()
    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()

    const { count } = await supabase
      .from('service_feedback' as any)
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .eq('type', 'suggestion')
      .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Demasiados envíos. Espera un momento.' },
        { status: 429 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('service_feedback' as any)
      .insert({
        community_id,
        type:              'suggestion',
        service_name,
        category,
        phone,
        address:           address           || null,
        message:           message           || null,
        reporter_id:       user?.id          ?? null,
        reporter_name:     reporter_name     || null,
        reporter_whatsapp: reporter_whatsapp || null,
        status:            'pending',
      })

    if (error) {
      console.error('[suggest] insert error:', error)
      return NextResponse.json({ error: 'Error al guardar la sugerencia.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[suggest] unhandled error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
```

- [ ] **Step 4.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4.3: Smoke-test with curl**

Start the dev server (`npm run dev`), then in a separate terminal:

```bash
curl -s -X POST http://localhost:3000/api/community/services/suggest \
  -H "Content-Type: application/json" \
  -d '{"community_id":"00000000-0000-0000-0000-000000000000","service_name":"Test","category":"emergency","phone":"123"}' \
  | python -m json.tool
```

Expected with a real `community_id`: `{"success": true}` and 201 status.
Expected with the fake UUID: 500 (FK violation) — that's correct behaviour.

- [ ] **Step 4.4: Commit**

```bash
git add app/api/community/services/suggest/route.ts
git commit -m "feat: add POST /api/community/services/suggest route"
```

---

## Task 5: Report API Route

**Files:**
- Create: `app/api/community/services/report/route.ts`

- [ ] **Step 5.1: Create the route**

```ts
// app/api/community/services/report/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceReportSchema } from '@/lib/validations/service-feedback'

const RATE_LIMIT     = 10
const RATE_WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: Request) {
  try {
    const body   = await request.json()
    const parsed = serviceReportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const {
      community_id, service_id, service_name_hint,
      message, reporter_name, reporter_whatsapp,
    } = parsed.data

    const supabase = await createClient()

    // Validate that the referenced service exists and is active
    if (service_id) {
      const { data: svc } = await supabase
        .from('public_services')
        .select('id')
        .eq('id', service_id)
        .eq('is_active', true)
        .single()

      if (!svc) {
        return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
      }
    }

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count }   = await supabase
      .from('service_feedback' as any)
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .eq('type', 'report')
      .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Demasiados reportes. Espera un momento.' },
        { status: 429 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('service_feedback' as any)
      .insert({
        community_id,
        type:              'report',
        service_id:        service_id        ?? null,
        service_name:      service_name_hint  || null,  // stored in service_name for admin review
        message,
        reporter_id:       user?.id           ?? null,
        reporter_name:     reporter_name      || null,
        reporter_whatsapp: reporter_whatsapp  || null,
        status:            'pending',
      })

    if (error) {
      console.error('[report] insert error:', error)
      return NextResponse.json({ error: 'Error al guardar el reporte.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[report] unhandled error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
```

- [ ] **Step 5.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5.3: Commit**

```bash
git add app/api/community/services/report/route.ts
git commit -m "feat: add POST /api/community/services/report route"
```

---

## Task 6: ServiceSuggestionDialog Component

**Files:**
- Create: `components/community/service-suggestion-dialog.tsx`

- [ ] **Step 6.1: Create the component**

```tsx
// components/community/service-suggestion-dialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label }    from '@/components/ui/label'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast }          from 'sonner'
import { Siren, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'emergency', label: 'Emergencias' },
  { value: 'health',    label: 'Salud' },
  { value: 'utilities', label: 'Servicios Públicos' },
]

interface Props {
  communityId:   string
  communityName: string
  children:      React.ReactNode
}

export function ServiceSuggestionDialog({ communityId, communityName, children }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({
    service_name:      '',
    category:          '',
    phone:             '',
    address:           '',
    message:           '',
    reporter_name:     '',
    reporter_whatsapp: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setForm({ service_name: '', category: '', phone: '', address: '', message: '', reporter_name: '', reporter_whatsapp: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.service_name || !form.category || !form.phone) {
      toast.error('Nombre, categoría y teléfono son obligatorios.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/community/services/suggest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, community_id: communityId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar.')
      toast.success('¡Gracias! Revisaremos tu sugerencia.')
      setOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err.message === 'Failed to fetch' ? 'Sin conexión. Intenta de nuevo.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md rounded-none border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-0 gap-0">
        <DialogHeader className="border-b-2 border-black p-5 space-y-1">
          <DialogTitle className="font-heading font-black italic uppercase tracking-tight text-xl flex items-center gap-2">
            <Siren className="w-5 h-5 text-primary" /> Informar Servicio
          </DialogTitle>
          <p className="font-mono text-[10px] uppercase tracking-widest text-black/50">
            {communityName.toUpperCase()} · SUGERENCIA DE NUEVO SERVICIO
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Nombre del servicio *
            </Label>
            <Input
              value={form.service_name}
              onChange={e => set('service_name', e.target.value)}
              placeholder="Ej: Centro de Salud Sur"
              className="brutalist-input mt-1"
              required
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Categoría *
            </Label>
            <Select value={form.category} onValueChange={v => set('category', v)} required>
              <SelectTrigger className="brutalist-input mt-1">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Teléfono *
            </Label>
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="Ej: (606) 312 0000"
              className="brutalist-input mt-1"
              required
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Dirección (opcional)
            </Label>
            <Input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Ej: Calle 5 #10-20"
              className="brutalist-input mt-1"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Información adicional (opcional)
            </Label>
            <Textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Horario, servicios que ofrece, observaciones..."
              className="brutalist-input mt-1"
              rows={3}
            />
          </div>

          <div className="border-t-2 border-dashed border-black/20 pt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">
              Tu contacto (opcional · para confirmarte que lo agregamos)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu nombre</Label>
                <Input value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} placeholder="María García" className="brutalist-input mt-1" />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu WhatsApp</Label>
                <Input value={form.reporter_whatsapp} onChange={e => set('reporter_whatsapp', e.target.value)} placeholder="310 000 0000" className="brutalist-input mt-1" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Siren className="w-4 h-4" />}
            {loading ? 'Enviando...' : 'Enviar Sugerencia'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6.3: Commit**

```bash
git add components/community/service-suggestion-dialog.tsx
git commit -m "feat: add ServiceSuggestionDialog component"
```

---

## Task 7: ServiceReportDialog Component

**Files:**
- Create: `components/community/service-report-dialog.tsx`

- [ ] **Step 7.1: Create the component**

```tsx
// components/community/service-report-dialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label }    from '@/components/ui/label'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast }         from 'sonner'
import { Flag, Loader2 } from 'lucide-react'

interface Props {
  communityId:      string
  serviceId?:       string   // undefined = generic CTA mode
  serviceName?:     string
  children:         React.ReactNode
}

export function ServiceReportDialog({ communityId, serviceId, serviceName, children }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({
    service_name_hint: '',
    message:           '',
    reporter_name:     '',
    reporter_whatsapp: '',
  })

  const isGeneral = !serviceId

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setForm({ service_name_hint: '', message: '', reporter_name: '', reporter_whatsapp: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.message.trim().length < 5) {
      toast.error('Describe qué dato está errado (mínimo 5 caracteres).')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/community/services/report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          community_id:      communityId,
          service_id:        serviceId                           || undefined,
          service_name_hint: isGeneral ? form.service_name_hint : undefined,
          message:           form.message,
          reporter_name:     form.reporter_name     || undefined,
          reporter_whatsapp: form.reporter_whatsapp || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar.')
      toast.success('Reporte enviado. ¡Gracias por ayudar!')
      setOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err.message === 'Failed to fetch' ? 'Sin conexión. Intenta de nuevo.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md rounded-none border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-0 gap-0">
        <DialogHeader className="border-b-2 border-black p-5 space-y-1">
          <DialogTitle className="font-heading font-black italic uppercase tracking-tight text-xl flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" /> Reportar Dato Errado
          </DialogTitle>
          {serviceName && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/50">
              {serviceName.toUpperCase()}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isGeneral && (
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
                ¿Cuál servicio? (opcional)
              </Label>
              <Input
                value={form.service_name_hint}
                onChange={e => set('service_name_hint', e.target.value)}
                placeholder="Ej: Aguas y Aguas"
                className="brutalist-input mt-1"
              />
            </div>
          )}

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              ¿Qué dato está errado? *
            </Label>
            <Textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Ej: El teléfono está desactualizado. El número correcto es..."
              className="brutalist-input mt-1"
              rows={4}
              required
            />
          </div>

          <div className="border-t-2 border-dashed border-black/20 pt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">
              Tu contacto (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu nombre</Label>
                <Input value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} placeholder="María García" className="brutalist-input mt-1" />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu WhatsApp</Label>
                <Input value={form.reporter_whatsapp} onChange={e => set('reporter_whatsapp', e.target.value)} placeholder="310 000 0000" className="brutalist-input mt-1" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            {loading ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7.3: Commit**

```bash
git add components/community/service-report-dialog.tsx
git commit -m "feat: add ServiceReportDialog component"
```

---

## Task 8: Wire Everything into ServicesPageClient

**Files:**
- Modify: `components/community/services-page-client.tsx`
- Modify: `app/[community]/services/page.tsx`

### 8a — Add `communityId` prop to page.tsx call site

- [ ] **Step 8a.1: Update `app/[community]/services/page.tsx`**

Replace the entire file content:

```tsx
// app/[community]/services/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import type { PublicService } from '@/lib/types'
import { ServicesPageClient } from '@/components/community/services-page-client'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single<{ name: string }>()

    if (!community) return {}
    return { title: `Servicios y Emergencias · ${community.name} | BarrioRed` }
}

export default async function ServicesPage({
    params,
}: {
    params: Promise<{ community: string }>
}) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()
    if (!community) notFound()

    const { data: servicesRes } = await supabase
        .from('public_services')
        .select('*')
        .eq('community_id', community.id)
        .eq('is_active', true)
        .in('category', ['emergency', 'health', 'utilities'])
        .order('category')
        .order('sort_order')

    const services = (servicesRes ?? []) as any as PublicService[]

    return (
        <div className="pb-24 md:pb-0">
            <ServicesPageClient
                services={services}
                communityName={community.name}
                communityId={community.id}
            />
        </div>
    )
}
```

### 8b — Update `ServicesPageClient`

- [ ] **Step 8b.1: Replace `components/community/services-page-client.tsx` entirely**

```tsx
// components/community/services-page-client.tsx
'use client'

import { useState } from 'react'
import {
  Phone, MapPin, Clock, Bookmark, Siren, Wrench, HeartPulse, Flag,
} from 'lucide-react'
import type { PublicService }    from '@/lib/types'
import { downloadVcf }           from '@/lib/utils/vcf'
import { ServiceSuggestionDialog } from '@/components/community/service-suggestion-dialog'
import { ServiceReportDialog }     from '@/components/community/service-report-dialog'
import type React from 'react'

const GROUPS = {
  emergency: { label: 'EMERGENCIAS',       short: 'EMERGENCIAS', color: '#E11D48', Icon: Siren,      patternClass: 'br-pattern-diag' },
  health:    { label: 'SALUD',             short: 'SALUD',       color: '#16A34A', Icon: HeartPulse,  patternClass: 'br-pattern-grid' },
  utilities: { label: 'SERVICIOS PÚBLICOS', short: 'SERVICIOS',  color: '#2563EB', Icon: Wrench,      patternClass: 'br-pattern-dots' },
} as const

type GroupKey    = keyof typeof GROUPS
type ActiveFilter = 'todos' | GroupKey

const DISPLAY_GROUPS: GroupKey[] = ['emergency', 'health', 'utilities']

interface Props {
  services:      PublicService[]
  communityName: string
  communityId:   string
}

// ─── Service Card ────────────────────────────────────────────
function ServiceCard({
  service, groupKey, rot, communityId,
}: {
  service:     PublicService
  groupKey:    GroupKey
  rot:         number
  communityId: string
}) {
  const g           = GROUPS[groupKey]
  const Icon        = g.Icon
  const isShortPhone = !!service.phone && service.phone.replace(/\D/g, '').length <= 4

  return (
    <div className="br-rot" style={{ '--rot': `${rot}deg` } as React.CSSProperties}>
      <div className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden h-full transition-[transform,box-shadow] duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)]">
        {/* Color spine */}
        <div className="h-2 border-b-[3px] border-black flex-shrink-0" style={{ background: g.color }} />

        <div className="flex flex-col gap-3 p-5 flex-1">
          {/* Header */}
          <div className="flex gap-3 items-start">
            <div
              className="w-11 h-11 flex-shrink-0 border-[2.5px] border-black shadow-[2px_2px_0px_black] flex items-center justify-center"
              style={{ background: g.color }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-black italic uppercase tracking-tight text-[19px] leading-[1.02]">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-[12.5px] leading-snug text-black/55 italic mt-1 line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
            {/* Flag / report button */}
            <ServiceReportDialog
              communityId={communityId}
              serviceId={service.id}
              serviceName={service.name}
            >
              <button
                className="border-2 border-black shadow-[2px_2px_0px_black] p-1.5 flex-shrink-0 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_black] hover:bg-primary hover:text-white transition-all"
                title="Reportar dato errado"
                type="button"
              >
                <Flag className="w-3 h-3" />
              </button>
            </ServiceReportDialog>
          </div>

          {/* Phone */}
          {service.phone && (
            <a
              href={`tel:${service.phone.replace(/[^\d+]/g, '')}`}
              className="border-[2.5px] border-black shadow-[2px_2px_0px_black] overflow-hidden flex no-underline"
            >
              <div className="w-11 flex-shrink-0 bg-black flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-[#FFEFD9] px-3.5 py-2 flex items-center justify-between gap-2">
                <span
                  className="font-heading font-black italic leading-none"
                  style={{ color: g.color, fontSize: isShortPhone ? '2.1rem' : '1.375rem', letterSpacing: '-0.02em' }}
                >
                  {service.phone}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 text-right leading-snug">
                  LLAMAR<br />AHORA
                </span>
              </div>
            </a>
          )}

          {/* Address */}
          {service.address && (
            <div className="flex gap-2 items-start text-[12.5px]">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-55" />
              <span className="font-semibold text-[#333]">{service.address}</span>
            </div>
          )}

          {/* Hours */}
          <div className="mt-auto pt-3 border-t-[1.5px] border-dashed border-black/20 flex items-center">
            {service.hours && (
              <span
                className="inline-flex items-center gap-1.5 border border-black px-2 py-1 font-heading font-black text-[10px] uppercase tracking-widest"
                style={{ background: service.hours.toUpperCase().includes('24') ? '#FBBF24' : 'white' }}
              >
                <Clock className="w-2.5 h-2.5" /> {service.hours}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page Client ─────────────────────────────────────────────
export function ServicesPageClient({ services, communityName, communityId }: Props) {
  const [active, setActive] = useState<ActiveFilter>('todos')

  const visibleGroups = active === 'todos' ? DISPLAY_GROUPS : [active as GroupKey]

  const tabs: Array<{ key: ActiveFilter; label: string; color: string }> = [
    { key: 'todos', label: 'TODOS', color: '#E11D48' },
    ...DISPLAY_GROUPS.map(k => ({ key: k as ActiveFilter, label: GROUPS[k].short, color: GROUPS[k].color })),
  ]

  const hasPhones = services.some(s => s.phone)

  function handleDownloadVcf() {
    if (!hasPhones) return
    downloadVcf(services, `emergencias-${communityName.toLowerCase().replace(/\s+/g, '-')}.vcf`)
  }

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-[#FFF7ED] border-b-4 border-black px-4 md:px-8 pt-8 pb-9">
        <div className="br-pattern-diag absolute inset-0 opacity-30 pointer-events-none" />
        <div className="absolute -top-16 -right-12 w-56 md:w-72 h-56 md:h-72 bg-primary border-4 border-black rounded-full shadow-[-12px_12px_0_black] pointer-events-none" />
        <div className="absolute top-16 right-52 w-16 h-16 bg-[#16A34A] border-[3px] border-black rotate-12 shadow-[6px_6px_0px_black] pointer-events-none hidden md:block" />
        <div className="absolute bottom-5 right-36 w-20 h-20 bg-accent border-[3px] border-black -rotate-[8deg] shadow-[6px_6px_0px_black] pointer-events-none hidden md:block" />

        <div className="relative grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-8 items-end max-w-7xl mx-auto">
          {/* Left */}
          <div>
            <div className="flex gap-1.5 items-center flex-wrap">
              {['INICIO', communityName.toUpperCase(), 'SERVICIOS'].map((item, i, arr) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center border-2 border-black px-3 py-2 font-heading font-black text-[11px] uppercase tracking-widest shadow-[2px_2px_0px_black] ${i === arr.length - 1 ? 'bg-primary text-white' : 'bg-white'}`}>
                    {item}
                  </span>
                  {i < arr.length - 1 && <span className="text-black/50 text-sm">›</span>}
                </span>
              ))}
            </div>

            <div className="flex gap-2.5 items-center mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black italic uppercase text-sm tracking-widest -rotate-[3deg]">
                <Siren className="w-3.5 h-3.5" /> DIRECTORIO PÚBLICO
              </span>
              <span className="font-mono text-[13px] uppercase tracking-widest bg-black text-white px-2.5 py-1">
                {communityName.toUpperCase()}
              </span>
            </div>

            <h1
              className="font-heading font-black italic uppercase mt-3.5 leading-[0.84]"
              style={{ fontSize: 'clamp(3rem, 8vw, 96px)', letterSpacing: '-0.035em' }}
            >
              <span className="block">SERVICIOS</span>
              <span className="block text-primary ml-4 md:ml-8">Y EMERGENCIAS</span>
            </h1>

            <p className="mt-4 max-w-lg text-base font-medium leading-relaxed">
              Líneas de atención, centros de salud y servicios oficiales para los habitantes de{' '}
              <strong>{communityName}</strong>. Verificados por la comunidad.
            </p>

            <div className="flex gap-2.5 mt-5 flex-wrap">
              {/* GUARDAR NÚMEROS */}
              <button
                onClick={handleDownloadVcf}
                disabled={!hasPhones}
                className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-black text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                type="button"
              >
                <Bookmark className="w-3.5 h-3.5" /> GUARDAR NÚMEROS
              </button>

              {/* INFORMAR SERVICIO (hero) */}
              <ServiceSuggestionDialog communityId={communityId} communityName={communityName}>
                <button
                  className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-secondary border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  type="button"
                >
                  <Siren className="w-3.5 h-3.5" /> + INFORMAR SERVICIO
                </button>
              </ServiceSuggestionDialog>
            </div>
          </div>

          {/* Right — Emergency 123 card */}
          <div className="border-[3px] border-black bg-primary text-white overflow-hidden shadow-[12px_12px_0px_black] mt-6 md:mt-0">
            <div className="px-4 py-3 border-b-[3px] border-black bg-black flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-secondary">
                ● LÍNEA ÚNICA NACIONAL
              </span>
              <Siren className="w-4 h-4 text-white" />
            </div>
            <a href="tel:123" className="block px-5 py-5 no-underline text-white">
              <div className="font-mono text-[11px] uppercase tracking-widest opacity-85 mb-1">EMERGENCIAS · 24 HORAS</div>
              <div className="flex items-center gap-3.5">
                <span className="font-heading font-black italic leading-[0.8]" style={{ fontSize: 'clamp(60px, 8vw, 92px)', letterSpacing: '-0.04em' }}>123</span>
                <div className="w-12 h-12 bg-white border-[3px] border-black shadow-[4px_4px_0px_black] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
              </div>
            </a>
            <div className="grid grid-cols-3 border-t-[3px] border-black">
              {[['119', 'BOMBEROS'], ['125', 'AMBULANCIA'], ['132', 'CRUZ ROJA']].map(([n, l], i) => (
                <a key={n} href={`tel:${n}`} className={`py-3 px-2 text-center no-underline text-white bg-black/10 hover:bg-black/20 transition-colors ${i < 2 ? 'border-r-2 border-r-white/30' : ''}`}>
                  <div className="font-heading font-black italic text-2xl leading-tight">{n}</div>
                  <div className="font-mono text-[8.5px] mt-0.5 opacity-85">{l}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <section className="px-4 md:px-8 py-4 bg-[#F5E6CB] border-b-[3px] border-black flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap overflow-x-auto">
          {tabs.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              type="button"
              className="inline-flex items-center px-3.5 py-2.5 border-2 border-black font-heading font-black text-[11px] uppercase tracking-widest transition-all flex-shrink-0"
              style={active === key ? { background: color, color: 'white', boxShadow: '2px 2px 0 black' } : { background: 'white', boxShadow: '2px 2px 0 black' }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest opacity-55 flex-shrink-0">
          {services.length} SERVICIOS
        </span>
      </section>

      {/* ─── SECTIONS ─── */}
      <div className="px-4 md:px-8 pt-9 pb-2 max-w-7xl mx-auto">
        {services.length === 0 ? (
          <div className="py-20 border-4 border-dashed border-black text-center bg-white">
            <p className="font-heading font-black italic uppercase text-3xl text-black/30">No hay servicios registrados</p>
            <p className="font-semibold text-black/50 mt-2">Pronto añadiremos los contactos de emergencia de tu barrio.</p>
          </div>
        ) : (
          visibleGroups.map(gk => {
            const g    = GROUPS[gk]
            const Icon = g.Icon
            const list = services.filter(s => s.category === gk)
            if (list.length === 0) return null

            return (
              <section key={gk} className="mb-11">
                <div className="flex items-center gap-3 md:gap-4 mb-5 flex-wrap">
                  <div className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 border-[3px] border-black shadow-[6px_6px_0px_black] flex items-center justify-center" style={{ background: g.color }}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <h2 className="font-heading font-black italic uppercase leading-[0.9]" style={{ fontSize: 'clamp(2rem, 5vw, 46px)', letterSpacing: '-0.03em' }}>
                    {g.label}
                  </h2>
                  <span className="font-mono text-[11px] font-bold tracking-widest bg-black text-white px-2 py-1 flex-shrink-0">
                    {list.length} LÍNEAS
                  </span>
                  <div className="flex-1 h-[3px] bg-black opacity-85 hidden sm:block" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((s, i) => (
                    <ServiceCard key={s.id} service={s} groupKey={gk} rot={[-0.6, 0, 0.6][i % 3]} communityId={communityId} />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* ─── MARQUEE ─── */}
      <div className="bg-black text-white border-t-4 border-black border-b-4 py-3 overflow-hidden">
        <div className="flex overflow-hidden">
          <div className="br-marquee-track flex">
            {[...Array(2)].flatMap((_, j) =>
              ['POLICÍA 123', 'BOMBEROS 119', 'AMBULANCIA 125', 'CRUZ ROJA 132', 'ENERGÍA 115', 'GAS 164', 'ACUEDUCTO 116', 'SALUD MENTAL 106'].map((text, i) => (
                <span key={`${j}-${i}`} className="flex items-center gap-5 px-6 whitespace-nowrap">
                  <span className="font-heading font-black italic uppercase text-2xl">{text}</span>
                  <span className="text-secondary text-xl">✦</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <section className="px-4 md:px-8 py-11 max-w-7xl mx-auto">
        <div className="border-[3px] border-black grid grid-cols-1 md:grid-cols-[1.2fr_1fr] overflow-hidden">
          {/* Left */}
          <div className="relative p-7 md:p-9">
            <div className="br-pattern-dots absolute inset-0 opacity-[0.14] pointer-events-none" />
            <div className="relative">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest bg-primary text-white px-2 py-0.5 inline-block">
                AYUDA AL BARRIO
              </span>
              <h2 className="font-heading font-black italic uppercase leading-tight mt-3.5" style={{ fontSize: 'clamp(2rem, 5vw, 64px)', letterSpacing: '-0.02em' }}>
                ¿FALTA UNA<br /><span className="text-primary">LÍNEA?</span>
              </h2>
              <p className="mt-3.5 text-sm max-w-md leading-relaxed">
                Si conoces una línea de emergencia, un centro de salud o un servicio público que debería estar aquí,
                avísanos. Lo verificamos y lo agregamos para todos.
              </p>
              <div className="flex gap-2.5 mt-5 flex-wrap">
                {/* INFORMAR SERVICIO (CTA) */}
                <ServiceSuggestionDialog communityId={communityId} communityName={communityName}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] transition-all"
                  >
                    <Siren className="w-3.5 h-3.5" /> INFORMAR SERVICIO
                  </button>
                </ServiceSuggestionDialog>

                {/* REPORTAR DATO ERRADO (CTA, generic) */}
                <ServiceReportDialog communityId={communityId}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 md:px-6 md:py-3.5 bg-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] transition-all"
                  >
                    REPORTAR DATO ERRADO
                  </button>
                </ServiceReportDialog>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="bg-black text-white p-7 md:p-9 flex flex-col gap-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-secondary">EN CASO DE EMERGENCIA</div>
            {[
              ['01', 'MANTÉN LA CALMA',  'Respira y ubica la dirección exacta donde estás.'],
              ['02', 'LLAMA AL 123',      'La línea única conecta con policía, salud y bomberos.'],
              ['03', 'DA TUS DATOS',      'Nombre, qué pasa y cuántas personas necesitan ayuda.'],
            ].map(([n, t, d]) => (
              <div key={n} className="grid gap-3.5 items-center" style={{ gridTemplateColumns: '50px 1fr' }}>
                <span className="font-heading font-black italic text-primary leading-none" style={{ fontSize: '2.6rem' }}>{n}</span>
                <div>
                  <div className="font-heading font-black italic uppercase text-base leading-tight">{t}</div>
                  <div className="text-xs opacity-80 mt-0.5">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 8b.2: Type-check both modified files**

```bash
npx tsc --noEmit
```

Expected: No errors in `services-page-client.tsx` or `services/page.tsx`.

- [ ] **Step 8b.3: Commit**

```bash
git add components/community/services-page-client.tsx app/[community]/services/page.tsx
git commit -m "feat: wire VCF download, suggestion dialog, and report dialog into services page"
```

---

## Task 9: Manual Browser Verification

- [ ] **Step 9.1: Start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/{community}/services` (e.g. `/parqueindustrial/services`).

- [ ] **Step 9.2: Verify "GUARDAR NÚMEROS"**

Click the "GUARDAR NÚMEROS" button.
Expected: Browser downloads `emergencias-{community}.vcf`. Open it — each service with a phone should appear as a contact card.
If no services have phones in DB, button should be visually disabled (reduced opacity, no cursor).

- [ ] **Step 9.3: Verify "INFORMAR SERVICIO" (hero)**

Click the hero "INFORMAR SERVICIO" button.
Expected: Dialog opens with all fields. Fill in name, category, phone. Click "Enviar Sugerencia".
Expected: Toast "¡Gracias! Revisaremos tu sugerencia." and dialog closes.
Verify in Supabase Dashboard → `service_feedback`: a row with `type = 'suggestion'` appears.

- [ ] **Step 9.4: Verify "INFORMAR SERVICIO" (CTA)**

Scroll to the bottom CTA section. Click the red "INFORMAR SERVICIO" button.
Expected: Same dialog opens and submits correctly.

- [ ] **Step 9.5: Verify "REPORTAR DATO ERRADO" (per card)**

Hover a service card. Click the flag (⚑) icon button in the card header.
Expected: Dialog opens titled "Reportar Dato Errado" with the service name shown. Fill in message. Submit.
Expected: Toast "Reporte enviado." and row in `service_feedback` with `type = 'report'` and `service_id` populated.

- [ ] **Step 9.6: Verify "REPORTAR UN DATO ERRADO" (CTA)**

Click the CTA "REPORTAR DATO ERRADO" button.
Expected: Dialog opens without a pre-filled service name, but with the extra "¿Cuál servicio?" text field. Submit.
Expected: Toast success. Row in DB with `type = 'report'` and `service_id = null`.

- [ ] **Step 9.7: Verify offline error handling**

Disable network in browser DevTools. Try submitting a form.
Expected: Toast "Sin conexión. Intenta de nuevo."

- [ ] **Step 9.8: Final commit**

```bash
git add -A
git commit -m "feat: complete services page interactive buttons (VCF, suggest, report)"
```
