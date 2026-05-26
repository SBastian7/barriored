# Event Detail Page Improvements

**Date:** 2026-05-26  
**Status:** Approved

## Scope

Three improvements to the event detail page (`app/[community]/community/events/[id]/page.tsx`):

1. Fix invisible "Reportar" button text
2. Add year to publication and event dates
3. Implement event attendance ("VOY A IR") and calendar export ("AGREGAR A CALENDARIO")

---

## Fix 1 — Reportar Button Visibility

**Problem:** `<ReportButton variant="outline">` is placed on a blue (`bg-accent`) hero panel. The outline variant inherits foreground color which is invisible against the dark background.

**Fix:** Pass explicit styling at the call site in the event detail page — add `className="border-white/50 text-white hover:bg-white/10 hover:text-white"` to the `<ReportButton>` component usage in the hero actions row.

**Files changed:** `app/[community]/community/events/[id]/page.tsx`

---

## Fix 2 — Year in Dates

**Problem:** Meta strip shows "19 DE FEBRERO DE..." (truncated) and "DOMINGO 31 MAY." with no year. The `truncate max-w-35` on the value div cuts long formatted dates.

**Fix:**
- Remove `truncate max-w-35` from meta strip value divs (or increase width).
- Format `publishedDate` as compact `DD MMM YYYY` using `{ day: 'numeric', month: 'short', year: 'numeric' }`.
- Format event date in meta strip as `DD MMM YYYY` (same compact format).

**Files changed:** `app/[community]/community/events/[id]/page.tsx`

---

## Fix 3 — Event Attendance & Calendar Export

### 3a. Database — `event_attendees` table

```sql
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_post_id, user_id)
);
```

**RLS policies:**
- `SELECT`: public (anyone can count attendees)
- `INSERT`: authenticated users, only for their own `user_id`
- `DELETE`: authenticated users, only their own row

### 3b. API Route — Toggle Attendance

`POST /api/community/posts/[id]/attend`

- Requires auth. Returns 401 if not logged in.
- Checks if attendance row exists for `(post_id, user_id)`.
- If exists → DELETE (un-attend). Returns `{ attending: false, count: N }`.
- If not → INSERT. Returns `{ attending: true, count: N }`.
- Count is fetched from `event_attendees` after the toggle.

### 3c. Client Component — `EventAttendanceButtons`

**File:** `components/community/event-attendance-buttons.tsx`

Props:
```ts
{
  postId: string
  initialCount: number      // server-fetched count
  initialAttending: boolean // true if current user is already attending
}
```

State:
- `attending: boolean` — optimistic toggle
- `count: number` — optimistic count update
- `loading: boolean`

Behavior:
- **VOY A IR**: Calls `/api/community/posts/[id]/attend`. Optimistically updates state. Shows filled "✓ YA VOY" when attending. If not authenticated, redirects to `/auth/login`.
- **AGREGAR A CALENDARIO**: Dropdown (Radix `DropdownMenu`) with two items:
  - "Google Calendar" → opens Google Calendar URL in new tab
  - "Descargar .ics" → generates and downloads `.ics` file client-side

**Google Calendar URL format:**
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={title}
  &dates={startISO}/{endISO}
  &details={content}
  &location={location}
```

**.ics file format** (generated in browser, no server needed):
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:{startISO}
DTEND:{endISO}
SUMMARY:{title}
DESCRIPTION:{content}
LOCATION:{location}
END:VEVENT
END:VCALENDAR
```

### 3d. Server-side data fetch

In `EventDetailPage` server component, before rendering:
- Fetch `event_attendees` count for this post.
- If user is logged in, also fetch whether the user has a row (attending = true/false).
- Pass `initialCount` and `initialAttending` to `EventAttendanceButtons`.

### 3e. Attendance count display

Show attendee count in the sidebar "SUMÁTE" card: "N personas van a ir" below the date.

---

## Files Changed

| File | Change |
|------|--------|
| `app/[community]/community/events/[id]/page.tsx` | Fixes 1, 2 + wire up `EventAttendanceButtons` |
| `components/community/event-attendance-buttons.tsx` | New client component |
| `app/api/community/posts/[id]/attend/route.ts` | New API route |
| Supabase migration | `event_attendees` table + RLS |
