# Platform Completion — Bug Fixes & Missing Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 bugs/missing features: business & post favorites, rejection visibility + resubmit, review notifications, moderator access, revoke premium, banner scheduling, and admin reviews dashboard.

**Architecture:** Each fix is isolated — DB migrations first, then API routes, then UI components. No shared state between tasks. Follow existing patterns: server components for data fetching, `'use client'` only for interactivity, Supabase server client in API routes, brutalist design system throughout.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (PostgreSQL + RLS), Tailwind CSS, Resend (email), lucide-react icons, Radix UI primitives.

---

## File Map

**New files:**
- `app/api/businesses/[id]/favorite/route.ts` — toggle business favorite
- `app/api/community/posts/[id]/favorite/route.ts` — toggle post favorite
- `app/api/businesses/[id]/resubmit/route.ts` — resubmit rejected business
- `app/api/admin/subscriptions/[id]/revoke/route.ts` — admin revoke premium
- `app/admin/reviews/page.tsx` — platform-wide reviews dashboard
- `components/business/business-favorite-button.tsx` — heart button for business profiles
- `components/community/post-favorite-button.tsx` — heart button for post cards

**Modified files:**
- `app/admin/page.tsx:51` — fix moderator redirect (role check)
- `app/dashboard/page.tsx` — show rejection reason + resubmit button; add business & post favorites to Favorites tab
- `lib/email/resend.ts` — add `sendNewReviewEmail`
- `app/api/reviews/route.ts` — fire notification after review insert
- `app/admin/subscriptions/[id]/page.tsx` — add Revoke Premium button + handler
- `app/admin/banners/[id]/page.tsx` — replace duration dropdown with start/end date pickers
- `app/[community]/business/[slug]/page.tsx` — render `BusinessFavoriteButton`
- `components/business/business-hero.tsx` — accept + render favorite button slot
- `components/community/post-card.tsx` — render `PostFavoriteButton`
- `components/admin/collapsible-sidebar.tsx` — add Reviews nav link
- `components/admin/mobile-nav.tsx` — add Reviews nav link

---

## Task 1: DB Migration — business_favorites + community_post_favorites

**Files:**
- Apply migration via Supabase MCP (no SQL file needed)

- [ ] **Step 1: Apply migration for business_favorites table**

Use the Supabase MCP `apply_migration` tool with project_id `qtridgmtcddlkpandzpf`:

```sql
CREATE TABLE IF NOT EXISTS public.business_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, business_id)
);

ALTER TABLE public.business_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business favorites"
  ON public.business_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business favorites"
  ON public.business_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own business favorites"
  ON public.business_favorites FOR DELETE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration for community_post_favorites table**

```sql
CREATE TABLE IF NOT EXISTS public.community_post_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.community_post_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post favorites"
  ON public.community_post_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post favorites"
  ON public.community_post_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post favorites"
  ON public.community_post_favorites FOR DELETE
  USING (auth.uid() = user_id);
```

- [ ] **Step 3: Verify both tables exist**

Run this SQL via Supabase MCP execute_sql:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('business_favorites', 'community_post_favorites') 
AND table_schema = 'public';
```
Expected: 2 rows returned.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add business_favorites and community_post_favorites tables with RLS"
```

---

## Task 2: Fix Moderator Admin Redirect

**Files:**
- Modify: `app/admin/page.tsx:51`

- [ ] **Step 1: Fix the role check**

Open `app/admin/page.tsx`. At line 51, the check currently rejects moderators:
```typescript
// BEFORE (line 51):
if (!profile || profile.role !== 'admin') {
    redirect('/')
}
```

Replace with:
```typescript
// AFTER:
if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
    redirect('/')
}
```

The `getPermissions()` in `lib/auth/permissions.ts` already grants moderators `canViewAdminPanel: true` — this was just the page guard being inconsistent.

- [ ] **Step 2: Verify the page still loads for admins**

Manually confirm admin login still reaches `/admin` without redirect. Then confirm a moderator account also reaches `/admin`.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "fix: allow moderators to access admin panel (was checking admin-only)"
```

---

## Task 3: Business Rejection Reason Visibility + Resubmit

**Files:**
- Create: `app/api/businesses/[id]/resubmit/route.ts`
- Modify: `app/dashboard/page.tsx` (BusinessTabContent function, lines 162–188)

- [ ] **Step 1: Create the resubmit API route**

