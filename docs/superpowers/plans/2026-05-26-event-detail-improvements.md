# Event Detail Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Reportar button visibility, add year to dates, and implement VOY A IR attendance toggle + calendar export on the event detail page.

**Architecture:** The attendance feature uses a new `event_attendees` table in Supabase with a toggle API route following the same pattern as the existing `favorite` route. The calendar export is purely client-side. The page server component fetches attendance state and passes it to a new `EventAttendanceButtons` client component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, Radix UI DropdownMenu, lucide-react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/[community]/community/events/[id]/page.tsx` | Modify | Fix 1 (Reportar), Fix 2 (dates), wire attendance data |
| `components/community/event-attendance-buttons.tsx` | Create | Client component for VOY A IR + calendar dropdown |
| `app/api/community/posts/[id]/attend/route.ts` | Create | Toggle attendance API route |
| Supabase migration | Apply | `event_attendees` table + RLS policies |

---

## Task 1: Create `event_attendees` table with RLS

**Files:**
- Supabase migration (applied via MCP)

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with project `qtridgmtcddlkpandzpf`, name `create_event_attendees`, query:

```sql
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_post_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for public count)
CREATE POLICY "event_attendees_select_public"
  ON event_attendees FOR SELECT
  USING (true);

-- Authenticated users can insert their own row
CREATE POLICY "event_attendees_insert_own"
  ON event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own row
CREATE POLICY "event_attendees_delete_own"
  ON event_attendees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Verify table exists**

Run via Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'event_attendees' ORDER BY ordinal_position;
```
Expected: 4 rows — `id` (uuid), `event_post_id` (uuid), `user_id` (uuid), `created_at` (timestamptz)

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add event_attendees table with RLS policies"
```

---

## Task 2: Create the attendance toggle API route

**Files:**
- Create: `app/api/community/posts/[id]/attend/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: existing } = await (supabase as any)
    .from('event_attendees')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_post_id', id)
    .single()

  if (existing) {
    await (supabase as any)
      .from('event_attendees')
      .delete()
      .eq('user_id', user.id)
      .eq('event_post_id', id)
  } else {
    await (supabase as any)
      .from('event_attendees')
      .insert({ user_id: user.id, event_post_id: id })
  }

  const { count } = await (supabase as any)
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_post_id', id)

  return NextResponse.json({
    attending: !existing,
    count: count ?? 0,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add app/api/community/posts/[id]/attend/route.ts
git commit -m "feat: add event attendance toggle API route"
```

---

## Task 3: Create `EventAttendanceButtons` client component