Create `app/api/businesses/[id]/resubmit/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Verify this business belongs to the requester and is rejected
  const { data: business } = await (supabase as any)
    .from('businesses')
    .select('id, owner_id, status')
    .eq('id', id)
    .single()

  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  if (business.owner_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (business.status !== 'rejected') return NextResponse.json({ error: 'El negocio no está rechazado' }, { status: 400 })

  const { error } = await (supabase as any)
    .from('businesses')
    .update({
      status: 'pending',
      rejection_reason: null,
      rejection_details: null,
      rejected_by: null,
      rejected_at: null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Show rejection reason and resubmit button in dashboard**

In `app/dashboard/page.tsx`, update the businesses map block inside `BusinessTabContent`. Find this section (around line 162):

```typescript
{businesses.map((biz: any) => {
  const s = STATUS_LABELS[biz.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.pending
  return (
    <Card key={biz.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ...">
      <CardHeader className="flex flex-row items-center justify-between p-6">
```

Replace the full `businesses.map(...)` block with:

```typescript
{businesses.map((biz: any) => {
  const s = STATUS_LABELS[biz.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.pending
  return (
    <Card key={biz.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-white overflow-hidden group rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="bg-muted border-2 border-black p-3 group-hover:bg-primary transition-colors text-black group-hover:text-white">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div>
            <CardTitle className="text-3xl font-heading font-black uppercase italic tracking-tighter leading-none mb-1 group-hover:text-primary transition-colors">{biz.name}</CardTitle>
            <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">{(biz.categories as any)?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={s.variant as any} className="text-[10px] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{s.label}</Badge>
          {biz.status === 'approved' && (
            <Link href={`/dashboard/business/${biz.id}/edit`}>
              <Button variant="outline" size="icon" className="h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-secondary transition-all rounded-none">
                <Edit className="h-6 w-6" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      {biz.status === 'rejected' && (
        <CardContent className="px-6 pb-6">
          <div className="border-2 border-red-600 bg-red-50 p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-1">Motivo de Rechazo</p>
            <p className="text-sm text-red-800">{biz.rejection_reason || 'Sin motivo especificado'}</p>
            {biz.rejection_details && (
              <p className="text-xs text-red-700 mt-2">{biz.rejection_details}</p>
            )}
          </div>
          <ResubmitButton businessId={biz.id} />
        </CardContent>
      )}
    </Card>
  )
})}
```

- [ ] **Step 3: Add the ResubmitButton client component inline in dashboard/page.tsx**

At the top of `app/dashboard/page.tsx`, this is a server component so add `ResubmitButton` as a small inline client component in the same file. Add this after all imports:

```typescript
'use client'
function ResubmitButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = React.useState(false)

  async function handleResubmit() {
    setLoading(true)
    const res = await fetch(`/api/businesses/${businessId}/resubmit`, { method: 'POST' })
    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json()
      alert(data.error || 'Error al reenviar')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResubmit}
      disabled={loading}
      className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full"
    >
      {loading ? 'Reenviando...' : 'Reenviar Solicitud'}
    </Button>
  )
}
```

Wait — `dashboard/page.tsx` is a server component. You cannot mix `'use client'` at file level. Instead, create a separate file `components/business/resubmit-button.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function ResubmitButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleResubmit() {
    setLoading(true)
    const res = await fetch(`/api/businesses/${businessId}/resubmit`, { method: 'POST' })
    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json()
      alert(data.error || 'Error al reenviar')
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResubmit}
      disabled={loading}
      className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      {loading ? 'Reenviando...' : 'Reenviar Solicitud'}
    </Button>
  )
}
```

Then update the import in `app/dashboard/page.tsx`:
```typescript
import { ResubmitButton } from '@/components/business/resubmit-button'
```

Also update the fetch in the `BusinessTabContent` to include `rejection_reason` and `rejection_details`:
```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select('id, name, status, created_at, deletion_requested, deletion_reason, rejection_reason, rejection_details, categories(name)')
  .eq('owner_id', userId)
  .order('created_at', { ascending: false }) as { data: any }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/businesses/[id]/resubmit/route.ts components/business/resubmit-button.tsx app/dashboard/page.tsx
git commit -m "feat: show rejection reason in dashboard and allow business resubmission"
```

---

## Task 4: Business Favorites — API + Button + Dashboard

**Files:**
- Create: `app/api/businesses/[id]/favorite/route.ts`
- Create: `components/business/business-favorite-button.tsx`
- Modify: `app/[community]/business/[slug]/page.tsx`
- Modify: `components/business/business-hero.tsx`
- Modify: `app/dashboard/page.tsx` (FavoritesTabContent)

- [ ] **Step 1: Create the favorite toggle API route**

Create `app/api/businesses/[id]/favorite/route.ts`:

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

  // Check if already favorited
  const { data: existing } = await (supabase as any)
    .from('business_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', id)
    .single()

  if (existing) {
    // Unfavorite
    await (supabase as any)
      .from('business_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', id)
    return NextResponse.json({ favorited: false })
  } else {
    // Favorite
    await (supabase as any)
      .from('business_favorites')
      .insert({ user_id: user.id, business_id: id })
    return NextResponse.json({ favorited: true })
  }
}
```

- [ ] **Step 2: Create the BusinessFavoriteButton client component**

Create `components/business/business-favorite-button.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  businessId: string
  initialFavorited: boolean
  isLoggedIn: boolean
}

export function BusinessFavoriteButton({ businessId, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)
    const res = await fetch(`/api/businesses/${businessId}/favorite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
    }
    setLoading(false)
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant="outline"
      size="icon"
      className={cn(
        'h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none',
        favorited && 'bg-primary border-primary'
      )}
      title={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      <Heart className={cn('h-5 w-5', favorited ? 'fill-white text-white' : 'text-black')} />
    </Button>
  )
}
```

- [ ] **Step 3: Wire button into the business profile page**

In `app/[community]/business/[slug]/page.tsx`, after the existing user fetch (around line 54), add favorite state fetch:

```typescript
// After: const { data: { user } } = await supabase.auth.getUser()

let isFavorited = false
if (user) {
  const { data: fav } = await (supabase as any)
    .from('business_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', business.id)
    .single()
  isFavorited = !!fav
}
```

Then find where `BusinessHero` is rendered and add the button nearby. Add imports at the top of the file:
```typescript
import { BusinessFavoriteButton } from '@/components/business/business-favorite-button'
```

In the JSX after `<BusinessHero .../>`, add the button in the action strip alongside `ShareButton` and `ReportButton`. Find the section that renders `<ShareButton />` and `<ReportButton />` and add:
```typescript
<BusinessFavoriteButton
  businessId={business.id}
  initialFavorited={isFavorited}
  isLoggedIn={!!user}
/>
```

- [ ] **Step 4: Add business favorites to dashboard Favorites tab**

In `app/dashboard/page.tsx`, update `FavoritesTabContent` to also fetch business favorites. Add after the existing classified_favorites fetch:

```typescript
// Add to FavoritesTabContent function body, after the existing classifieds fetch:
const { data: businessFavs } = await supabase
  .from('business_favorites')
  .select(`
    id,
    created_at,
    businesses (
      id, name, slug, photos, status,
      categories(name),
      communities(slug)
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false }) as { data: any }

const favoritedBusinesses = businessFavs?.map((f: any) => f.businesses).filter(Boolean) || []
```

Then in the JSX, add a businesses favorites section before the existing classifieds grid:

```typescript
{/* Business Favorites */}
{favoritedBusinesses.length > 0 && (
  <div className="space-y-4">
    <h3 className="font-black uppercase tracking-widest text-lg">Negocios Guardados</h3>
    <div className="grid gap-4">
      {favoritedBusinesses.map((biz: any) => (
        <Link
          key={biz.id}
          href={`/${(biz.communities as any)?.slug}/${communitySlug}/business/${biz.slug}`}
          className="brutalist-card p-4 flex items-center gap-4 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-white"
        >
          {biz.photos?.[0] && (
            <div className="w-16 h-16 border-2 border-black overflow-hidden flex-shrink-0">
              <img src={biz.photos[0]} alt={biz.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="font-black uppercase tracking-tight">{biz.name}</p>
            <p className="text-xs text-black/50 uppercase tracking-widest">{(biz.categories as any)?.name}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
```

Fix the Link href — it should be:
```typescript
href={`/${(biz.communities as any)?.slug}/business/${biz.slug}`}
```

Also update the `favoritesCount` query in `DashboardPage` to count business + classified favorites:
```typescript
// Replace existing favoritesCount query:
const [{ count: classifiedFavCount }, { count: bizFavCount }] = await Promise.all([
  supabase.from('classified_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  (supabase as any).from('business_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
])
const favoritesCount = (classifiedFavCount || 0) + (bizFavCount || 0)
```

- [ ] **Step 5: Commit**

```bash
git add app/api/businesses/[id]/favorite/route.ts components/business/business-favorite-button.tsx app/[community]/business/[slug]/page.tsx app/dashboard/page.tsx
git commit -m "feat: business favorites — toggle API, heart button on profile, dashboard tab"
```

---

## Task 5: Community Post Favorites — API + Button

**Files:**
- Create: `app/api/community/posts/[id]/favorite/route.ts`
- Create: `components/community/post-favorite-button.tsx`
- Modify: `components/community/post-card.tsx`
- Modify: `app/dashboard/page.tsx` (FavoritesTabContent)

- [ ] **Step 1: Create the post favorite toggle API route**

Create `app/api/community/posts/[id]/favorite/route.ts`:

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
    .from('community_post_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', id)
    .single()

  if (existing) {
    await (supabase as any)
      .from('community_post_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', id)
    return NextResponse.json({ favorited: false })
  } else {
    await (supabase as any)
      .from('community_post_favorites')
      .insert({ user_id: user.id, post_id: id })
    return NextResponse.json({ favorited: true })
  }
}
```

- [ ] **Step 2: Create the PostFavoriteButton client component**

Create `components/community/post-favorite-button.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  postId: string
  initialFavorited: boolean
  isLoggedIn: boolean
}

export function PostFavoriteButton({ postId, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)
    const res = await fetch(`/api/community/posts/${postId}/favorite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
        favorited ? 'bg-primary' : 'bg-white hover:bg-primary/10'
      )}
      title={favorited ? 'Quitar de favoritos' : 'Guardar'}
    >
      <Heart className={cn('h-4 w-4', favorited ? 'fill-white text-white' : 'text-black')} />
    </button>
  )
}
```

- [ ] **Step 3: Integrate PostFavoriteButton into PostCard**

`PostCard` is a server component at `components/community/post-card.tsx`. It cannot fetch the current user. The parent pages that render PostCard (announcements section, events section) are where user context lives.

The simplest approach: make PostCard accept optional `isFavorited` and `isLoggedIn` props, and render the button if provided. Open `components/community/post-card.tsx`:

At the top, add the import:
```typescript
import { PostFavoriteButton } from '@/components/community/post-favorite-button'
```

Update the function signature from:
```typescript
export function PostCard({ post, communitySlug }: { post: CommunityPost; communitySlug: string })
```
to:
```typescript
export function PostCard({
  post,
  communitySlug,
  isFavorited = false,
  isLoggedIn = false,
}: {
  post: CommunityPost
  communitySlug: string
  isFavorited?: boolean
  isLoggedIn?: boolean
})
```

Inside `CardContent`, find the author/date line near the bottom of the card and add the favorite button alongside it. Find the section that renders author info and add:
```typescript
<div className="mt-auto pt-3 flex items-center justify-between">
  {/* existing author info JSX stays here */}
  <PostFavoriteButton
    postId={post.id}
    initialFavorited={isFavorited}
    isLoggedIn={isLoggedIn}
  />
</div>
```

Check the bottom of `post-card.tsx` to see the existing author/date JSX and wrap it with this flex container instead of replacing it.

- [ ] **Step 4: Pass favorite state from parent pages**

The announcements and events sections render PostCard. Find the files that render `<PostCard>` — search in `components/community/announcements-section.tsx` and `components/community/events-section.tsx`.

In these server components, you need to fetch the current user's favorites. Example pattern for `announcements-section.tsx`:

```typescript
// At top of the async server component function, after fetching posts:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

let favoritedPostIds = new Set<string>()
if (user && posts?.length) {
  const { data: favs } = await (supabase as any)
    .from('community_post_favorites')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', posts.map((p: any) => p.id))
  favoritedPostIds = new Set((favs || []).map((f: any) => f.post_id))
}

// Then in the PostCard render:
<PostCard
  key={post.id}
  post={post}
  communitySlug={communitySlug}
  isFavorited={favoritedPostIds.has(post.id)}
  isLoggedIn={!!user}
/>
```

Apply the same pattern to `events-section.tsx`.

- [ ] **Step 5: Add post favorites to dashboard Favorites tab**

In `app/dashboard/page.tsx`, inside `FavoritesTabContent`, add:

```typescript
const { data: postFavs } = await (supabase as any)
  .from('community_post_favorites')
  .select(`
    id,
    created_at,
    community_posts (
      id, title, type, status,
      communities(slug, name)
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

const favoritedPosts = postFavs?.map((f: any) => f.community_posts).filter(Boolean) || []
```

Add to JSX in the Favorites tab (after the businesses section, before classifieds):
```typescript
{favoritedPosts.length > 0 && (
  <div className="space-y-4">
    <h3 className="font-black uppercase tracking-widest text-lg">Publicaciones Guardadas</h3>
    <div className="grid gap-4">
      {favoritedPosts.map((post: any) => {
        const commSlug = (post.communities as any)?.slug
        const pathSegment = post.type === 'event' ? 'events' : 'announcements'
        return (
          <Link
            key={post.id}
            href={commSlug ? `/${commSlug}/community/${pathSegment}/${post.id}` : '#'}
            className="brutalist-card p-4 flex items-center gap-4 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-white"
          >
            <div>
              <p className="font-black uppercase tracking-tight">{post.title}</p>
              <p className="text-xs text-black/50 uppercase tracking-widest">
                {post.type === 'event' ? 'Evento' : 'Anuncio'} · {(post.communities as any)?.name}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  </div>
)}
```

Also update `favoritesCount` calculation to include post favorites:
```typescript
const [{ count: classifiedFavCount }, { count: bizFavCount }, { count: postFavCount }] = await Promise.all([
  supabase.from('classified_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  (supabase as any).from('business_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  (supabase as any).from('community_post_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
])
const favoritesCount = (classifiedFavCount || 0) + (bizFavCount || 0) + (postFavCount || 0)
```

- [ ] **Step 6: Commit**

```bash
git add app/api/community/posts/[id]/favorite/route.ts components/community/post-favorite-button.tsx components/community/post-card.tsx components/community/announcements-section.tsx components/community/events-section.tsx app/dashboard/page.tsx
git commit -m "feat: community post favorites — toggle API, heart button on cards, dashboard tab"
```

---

## Task 6: Review Notification Email

**Files:**
- Modify: `lib/email/resend.ts` (add new function)
- Modify: `app/api/reviews/route.ts` (fire notification in POST)

- [ ] **Step 1: Add sendNewReviewEmail to resend.ts**

In `lib/email/resend.ts`, add this function after `sendBusinessRejectedEmail`:

```typescript
export async function sendNewReviewEmail(
  ownerEmail: string,
  businessName: string,
  rating: number,
  reviewText: string | null,
  communitySlug: string
) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Nueva reseña en "${businessName}" — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Tu negocio <strong>${escapeHtml(businessName)}</strong> recibió una nueva reseña.</p>
        <div style="background: #f5f5f5; border-left: 4px solid #c0392b; padding: 12px 16px; margin: 16px 0;">
          <p style="font-size: 20px; margin: 0 0 8px;">${stars}</p>
          ${reviewText ? `<p style="margin: 0; color: #333;">"${escapeHtml(reviewText)}"</p>` : ''}
        </div>
        <p>
          <a href="https://barriored.co/${communitySlug}/business"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver mi negocio
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}
```

- [ ] **Step 2: Wire notification into review POST route**

In `app/api/reviews/route.ts`, add the import at the top:

```typescript
import { sendNewReviewEmail } from '@/lib/email/resend'
import { createAdminClient } from '@/lib/supabase/admin'
```

After the successful review insert (after line 96, where `review` is returned), add fire-and-forget notification before the `return` statement:

```typescript
// Fire-and-forget review notification
try {
  const adminClient = createAdminClient()
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('name, owner_id, community_id')
    .eq('id', business_id)
    .single()

  if (biz?.owner_id) {
    const [ownerResult, commResult] = await Promise.all([
      adminClient.auth.admin.getUserById(biz.owner_id),
      (adminClient as any).from('communities').select('slug').eq('id', biz.community_id).single(),
    ])
    const ownerEmail = (ownerResult as any).data?.user?.email
    const communitySlug = (commResult.data as any)?.slug || ''
    if (ownerEmail) {
      sendNewReviewEmail(ownerEmail, biz.name, rating, review_text || null, communitySlug).catch(console.error)
    }
  }
} catch (e) {
  console.error('Failed to send review notification:', e)
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts app/api/reviews/route.ts
git commit -m "feat: send email notification to business owner when new review is posted"
```

---

## Task 7: Revoke Premium — API + Admin UI

**Files:**
- Create: `app/api/admin/subscriptions/[id]/revoke/route.ts`
- Modify: `app/admin/subscriptions/[id]/page.tsx`

- [ ] **Step 1: Create the revoke subscription API route**

Create `app/api/admin/subscriptions/[id]/revoke/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requirePermission('canManageRoles', supabase)
  if (!auth.authorized) return auth.error

  const body = await request.json()
  const { cancellation_reason } = body

  const { data: sub, error: fetchError } = await (supabase as any)
    .from('business_subscriptions')
    .select('id, business_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  if (sub.status !== 'active') {
    return NextResponse.json({ error: 'Solo se pueden revocar suscripciones activas' }, { status: 400 })
  }

  const { error } = await (supabase as any)
    .from('business_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellation_reason || 'Revocado por administrador',
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also clear is_featured on the business
  await (supabase as any)
    .from('businesses')
    .update({ is_featured: false })
    .eq('id', sub.business_id)

  await logAuditAction({
    action: 'revoke_subscription',
    entityType: 'business_subscription',
    entityId: id,
    oldData: { status: 'active' },
    newData: { status: 'cancelled', cancellation_reason },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Add Revoke button to admin subscription detail page**

In `app/admin/subscriptions/[id]/page.tsx`, find the block that renders for `subscription.status === 'active'` (around line 421). It currently only shows "Registrar Pago". Add a revoke section after the existing active card:

Add state at the top of the component:
```typescript
const [showRevokeForm, setShowRevokeForm] = useState(false)
const [revokeReason, setRevokeReason] = useState('')
```

Add the handler function inside the component:
```typescript
async function handleRevokeSubscription() {
  if (!revokeReason.trim()) {
    toast.error('Ingresa el motivo de la revocación')
    return
  }
  try {
    const res = await fetch(`/api/admin/subscriptions/${id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellation_reason: revokeReason.trim() })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Error al revocar')
    }
    toast.success('Suscripción revocada')
    setShowRevokeForm(false)
    fetchSubscriptionData()
  } catch (err: any) {
    toast.error(err.message || 'Error al revocar suscripción')
  }
}
```

After the existing `subscription.status === 'active'` card (after line ~499), add:

```typescript
{subscription.status === 'active' && (
  <Card className="brutalist-card border-red-600">
    <CardHeader>
      <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2 text-red-600">
        <XCircle className="w-4 h-4" />
        Revocar Acceso Premium
      </CardTitle>
    </CardHeader>
    <CardContent>
      {!showRevokeForm ? (
        <Button
          onClick={() => setShowRevokeForm(true)}
          variant="outline"
          className="brutalist-button border-red-600 text-red-600 hover:bg-red-50 w-full"
        >
          Revocar Premium
        </Button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
              Motivo de Revocación
            </label>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Ej: Incumplimiento de términos, solicitud del negocio..."
              className="brutalist-input w-full min-h-[80px]"
              maxLength={300}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRevokeSubscription}
              className="brutalist-button bg-red-600 text-white hover:bg-red-700 flex-1"
            >
              Confirmar Revocación
            </Button>
            <Button
              onClick={() => setShowRevokeForm(false)}
              variant="outline"
              className="brutalist-button"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

Make sure `XCircle` is imported — it's already in the import at line 9 of that file.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/subscriptions/[id]/revoke/route.ts app/admin/subscriptions/[id]/page.tsx
git commit -m "feat: admin can revoke active premium subscriptions"
```

---

## Task 8: Banner Rotation Schedule — Custom Date Pickers

**Files:**
- Modify: `app/admin/banners/[id]/page.tsx`

The approve form currently auto-computes `starts_at = now()` and `ends_at = now() + duration_days`. Admin needs to set specific dates instead.

- [ ] **Step 1: Replace duration dropdown with date pickers in the approve form**

In `app/admin/banners/[id]/page.tsx`, update the `approveData` state from:
```typescript
const [approveData, setApproveData] = useState({
  duration_days: '30',
  amount: '',
  payment_method: 'manual_transfer'
})
```
to:
```typescript
const [approveData, setApproveData] = useState({
  starts_at: new Date().toISOString().split('T')[0], // today
  ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
  amount: '',
  payment_method: 'manual_transfer'
})
```

Update `handleApproveBanner` to use the date inputs directly:
```typescript
async function handleApproveBanner() {
  if (!approveData.amount) {
    toast.error('Ingresa el monto del pago')
    return
  }
  if (!approveData.starts_at || !approveData.ends_at) {
    toast.error('Ingresa las fechas de inicio y fin')
    return
  }
  if (new Date(approveData.ends_at) <= new Date(approveData.starts_at)) {
    toast.error('La fecha de fin debe ser posterior a la fecha de inicio')
    return
  }

  try {
    const res = await fetch(`/api/admin/banners/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startsAt: new Date(approveData.starts_at).toISOString(),
        endsAt: new Date(approveData.ends_at).toISOString(),
        paymentAmount: parseFloat(approveData.amount),
        paymentMethod: approveData.payment_method
      })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Error al aprobar banner')
    }
    toast.success('Banner aprobado exitosamente')
    setShowApproveForm(false)
    fetchBanner()
  } catch (err: any) {
    toast.error(err.message || 'Error al aprobar banner')
  }
}
```

In the JSX form, replace the duration `<select>` block with two date inputs:
```typescript
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
      Fecha Inicio
    </label>
    <input
      type="date"
      value={approveData.starts_at}
      onChange={(e) => setApproveData({ ...approveData, starts_at: e.target.value })}
      className="brutalist-input w-full"
    />
  </div>
  <div>
    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
      Fecha Fin
    </label>
    <input
      type="date"
      value={approveData.ends_at}
      onChange={(e) => setApproveData({ ...approveData, ends_at: e.target.value })}
      className="brutalist-input w-full"
    />
  </div>
</div>
```

- [ ] **Step 2: Add Edit Schedule button for active banners**

Add state for the schedule edit form:
```typescript
const [showScheduleForm, setShowScheduleForm] = useState(false)
const [scheduleData, setScheduleData] = useState({ starts_at: '', ends_at: '' })
```

Add handler:
```typescript
async function handleUpdateSchedule() {
  if (!scheduleData.starts_at || !scheduleData.ends_at) {
    toast.error('Ingresa ambas fechas')
    return
  }
  if (new Date(scheduleData.ends_at) <= new Date(scheduleData.starts_at)) {
    toast.error('La fecha de fin debe ser posterior')
    return
  }
  try {
    const res = await fetch(`/api/admin/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starts_at: new Date(scheduleData.starts_at).toISOString(),
        ends_at: new Date(scheduleData.ends_at).toISOString(),
      })
    })
    if (!res.ok) throw new Error('Error al actualizar fechas')
    toast.success('Fechas actualizadas')
    setShowScheduleForm(false)
    fetchBanner()
  } catch (err) {
    toast.error('Error al actualizar fechas')
  }
}
```

In the actions section for `(banner.status === 'active' || banner.status === 'paused')`, add the schedule edit UI after the existing pause/resume buttons:

```typescript
{/* Edit Schedule */}
<div className="mt-4 border-t-2 border-black pt-4">
  {!showScheduleForm ? (
    <Button
      onClick={() => {
        setScheduleData({
          starts_at: banner.starts_at ? banner.starts_at.split('T')[0] : '',
          ends_at: banner.ends_at ? banner.ends_at.split('T')[0] : '',
        })
        setShowScheduleForm(true)
      }}
      variant="outline"
      className="brutalist-button gap-2"
    >
      <Calendar className="w-4 h-4" />
      Editar Fechas
    </Button>
  ) : (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Inicio</label>
          <input
            type="date"
            value={scheduleData.starts_at}
            onChange={(e) => setScheduleData({ ...scheduleData, starts_at: e.target.value })}
            className="brutalist-input w-full"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Fin</label>
          <input
            type="date"
            value={scheduleData.ends_at}
            onChange={(e) => setScheduleData({ ...scheduleData, ends_at: e.target.value })}
            className="brutalist-input w-full"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleUpdateSchedule} className="brutalist-button bg-primary text-white flex-1">
          Guardar Fechas
        </Button>
        <Button onClick={() => setShowScheduleForm(false)} variant="outline" className="brutalist-button">
          Cancelar
        </Button>
      </div>
    </div>
  )}
</div>
```

Make sure `Calendar` is imported — add it to the import from lucide-react if not present.

- [ ] **Step 3: Commit**

```bash
git add app/admin/banners/[id]/page.tsx
git commit -m "feat: banner approval uses date pickers for custom schedule; active banners can edit schedule"
```

---

## Task 9: Admin Reviews Statistics Page

**Files:**
- Create: `app/admin/reviews/page.tsx`
- Modify: `components/admin/collapsible-sidebar.tsx` (add nav link)
- Modify: `components/admin/mobile-nav.tsx` (add nav link)

- [ ] **Step 1: Create the admin reviews page**

Create `app/admin/reviews/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Flag, MessageSquare, TrendingUp } from 'lucide-react'
import { AdminReviewsTable } from '@/components/admin/admin-reviews-table'

export const revalidate = 60

export default async function AdminReviewsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
    redirect('/')
  }

  const communityId = profile.community_id

  // Stats
  const { count: totalReviews } = await (supabase as any)
    .from('business_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('businesses.community_id', communityId)

  const { data: ratingData } = await (supabase as any)
    .from('business_reviews')
    .select('rating, businesses!inner(community_id)')
    .eq('businesses.community_id', communityId)

  const avgRating = ratingData?.length
    ? Math.round((ratingData.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingData.length) * 10) / 10
    : 0

  const { count: flaggedCount } = await (supabase as any)
    .from('review_flags')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratingData?.filter((r: any) => r.rating === star).length || 0,
  }))

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Reseñas', active: true }]} />

      <h1 className="text-3xl font-black uppercase tracking-tighter italic">
        Reseñas <span className="text-primary">Plataforma</span>
      </h1>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="brutalist-card">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-3xl font-black">{totalReviews || 0}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Total Reseñas</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-secondary">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-secondary fill-secondary" />
            <div className="text-3xl font-black">{avgRating}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Promedio</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-red-600">
          <CardContent className="p-4 text-center">
            <Flag className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-3xl font-black">{flaggedCount || 0}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">Reportadas</div>
          </CardContent>
        </Card>
        <Card className="brutalist-card">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">Distribución</div>
            {ratingDist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-black">{star}</span>
                <Star className="w-3 h-3 fill-secondary text-secondary" />
                <div className="flex-1 bg-gray-200 h-2 border border-black">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: ratingData?.length ? `${(count / ratingData.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-4 text-right font-bold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AdminReviewsTable communityId={communityId} />
    </div>
  )
}
```

- [ ] **Step 2: Create AdminReviewsTable client component**

Create `components/admin/admin-reviews-table.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, Search, Trash2, Loader2, Flag } from 'lucide-react'
import { toast } from 'sonner'

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  businesses: { name: string; slug: string } | null
  profiles: { full_name: string | null } | null
}

export function AdminReviewsTable({ communityId }: { communityId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const supabase = createClient()

  async function fetchReviews() {
    setLoading(true)
    try {
      let query = (supabase as any)
        .from('business_reviews')
        .select(`
          id, rating, review_text, created_at,
          businesses!inner(name, slug, community_id),
          profiles!business_reviews_user_id_fkey(full_name)
        `)
        .eq('businesses.community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter))
      }

      const { data, error } = await query
      if (error) throw error

      const transformed = (data || []).map((r: any) => ({
        ...r,
        businesses: r.businesses ? { name: r.businesses.name, slug: r.businesses.slug } : null,
      }))

      const filtered = search.trim()
        ? transformed.filter((r: Review) =>
            r.businesses?.name.toLowerCase().includes(search.toLowerCase()) ||
            r.review_text?.toLowerCase().includes(search.toLowerCase()) ||
            r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
          )
        : transformed

      setReviews(filtered)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar reseñas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReviews() }, [ratingFilter, search, communityId])

  async function handleDelete(reviewId: string) {
    if (!confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Reseña eliminada')
      fetchReviews()
    } else {
      toast.error('Error al eliminar reseña')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por negocio, usuario o texto..."
            className="brutalist-input pl-10"
          />
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[160px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="5">5 ★</SelectItem>
            <SelectItem value="4">4 ★</SelectItem>
            <SelectItem value="3">3 ★</SelectItem>
            <SelectItem value="2">2 ★</SelectItem>
            <SelectItem value="1">1 ★</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <p className="font-bold uppercase tracking-widest text-black/40">Sin reseñas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <Card key={review.id} className="brutalist-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-secondary text-secondary' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">
                        {review.businesses?.name}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        {review.profiles?.full_name || 'Anónimo'}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-gray-700 line-clamp-2">{review.review_text}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(review.id)}
                      className="brutalist-button border-red-600 text-red-600 hover:bg-red-50 h-9 w-9"
                      title="Eliminar reseña"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add Reviews link to admin sidebar**

In `components/admin/collapsible-sidebar.tsx`, find the `navItems` array and add after the `review-flags` entry:

```typescript
{ href: '/admin/reviews', label: 'Reseñas', icon: Star, section: 'monetization' },
```

Add `Star` to the lucide-react imports at the top.

- [ ] **Step 4: Add Reviews link to mobile nav**

Check `components/admin/mobile-nav.tsx` for a similar nav items array and add the same entry.

- [ ] **Step 5: Commit**

```bash
git add app/admin/reviews/page.tsx components/admin/admin-reviews-table.tsx components/admin/collapsible-sidebar.tsx components/admin/mobile-nav.tsx
git commit -m "feat: admin reviews dashboard with stats, rating distribution, and review management"
```

---

## Self-Review

### Spec coverage check:
1. ✅ Business favorites — Task 1 (DB), Task 4 (API + button + dashboard)
2. ✅ Post favorites — Task 1 (DB), Task 5 (API + button + dashboard)
3. ✅ Rejection notification — already implemented in existing code; Task 3 adds dashboard visibility
4. ✅ Business resubmission — Task 3 (API + button)
5. ✅ Owner notifications (approval, rejection, review) — approval + rejection already wired; Task 6 adds review notification
6. ✅ Moderator admin panel access — Task 2
7. ✅ Revoke premium — Task 7
8. ✅ Banner rotation schedule — Task 8
9. ✅ Admin review statistics — Task 9

### Placeholder scan: No TBDs or TODOs found.

### Type consistency:
- `business_favorites` table referenced consistently as `business_favorites` across Tasks 1, 4, 5
- `community_post_favorites` referenced consistently across Tasks 1, 5
- `approveData.starts_at` / `approveData.ends_at` in Task 8 match the state definition and the form inputs
- `sendNewReviewEmail` defined in Task 6 step 1, called in step 2 — signature matches
- `requirePermission('canManageRoles', supabase)` in Task 7 — `canManageRoles` exists in `lib/auth/permissions.ts`