**Files:**
- Create: `components/community/event-attendance-buttons.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface Props {
  postId: string
  initialCount: number
  initialAttending: boolean
  eventTitle: string
  eventContent: string
  eventDate: string | null       // ISO string from metadata.date
  eventLocation: string | null   // from metadata.location
}

export function EventAttendanceButtons({
  postId,
  initialCount,
  initialAttending,
  eventTitle,
  eventContent,
  eventDate,
  eventLocation,
}: Props) {
  const router = useRouter()
  const [attending, setAttending] = useState(initialAttending)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleAttend() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    // Optimistic update
    setAttending(!attending)
    setCount(attending ? count - 1 : count + 1)

    try {
      const res = await fetch(`/api/community/posts/${postId}/attend`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setAttending(data.attending)
        setCount(data.count)
      } else {
        // Revert optimistic update
        setAttending(attending)
        setCount(count)
      }
    } catch {
      // Revert optimistic update
      setAttending(attending)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  function buildGoogleCalendarUrl() {
    if (!eventDate) return null
    const start = new Date(eventDate)
    // Default 2-hour event if no end time
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: eventContent,
      location: eventLocation ?? '',
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  function handleDownloadIcs() {
    if (!eventDate) return
    const start = new Date(eventDate)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BarrioRed//Event//ES',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventContent.replace(/\n/g, '\\n')}`,
      `LOCATION:${eventLocation ?? ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventTitle.replace(/\s+/g, '-').toLowerCase()}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const googleUrl = buildGoogleCalendarUrl()

  return (
    <div className="flex flex-col gap-2">
      {/* Attendance count */}
      {count > 0 && (
        <p className="font-mono text-[10px] tracking-widest uppercase font-bold opacity-70">
          {count} {count === 1 ? 'persona va' : 'personas van'} a ir
        </p>
      )}

      {/* VOY A IR */}
      <button
        onClick={handleAttend}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          attending
            ? 'bg-white text-black'
            : 'bg-primary text-white'
        }`}
      >
        {attending ? (
          <><Check className="w-3 h-3" /> YA VOY</>
        ) : (
          '✓ VOY A IR'
        )}
      </button>

      {/* AGREGAR A CALENDARIO */}
      {eventDate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full inline-flex items-center justify-center gap-2 bg-black text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
              <CalendarDays className="w-3 h-3" />
              AGREGAR A CALENDARIO
              <ChevronDown className="w-3 h-3 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-2 border-black rounded-none shadow-[4px_4px_0_black] bg-white min-w-48"
          >
            {googleUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-heading font-black uppercase tracking-widest text-xs cursor-pointer px-4 py-2.5"
                >
                  Google Calendar
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDownloadIcs}
              className="font-heading font-black uppercase tracking-widest text-xs cursor-pointer px-4 py-2.5"
            >
              Descargar .ics (Apple / Outlook)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors in the new component.

- [ ] **Step 3: Commit**

```bash
git add components/community/event-attendance-buttons.tsx
git commit -m "feat: add EventAttendanceButtons component with attendance toggle and calendar export"
```

---

## Task 4: Fix event detail page — Reportar button + dates + wire attendance

**Files:**
- Modify: `app/[community]/community/events/[id]/page.tsx`

This task applies all three changes to the page in one go.

- [ ] **Step 1: Add `EventAttendanceButtons` import at top of page**

After the existing imports, add:
```typescript
import { EventAttendanceButtons } from '@/components/community/event-attendance-buttons'
```

- [ ] **Step 2: Fetch attendance data in the server component**

After the `isAdmin` block (around line 57), add:

```typescript
// Fetch attendance count and current user's status
const { count: attendeeCount } = await (supabase as any)
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_post_id', id)

let isAttending = false
if (user) {
    const { data: attendeeRow } = await (supabase as any)
        .from('event_attendees')
        .select('id')
        .eq('event_post_id', id)
        .eq('user_id', user.id)
        .single()
    isAttending = !!attendeeRow
}
```

- [ ] **Step 3: Fix `publishedDate` format to include year without truncation**

Find this line:
```typescript
const publishedDate = new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
```

Replace with:
```typescript
const publishedDate = new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
```

- [ ] **Step 4: Fix meta strip — remove truncation, fix event date format to include year**

Find the meta strip array (around line 166):
```typescript
['FECHA DEL EVENTO', eventDate ? `${eventDayShort} ${eventDay} ${eventMonth}` : 'POR CONFIRMAR', CalendarDays],
```
Replace with:
```typescript
['FECHA DEL EVENTO', eventDate ? `${eventDay} ${eventMonth} ${eventDate.getFullYear()}` : 'POR CONFIRMAR', CalendarDays],
```

Then find the value div in the meta strip map:
```typescript
<div className="font-heading font-black italic uppercase text-sm leading-tight truncate max-w-35">{value}</div>
```
Replace with:
```typescript
<div className="font-heading font-black italic uppercase text-sm leading-tight">{value}</div>
```

- [ ] **Step 5: Fix Reportar button visibility on blue background**

Find the `<ReportButton>` usage in the hero actions row:
```typescript
<ReportButton entityType="post" entityId={post.id} variant="outline" />
```
Replace with:
```typescript
<ReportButton entityType="post" entityId={post.id} variant="outline" className="border-white/50 text-white hover:bg-white/10 hover:text-white" />
```

- [ ] **Step 6: Replace static buttons with `EventAttendanceButtons` in the sidebar**

Find the static buttons block inside the "SUMÁTE" card (the `<div className="flex flex-col gap-2 mt-4">` block):
```typescript
        <div className="flex flex-col gap-2 mt-4">
            <button className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                ✓ VOY A IR
            </button>
            <button className="w-full inline-flex items-center justify-center gap-2 bg-black text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                <CalendarDays className="w-3 h-3" /> AGREGAR A CALENDARIO
            </button>
        </div>
```
Replace with:
```typescript
        <div className="mt-4">
            <EventAttendanceButtons
                postId={post.id}
                initialCount={attendeeCount ?? 0}
                initialAttending={isAttending}
                eventTitle={post.title}
                eventContent={post.content}
                eventDate={metadata.date ?? null}
                eventLocation={metadata.location ?? null}
            />
        </div>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/[community]/community/events/[id]/page.tsx
git commit -m "feat: fix event detail page - Reportar visibility, year in dates, wire attendance buttons"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open an approved event in browser**

Navigate to `http://localhost:3000/{community}/community/events/{id}` for an existing approved event.

- [ ] **Step 3: Verify Reportar button**

The "Reportar" button in the blue hero panel should now show white text and border clearly visible. Clicking it should open the dropdown.

- [ ] **Step 4: Verify dates show year**

In the meta strip:
- "PUBLICADO EL" should show e.g. `19 FEB. 2026` (not truncated)
- "FECHA DEL EVENTO" should show e.g. `31 MAY. 2026`

- [ ] **Step 5: Verify VOY A IR (logged out)**

While logged out, click "VOY A IR" — should redirect to `/auth/login`.

- [ ] **Step 6: Verify VOY A IR (logged in)**

Log in, click "VOY A IR" — button should flip to "✓ YA VOY" (white background) and the count should appear above. Click again — should revert.

- [ ] **Step 7: Verify AGREGAR A CALENDARIO dropdown**

Click "AGREGAR A CALENDARIO" — dropdown shows "Google Calendar" and "Descargar .ics". Clicking Google Calendar opens correct URL in new tab. Clicking .ics downloads a valid calendar file.

- [ ] **Step 8: Final commit if all verifications pass**

```bash
git add .
git commit -m "chore: verify event detail improvements complete"
```
