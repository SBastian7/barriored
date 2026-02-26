# Feature Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10 UX and business features across 3 phases: error handling, offline support, and business tools

**Architecture:** Sequential implementation prioritizing user-facing critical features first (error pages, loading states), then infrastructure (offline, reporting), then business features (deletion, promotions, linking)

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL, Auth, Storage), Serwist (Service Worker), Tailwind CSS, Radix UI

**Design Document:** `docs/plans/2026-02-26-feature-improvements-design.md`

---

## Phase 1: Quick Polish (Days 1-2, ~8 hours)

### Task 1.1: Create Global 404 Page

**Files:**
- Create: `app/not-found.tsx`

**Step 1: Create 404 page component**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="brutalist-card max-w-md w-full">
        <CardContent className="text-center space-y-6 py-12">
          <h1 className="text-7xl md:text-9xl font-heading font-black uppercase italic leading-none text-primary">
            404
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Página no encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              La página que buscas no existe o fue movida.
            </p>
          </div>
          <Button asChild className="brutalist-button">
            <Link href="/">
              Volver al Inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Test 404 page**

Manual test:
1. Run `npm run dev`
2. Navigate to `http://localhost:3000/nonexistent-page`
3. Verify brutalist 404 page appears
4. Verify "Volver al Inicio" button works
5. Check mobile responsive design

**Step 3: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat: add custom brutalist 404 page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Create Global 500 Error Page

**Files:**
- Create: `app/error.tsx`

**Step 1: Create error page component**

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="brutalist-card max-w-md w-full">
        <CardContent className="text-center space-y-6 py-12">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-600" strokeWidth={3} />
          <h1 className="text-5xl md:text-7xl font-heading font-black uppercase italic leading-none">
            Error
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Algo salió mal
            </p>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado. Intenta de nuevo.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="brutalist-button">
              Intentar de Nuevo
            </Button>
            <Button asChild variant="outline" className="brutalist-button">
              <a href="/">Volver al Inicio</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Test error page**

Manual test:
1. Create test error in any page (throw new Error('test'))
2. Verify error page appears with brutalist styling
3. Click "Intentar de Nuevo" - should reload page
4. Click "Volver al Inicio" - should navigate home
5. Remove test error

**Step 3: Commit**

```bash
git add app/error.tsx
git commit -m "feat: add custom brutalist 500 error page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Create Community-Specific 404 Page

**Files:**
- Create: `app/[community]/not-found.tsx`

**Step 1: Create community 404 component**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home } from 'lucide-react'

export default function CommunityNotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card className="brutalist-card">
        <CardContent className="text-center space-y-6 py-12">
          <h1 className="text-7xl md:text-9xl font-heading font-black uppercase italic leading-none text-primary">
            404
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Página no encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              Esta página no existe en esta comunidad.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild className="brutalist-button">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Test community 404**

Manual test:
1. Navigate to `http://localhost:3000/parqueindustrial/nonexistent`
2. Verify community-scoped 404 appears
3. Test "Inicio" button navigates correctly

**Step 3: Commit**

```bash
git add "app/[community]/not-found.tsx"
git commit -m "feat: add community-specific 404 page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.4: Create Image Loader Component

**Files:**
- Create: `components/ui/image-loader.tsx`

**Step 1: Create ImageLoader component with skeleton**

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

interface ImageLoaderProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  aspectRatio?: string
  className?: string
  priority?: boolean
  fill?: boolean
}

export function ImageLoader({
  src,
  alt,
  width,
  height,
  aspectRatio = '16/9',
  className,
  priority = false,
  fill = false,
}: ImageLoaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // No image provided or error state
  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border-2 border-black bg-muted',
          className
        )}
        style={aspectRatio && !fill ? { aspectRatio } : undefined}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 border-2 border-black animate-pulse bg-background"
          style={aspectRatio && !fill ? { aspectRatio } : undefined}
        />
      )}

      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill ? 'object-cover' : ''
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}
```

**Step 2: Test ImageLoader component**

Manual test:
1. Import in a test page
2. Test with valid image - should show skeleton then fade in
3. Test with null src - should show placeholder icon
4. Test with invalid src - should show placeholder after error
5. Test with slow network throttling (DevTools)

**Step 3: Commit**

```bash
git add components/ui/image-loader.tsx
git commit -m "feat: add brutalist image loader with skeleton state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.5: Apply ImageLoader to Business Photos

**Files:**
- Modify: `components/business/business-hero.tsx`
- Modify: `components/business/business-gallery.tsx` (if exists)

**Step 1: Update BusinessHero to use ImageLoader**

Find the main business photo rendering and replace with:

```tsx
import { ImageLoader } from '@/components/ui/image-loader'

// Replace existing Image or img tag with:
<ImageLoader
  src={photos[0]}
  alt={`${name} - Foto principal`}
  fill
  priority
  className="w-full h-full"
  aspectRatio="16/9"
/>
```

**Step 2: Update gallery thumbnails (if exists)**

```tsx
{photos.map((photo, index) => (
  <ImageLoader
    key={index}
    src={photo}
    alt={`${name} - Foto ${index + 1}`}
    width={200}
    height={200}
    aspectRatio="1/1"
    className="brutalist-card cursor-pointer"
  />
))}
```

**Step 3: Test business photo loading**

Manual test:
1. Navigate to any business profile
2. Throttle network to Slow 3G
3. Verify skeleton appears before image loads
4. Verify smooth fade-in transition
5. Test with business that has no photos

**Step 4: Commit**

```bash
git add components/business/*.tsx
git commit -m "feat: apply image loader to business photos

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.6: Apply ImageLoader to Community Posts

**Files:**
- Modify: `components/community/post-card.tsx` (or similar)
- Modify: `components/community/announcements-section.tsx`
- Modify: `components/community/events-section.tsx`

**Step 1: Update post card images**

Find image rendering in post cards and replace:

```tsx
import { ImageLoader } from '@/components/ui/image-loader'

{post.image_url && (
  <ImageLoader
    src={post.image_url}
    alt={post.title}
    width={400}
    height={300}
    aspectRatio="4/3"
    className="brutalist-card"
  />
)}
```

**Step 2: Update author avatars**

```tsx
<ImageLoader
  src={post.profiles?.avatar_url}
  alt={post.profiles?.full_name || 'Usuario'}
  width={40}
  height={40}
  aspectRatio="1/1"
  className="rounded-full border-2 border-black"
/>
```

**Step 3: Test community post images**

Manual test:
1. Navigate to `/parqueindustrial/community`
2. Verify post images show skeleton
3. Test with slow network
4. Verify placeholder for posts without images

**Step 4: Commit**

```bash
git add components/community/*.tsx
git commit -m "feat: apply image loader to community post images

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.7: Create Share Post Button Component

**Files:**
- Create: `components/community/share-post-button.tsx`

**Step 1: Create hybrid share button component**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Share2, MessageCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SharePostButtonProps {
  title: string
  content: string
  url: string
  className?: string
}

export function SharePostButton({ title, content, url, className }: SharePostButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: content.slice(0, 160),
          url,
        })
        return
      } catch (err: any) {
        // User cancelled or error - fall through to show menu
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    }
    // If Web Share not available, dropdown menu will show
  }

  const handleWhatsAppShare = () => {
    const text = `${title}\n\n${content.slice(0, 200)}...\n\n${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Error al copiar enlace')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="brutalist-button"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="brutalist-card">
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 2: Test share button**

Manual test:
1. Test on mobile device - should open native share sheet
2. Test WhatsApp share - should open WhatsApp with text
3. Test copy link - should copy and show toast
4. Test on desktop - should show dropdown menu

**Step 3: Commit**

```bash
git add components/community/share-post-button.tsx
git commit -m "feat: add hybrid share button for community posts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.8: Add Share Button to Post Pages

**Files:**
- Modify: `app/[community]/community/anuncios/[id]/page.tsx`
- Modify: `app/[community]/community/eventos/[id]/page.tsx`
- Modify: `app/[community]/community/empleos/[id]/page.tsx`

**Step 1: Add share button to announcement detail page**

If page doesn't exist, create it:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SharePostButton } from '@/components/community/share-post-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
  const { community: slug, id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('community_posts')
    .select('title, content, image_url')
    .eq('id', id)
    .single()

  if (!post) return {}
  return {
    title: `${post.title} | BarrioRed`,
    description: post.content.slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.slice(0, 160),
      images: post.image_url ? [post.image_url] : [],
      type: 'article',
    },
  }
}

export default async function AnnouncementPage({ params }: { params: Promise<{ community: string; id: string }> }) {
  const { community: slug, id } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  const { data: post } = await supabase
    .from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('id', id)
    .eq('community_id', community.id)
    .eq('type', 'announcement')
    .single()

  if (!post) notFound()

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'}/${slug}/community/anuncios/${id}`

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Card className="brutalist-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-3xl font-heading font-black uppercase italic">
              {post.title}
            </CardTitle>
            <SharePostButton
              title={post.title}
              content={post.content}
              url={shareUrl}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Post content here */}
          <p className="whitespace-pre-wrap">{post.content}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Repeat for events and jobs**

Copy structure to:
- `app/[community]/community/eventos/[id]/page.tsx`
- `app/[community]/community/empleos/[id]/page.tsx`

Adjust type filter and URL accordingly.

**Step 3: Test sharing from post detail pages**

Manual test:
1. Navigate to announcement, event, job detail pages
2. Test share button on each
3. Verify correct URL is shared
4. Verify Open Graph metadata in share preview

**Step 4: Commit**

```bash
git add "app/[community]/community/*/[id]/page.tsx"
git commit -m "feat: add share functionality to community post pages

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Infrastructure (Days 3-4, ~13 hours)

### Task 2.1: Enhance Service Worker for Offline Mode

**Files:**
- Modify: `app/sw.ts`

**Step 1: Add page caching strategy**

Find the `runtimeCaching` array and add:

```typescript
// Add after existing cache strategies
{
  // Cache HTML pages for offline viewing
  matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
  handler: new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
    networkTimeoutSeconds: 3,
  }),
},
{
  // Cache business and community content pages
  matcher: ({ url }: { url: URL }) =>
    url.pathname.includes('/business/') ||
    url.pathname.includes('/community/'),
  handler: new StaleWhileRevalidate({
    cacheName: 'content-pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  }),
},
```

**Step 2: Test service worker caching**

Manual test:
1. Build SW: `npm run build:sw`
2. Start dev server: `npm run dev`
3. Visit several business and community pages
4. Go offline (DevTools or airplane mode)
5. Navigate to previously visited pages
6. Verify pages load from cache

**Step 3: Commit**

```bash
git add app/sw.ts
git commit -m "feat: add offline page caching to service worker

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Create Offline Indicator Component

**Files:**
- Create: `components/layout/offline-indicator.tsx`

**Step 1: Create offline detection component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="bg-secondary border-b-2 border-black p-2 text-center sticky top-0 z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" strokeWidth={3} />
        <p className="font-bold uppercase tracking-widest text-sm">
          Modo sin conexión
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Add to root layout**

Modify `app/layout.tsx`:

```tsx
import { OfflineIndicator } from '@/components/layout/offline-indicator'

// Add inside <body> tag, before {children}
<OfflineIndicator />
{children}
```

**Step 3: Test offline indicator**

Manual test:
1. Run dev server
2. Open DevTools Network tab
3. Toggle offline mode
4. Verify yellow banner appears at top
5. Toggle back online - banner should disappear

**Step 4: Commit**

```bash
git add components/layout/offline-indicator.tsx app/layout.tsx
git commit -m "feat: add offline mode indicator banner

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Create Offline Page

**Files:**
- Create: `app/offline/page.tsx`

**Step 1: Create offline page**

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WifiOff } from 'lucide-react'

export const metadata = {
  title: 'Sin Conexión | BarrioRed',
}

export default function OfflinePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card className="brutalist-card">
        <CardContent className="text-center space-y-6 py-12">
          <WifiOff className="h-16 w-16 mx-auto text-muted-foreground" strokeWidth={3} />
          <h1 className="text-5xl md:text-7xl font-heading font-black uppercase italic leading-none">
            Sin Conexión
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Contenido no disponible
            </p>
            <p className="text-sm text-muted-foreground">
              Algunas páginas están disponibles sin conexión.
              Conecta a internet para ver contenido actualizado.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="brutalist-button"
          >
            Intentar Reconectar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Configure SW to serve offline page**

In `app/sw.ts`, add fallback configuration:

```typescript
// After Serwist instantiation
const serwist = new Serwist({
  // ... existing config
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})
```

**Step 3: Test offline fallback**

Manual test:
1. Rebuild SW: `npm run build:sw`
2. Visit site, then go offline
3. Navigate to uncached page
4. Should see offline page
5. Click "Intentar Reconectar"

**Step 4: Commit**

```bash
git add app/offline/page.tsx app/sw.ts
git commit -m "feat: add offline fallback page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.4: Create Database Migration for Content Reports

**Files:**
- Create: `supabase/migrations/20260226000001_add_content_reports.sql`

**Step 1: Create migration file**

```sql
-- Create content_reports table
CREATE TABLE content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('business', 'community_post', 'community_alert')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can create reports
CREATE POLICY "Users can report content" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RLS Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- RLS Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- RLS Policy: Admins can update reports
CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Add comment
COMMENT ON TABLE content_reports IS 'User reports for inappropriate content across the platform';
```

**Step 2: Apply migration**

```bash
# If using Supabase CLI locally
supabase db push

# Or apply via Supabase dashboard
# Copy SQL and run in SQL Editor
```

**Step 3: Update TypeScript types**

```bash
# Regenerate types
supabase gen types typescript --local > lib/types/database.ts

# Or if using remote
supabase gen types typescript --project-id <your-project-id> > lib/types/database.ts
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260226000001_add_content_reports.sql lib/types/database.ts
git commit -m "feat: add content reports table and RLS policies

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.5: Create Report Button Component

**Files:**
- Create: `components/shared/report-button.tsx`

**Step 1: Create report button with dialog**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface ReportButtonProps {
  contentType: 'business' | 'community_post' | 'community_alert'
  contentId: string
  className?: string
}

export function ReportButton({ contentType, contentId, className }: ReportButtonProps) {
  const [showOtherDialog, setShowOtherDialog] = useState(false)
  const [otherDescription, setOtherDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleReport = async (reason: string, description?: string) => {
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesión para reportar contenido')
        return
      }

      // Check for duplicate report
      const { data: existing } = await supabase
        .from('content_reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .single()

      if (existing) {
        toast.info('Ya reportaste este contenido anteriormente')
        return
      }

      // Create report
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description || null,
        })

      if (error) throw error

      toast.success('Reporte enviado. Lo revisaremos pronto.')
      setShowOtherDialog(false)
      setOtherDescription('')
    } catch (error) {
      console.error('Report error:', error)
      toast.error('Error al enviar reporte')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            <Flag className="h-4 w-4" />
            <span className="sr-only">Reportar contenido</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="brutalist-card">
          <DropdownMenuItem onClick={() => handleReport('spam')}>
            Spam
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleReport('inappropriate')}>
            Contenido inapropiado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleReport('misleading')}>
            Información engañosa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowOtherDialog(true)}>
            Otro...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showOtherDialog} onOpenChange={setShowOtherDialog}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle>Reportar Contenido</DialogTitle>
            <DialogDescription>
              Describe el problema con este contenido
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
            placeholder="Describe el problema..."
            className="brutalist-input min-h-[100px]"
            disabled={isSubmitting}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOtherDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleReport('other', otherDescription)}
              disabled={isSubmitting || !otherDescription.trim()}
              className="brutalist-button"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Test report button**

Manual test:
1. Add to a test page with valid content ID
2. Test each report reason
3. Verify toast messages
4. Check database for created report
5. Test duplicate report prevention

**Step 3: Commit**

```bash
git add components/shared/report-button.tsx
git commit -m "feat: add content report button component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.6: Add Report Button to Business Profiles

**Files:**
- Modify: `app/[community]/business/[slug]/page.tsx`

**Step 1: Add report button to business profile**

Find the ShareButton location and add ReportButton nearby:

```tsx
import { ReportButton } from '@/components/shared/report-button'

// Add after ShareButton
<div className="flex items-center gap-2">
  <ShareButton
    title={business.name}
    description={business.description || `${business.name} en BarrioRed`}
  />
  <ReportButton
    contentType="business"
    contentId={business.id}
  />
</div>
```

**Step 2: Test report on business profile**

Manual test:
1. Navigate to business profile
2. Click report button
3. Submit report with each reason type
4. Verify report is created in database

**Step 3: Commit**

```bash
git add "app/[community]/business/[slug]/page.tsx"
git commit -m "feat: add report button to business profiles

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.7: Add Report Button to Community Posts

**Files:**
- Modify: `components/community/post-card.tsx` (or equivalent)

**Step 1: Add report button to post cards**

Find the post card header and add:

```tsx
import { ReportButton } from '@/components/shared/report-button'

// In card header, add:
<div className="flex items-center justify-between">
  <h3 className="font-bold">{post.title}</h3>
  <ReportButton
    contentType="community_post"
    contentId={post.id}
  />
</div>
```

**Step 2: Test report on community posts**

Manual test:
1. Navigate to community page
2. Test report on announcement, event, job posts
3. Verify reports are created

**Step 3: Commit**

```bash
git add components/community/*.tsx
git commit -m "feat: add report button to community posts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.8: Create Admin Reports Page

**Files:**
- Create: `app/admin/reports/page.tsx`

**Step 1: Create admin reports dashboard**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

type ContentReport = {
  id: string
  content_type: string
  content_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  profiles: { full_name: string } | null
}

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<ContentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('pending')

  useEffect(() => {
    fetchReports()
  }, [filter])

  async function fetchReports() {
    setLoading(true)
    let query = supabase
      .from('content_reports')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      toast.error('Error al cargar reportes')
      console.error(error)
    } else {
      setReports(data as any || [])
    }
    setLoading(false)
  }

  async function updateReportStatus(reportId: string, status: 'reviewed' | 'dismissed') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('content_reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (error) {
      toast.error('Error al actualizar reporte')
    } else {
      toast.success('Reporte actualizado')
      fetchReports()
    }
  }

  function getContentUrl(report: ContentReport): string {
    // Construct URL based on content type
    switch (report.content_type) {
      case 'business':
        return `/admin/businesses` // Link to admin businesses page
      case 'community_post':
        return `/admin/community` // Link to admin community page
      case 'community_alert':
        return `/admin/alerts`
      default:
        return '#'
    }
  }

  const reasonLabels: Record<string, string> = {
    spam: 'Spam',
    inappropriate: 'Inapropiado',
    misleading: 'Engañoso',
    other: 'Otro',
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-heading font-black uppercase italic">
          Reportes de Contenido
        </h1>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="brutalist-input w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="reviewed">Revisados</SelectItem>
            <SelectItem value="dismissed">Descartados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="brutalist-card">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No hay reportes {filter !== 'all' && `con estado "${filter}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="brutalist-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent border-2 border-black uppercase">
                        {report.content_type.replace('_', ' ')}
                      </Badge>
                      <Badge
                        className={
                          report.status === 'pending'
                            ? 'bg-secondary'
                            : 'bg-muted'
                        }
                      >
                        {report.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <CardTitle className="text-lg">
                      {reasonLabels[report.reason] || report.reason}
                    </CardTitle>
                    {report.description && (
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                    <p className="text-sm">
                      Reportado por: <strong>{report.profiles?.full_name || 'Usuario'}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="brutalist-button"
                    >
                      <Link href={getContentUrl(report)} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    {report.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, 'reviewed')}
                          className="brutalist-button"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Revisar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, 'dismissed')}
                          className="brutalist-button"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Descartar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add link to admin navigation**

Update admin navigation to include reports link.

**Step 3: Test admin reports page**

Manual test:
1. Create several test reports
2. Navigate to `/admin/reports`
3. Test filtering by status
4. Test marking reports as reviewed/dismissed
5. Verify links to content work

**Step 4: Commit**

```bash
git add app/admin/reports/page.tsx
git commit -m "feat: add admin content reports dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Business Features (Days 5-7, ~18 hours)

### Task 3.1: Create Database Migration for Business Features

**Files:**
- Create: `supabase/migrations/20260226000002_add_business_features.sql`

**Step 1: Create migration for business deletion and promotions**

```sql
-- Add deletion request fields to businesses table
ALTER TABLE businesses
  ADD COLUMN deletion_requested boolean DEFAULT false,
  ADD COLUMN deletion_reason text,
  ADD COLUMN deletion_requested_at timestamp;

CREATE INDEX idx_businesses_deletion_requested ON businesses(deletion_requested)
  WHERE deletion_requested = true;

-- Extend community_posts type constraint to include 'promotion'
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('announcement', 'event', 'job', 'promotion'));

-- Add last_promoted_at for rate limiting
ALTER TABLE community_posts
  ADD COLUMN last_promoted_at timestamp;

CREATE INDEX idx_community_posts_type_promotion ON community_posts(type)
  WHERE type = 'promotion';

-- Add comments
COMMENT ON COLUMN businesses.deletion_requested IS 'Business owner requested deletion';
COMMENT ON COLUMN businesses.deletion_reason IS 'Reason provided by owner for deletion';
COMMENT ON COLUMN community_posts.last_promoted_at IS 'Last time business created a promotion (for rate limiting)';
```

**Step 2: Apply migration**

```bash
supabase db push
```

**Step 3: Regenerate types**

```bash
supabase gen types typescript --local > lib/types/database.ts
```

**Step 4: Update type definitions**

Modify `lib/types/index.ts`:

```typescript
// Add promotion to PostType
export type PostType = 'announcement' | 'event' | 'job' | 'promotion'

// Add promotion metadata type
export type PromotionMetadata = {
  linked_business_id: string
  linked_business_name: string
  offer_details?: string
  valid_until?: string
}
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260226000002_add_business_features.sql lib/types/database.ts lib/types/index.ts
git commit -m "feat: add database schema for business deletion and promotions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Create Deletion Request Component

**Files:**
- Create: `components/business/deletion-request-button.tsx`

**Step 1: Create deletion request dialog component**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DeletionRequestButtonProps {
  businessId: string
  businessName: string
}

export function DeletionRequestButton({ businessId, businessName }: DeletionRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No autenticado')
        return
      }

      // Verify user owns the business
      const { data: business, error: fetchError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single()

      if (fetchError) throw fetchError

      if (business.owner_id !== user.id) {
        toast.error('No tienes permiso para eliminar este negocio')
        return
      }

      // Update business with deletion request
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          deletion_requested: true,
          deletion_reason: reason.trim() || null,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', businessId)

      if (updateError) throw updateError

      toast.success('Solicitud enviada. Un administrador la revisará pronto.')
      setShowDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Deletion request error:', error)
      toast.error('Error al enviar solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowDialog(true)}
        className="brutalist-button w-full"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Solicitar Eliminación
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar negocio?
            </DialogTitle>
            <DialogDescription>
              Estás solicitando eliminar <strong>{businessName}</strong>.
              Tu perfil será desactivado hasta que un administrador revise tu solicitud.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Razón (opcional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="¿Por qué quieres eliminar tu negocio?"
              className="brutalist-input min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="brutalist-button"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Test deletion request component**

Manual test:
1. Add to dashboard with test business ID
2. Click button and verify dialog
3. Submit with and without reason
4. Verify database update
5. Test authorization (non-owner can't delete)

**Step 3: Commit**

```bash
git add components/business/deletion-request-button.tsx
git commit -m "feat: add business deletion request component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.3: Add Deletion Request to Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Add danger zone section to dashboard**

Find the dashboard layout and add at the end:

```tsx
import { DeletionRequestButton } from '@/components/business/deletion-request-button'

// Add danger zone card
{business && !business.deletion_requested && (
  <Card className="brutalist-card border-red-600">
    <CardHeader>
      <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
      <CardDescription>
        Las acciones aquí son permanentes y requieren aprobación administrativa.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Solicitar la eliminación desactivará tu perfil hasta que un
        administrador revise tu solicitud. Esta acción es reversible por el equipo.
      </p>
      <DeletionRequestButton
        businessId={business.id}
        businessName={business.name}
      />
    </CardContent>
  </Card>
)}

{business?.deletion_requested && (
  <Card className="brutalist-card border-secondary bg-secondary/10">
    <CardHeader>
      <CardTitle>Eliminación Pendiente</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm">
        Tu solicitud de eliminación está siendo revisada por un administrador.
      </p>
      {business.deletion_reason && (
        <p className="text-sm text-muted-foreground mt-2">
          Razón: {business.deletion_reason}
        </p>
      )}
    </CardContent>
  </Card>
)}
```

**Step 2: Test deletion from dashboard**

Manual test:
1. Navigate to merchant dashboard
2. Scroll to danger zone
3. Request deletion
4. Verify pending state shows
5. Refresh - should persist

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add deletion request to merchant dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.4: Add Deletion Requests to Admin Panel

**Files:**
- Modify: `app/admin/businesses/page.tsx`

**Step 1: Add deletion requests filter and actions**

Add filter option:

```tsx
// Add to filter options
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="pending">Pendientes</SelectItem>
    <SelectItem value="approved">Aprobados</SelectItem>
    <SelectItem value="rejected">Rechazados</SelectItem>
    <SelectItem value="deletion_requested">Solicitudes de Eliminación</SelectItem>
  </SelectContent>
</Select>
```

Update query to handle deletion filter:

```typescript
let query = supabase
  .from('businesses')
  .select('*, categories(name), profiles(full_name)')
  .order('created_at', { ascending: false })

if (statusFilter === 'deletion_requested') {
  query = query.eq('deletion_requested', true)
} else if (statusFilter !== 'all') {
  query = query.eq('status', statusFilter)
}
```

Add deletion action buttons:

```tsx
{business.deletion_requested && (
  <div className="flex gap-2 mt-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleApproveDeletion(business.id)}
      className="brutalist-button"
    >
      Aprobar Eliminación
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleRejectDeletion(business.id)}
      className="brutalist-button"
    >
      Rechazar
    </Button>
  </div>
)}

{business.deletion_reason && (
  <p className="text-sm text-muted-foreground mt-2">
    Razón: {business.deletion_reason}
  </p>
)}
```

Add handler functions:

```typescript
async function handleApproveDeletion(businessId: string) {
  const { error } = await supabase
    .from('businesses')
    .update({
      is_active: false,
      deletion_requested: false,
      status: 'rejected', // Soft delete by marking inactive
    })
    .eq('id', businessId)

  if (error) {
    toast.error('Error al aprobar eliminación')
  } else {
    toast.success('Negocio desactivado')
    fetchBusinesses()
  }
}

async function handleRejectDeletion(businessId: string) {
  const { error } = await supabase
    .from('businesses')
    .update({
      deletion_requested: false,
      deletion_reason: null,
      deletion_requested_at: null,
    })
    .eq('id', businessId)

  if (error) {
    toast.error('Error al rechazar eliminación')
  } else {
    toast.success('Solicitud rechazada')
    fetchBusinesses()
  }
}
```

**Step 2: Test admin deletion workflow**

Manual test:
1. Request deletion as business owner
2. Log in as admin
3. Navigate to businesses with deletion filter
4. Test approve deletion (should deactivate)
5. Test reject deletion (should clear request)

**Step 3: Commit**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat: add deletion request management to admin panel

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.5: Update Event Form for Business Linking

**Files:**
- Modify: `components/community/event-form.tsx` (or create if doesn't exist)

**Step 1: Add business linking to event form**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

// Inside form component:
const [linkToBusiness, setLinkToBusiness] = useState(false)
const [selectedBusinessId, setSelectedBusinessId] = useState('')
const [ownedBusinesses, setOwnedBusinesses] = useState<any[]>([])
const supabase = createClient()

useEffect(() => {
  async function fetchOwnedBusinesses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .eq('status', 'approved')
      .order('name')

    setOwnedBusinesses(data || [])
  }

  fetchOwnedBusinesses()
}, [])

// Add to form (after location fields):
{ownedBusinesses.length > 0 && (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="linkBusiness"
        checked={linkToBusiness}
        onCheckedChange={(checked) => {
          setLinkToBusiness(checked as boolean)
          if (!checked) setSelectedBusinessId('')
        }}
      />
      <Label htmlFor="linkBusiness" className="cursor-pointer">
        ¿Este evento es de un negocio?
      </Label>
    </div>

    {linkToBusiness && (
      <div className="space-y-2">
        <Label htmlFor="business">Negocio</Label>
        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
          <SelectTrigger className="brutalist-input">
            <SelectValue placeholder="Selecciona tu negocio" />
          </SelectTrigger>
          <SelectContent>
            {ownedBusinesses.map((business) => (
              <SelectItem key={business.id} value={business.id}>
                {business.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </div>
)}

// In handleSubmit, update metadata:
const selectedBusiness = ownedBusinesses.find(b => b.id === selectedBusinessId)
const metadata: any = {
  date: formData.date,
  end_date: formData.endDate || undefined,
  location: formData.location,
  organizer: formData.organizer || undefined,
}

if (linkToBusiness && selectedBusiness) {
  metadata.linked_business_id = selectedBusiness.id
  metadata.linked_business_name = selectedBusiness.name
}
```

**Step 2: Test event business linking**

Manual test:
1. Create event as business owner
2. Check business linking checkbox
3. Select business from dropdown
4. Submit event
5. Verify metadata contains business info

**Step 3: Commit**

```bash
git add components/community/event-form.tsx
git commit -m "feat: add business linking to event creation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.6: Update Job Form for Business Linking

**Files:**
- Modify: `components/community/job-form.tsx`

**Step 1: Add business linking to job form**

Same pattern as event form:

```tsx
// Add state and fetch owned businesses
const [linkToBusiness, setLinkToBusiness] = useState(false)
const [selectedBusinessId, setSelectedBusinessId] = useState('')
const [ownedBusinesses, setOwnedBusinesses] = useState<any[]>([])

// Add checkbox and dropdown (same UI as event form)

// In handleSubmit, update metadata:
const selectedBusiness = ownedBusinesses.find(b => b.id === selectedBusinessId)
const metadata: any = {
  category: formData.category,
  salary_range: formData.salaryRange || undefined,
  contact_method: formData.contactMethod,
  contact_value: formData.contactValue,
}

if (linkToBusiness && selectedBusiness) {
  metadata.linked_business_id = selectedBusiness.id
  metadata.linked_business_name = selectedBusiness.name
}
```

**Step 2: Test job business linking**

Manual test:
1. Create job posting as business owner
2. Link to business
3. Verify metadata

**Step 3: Commit**

```bash
git add components/community/job-form.tsx
git commit -m "feat: add business linking to job postings

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.7: Display Business Badge on Posts

**Files:**
- Modify: `components/community/post-card.tsx`

**Step 1: Add business badge to post cards**

```tsx
import { Badge } from '@/components/ui/badge'
import { Building } from 'lucide-react'
import Link from 'next/link'

// Add after post title or at top of card:
{post.metadata?.linked_business_id && (
  <Badge
    asChild
    className="bg-accent border-2 border-black text-white hover:bg-accent/90"
  >
    <Link href={`/${communitySlug}/business/${post.metadata.linked_business_id}`}>
      <Building className="h-3 w-3 mr-1" />
      {post.metadata.linked_business_name}
    </Link>
  </Badge>
)}
```

**Step 2: Test business badge display**

Manual test:
1. Create event/job with business link
2. View in community feed
3. Verify badge appears with business name
4. Click badge - should navigate to business profile

**Step 3: Commit**

```bash
git add components/community/post-card.tsx
git commit -m "feat: display business badge on linked posts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.8: Add Linked Posts to Business Profile

**Files:**
- Modify: `app/[community]/business/[slug]/page.tsx`

**Step 1: Fetch linked events and jobs**

```tsx
// Add to parallel data fetching:
const [business, linkedEvents, linkedJobs] = await Promise.all([
  supabase
    .from('businesses')
    .select('*, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single(),

  supabase
    .from('community_posts')
    .select('*')
    .eq('type', 'event')
    .eq('status', 'approved')
    .contains('metadata', { linked_business_id: businessId })
    .order('created_at', { ascending: false })
    .limit(5),

  supabase
    .from('community_posts')
    .select('*')
    .eq('type', 'job')
    .eq('status', 'approved')
    .not('metadata->>is_filled', 'eq', 'true')
    .contains('metadata', { linked_business_id: businessId })
    .order('created_at', { ascending: false })
    .limit(5),
])
```

**Step 2: Display linked posts sections**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Briefcase } from 'lucide-react'

// Add after LocationMap and before WhatsAppButton:
{linkedEvents.data && linkedEvents.data.length > 0 && (
  <Card className="brutalist-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Eventos de este Negocio
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {linkedEvents.data.map((event: any) => (
        <Link
          key={event.id}
          href={`/${commSlug}/community/eventos/${event.id}`}
          className="block border-2 border-black p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow"
        >
          <h3 className="font-bold">{event.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(event.metadata.date).toLocaleDateString('es-CO')}
          </p>
        </Link>
      ))}
    </CardContent>
  </Card>
)}

{linkedJobs.data && linkedJobs.data.length > 0 && (
  <Card className="brutalist-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Briefcase className="h-5 w-5" />
        Ofertas de Empleo
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {linkedJobs.data.map((job: any) => (
        <Link
          key={job.id}
          href={`/${commSlug}/community/empleos/${job.id}`}
          className="block border-2 border-black p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow"
        >
          <h3 className="font-bold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">
            {job.metadata.category}
          </p>
        </Link>
      ))}
    </CardContent>
  </Card>
)}
```

**Step 3: Test linked posts on business profile**

Manual test:
1. Link event and job to business
2. Navigate to business profile
3. Verify sections appear
4. Click posts - should navigate to detail pages

**Step 4: Commit**

```bash
git add "app/[community]/business/[slug]/page.tsx"
git commit -m "feat: display linked events and jobs on business profile

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.9: Create Promotion Creation Page

**Files:**
- Create: `app/[community]/dashboard/promote/page.tsx`

**Step 1: Create promotion form page**

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PromotionForm } from '@/components/community/promotion-form'

export const metadata = {
  title: 'Crear Promoción | BarrioRed',
}

export default async function PromotePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/auth/login`)

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  // Get user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .single()

  if (!business) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <p>Debes tener un negocio aprobado para crear promociones.</p>
      </div>
    )
  }

  // Check if business can promote (rate limiting)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data: recentPromotion } = await supabase
    .from('community_posts')
    .select('id, created_at')
    .eq('type', 'promotion')
    .eq('metadata->>linked_business_id', business.id)
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (recentPromotion) {
    const nextAllowed = new Date(recentPromotion.created_at)
    nextAllowed.setDate(nextAllowed.getDate() + 7)

    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="brutalist-card">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-heading font-black uppercase mb-4">
              Límite Alcanzado
            </h2>
            <p>Ya creaste una promoción esta semana.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Próxima promoción disponible: {nextAllowed.toLocaleDateString('es-CO')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic mb-8">
        Crear Promoción
      </h1>
      <PromotionForm
        communityId={community.id}
        communitySlug={slug}
        businessId={business.id}
        businessName={business.name}
      />
    </div>
  )
}
```

**Step 2: Create promotion form component**

Create `components/community/promotion-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploadField } from '@/components/community/image-upload-field'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PromotionFormProps {
  communityId: string
  communitySlug: string
  businessId: string
  businessName: string
}

export function PromotionForm({ communityId, communitySlug, businessId, businessName }: PromotionFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    offerDetails: '',
    validUntil: '',
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const metadata = {
        linked_business_id: businessId,
        linked_business_name: businessName,
        offer_details: formData.offerDetails || undefined,
        valid_until: formData.validUntil || undefined,
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          author_id: user.id,
          type: 'promotion',
          title: formData.title,
          content: formData.offerDetails || '',
          image_url: imageUrl,
          metadata,
          status: 'pending', // Requires admin approval
        })

      if (error) throw error

      toast.success('Promoción enviada. Será revisada por un administrador.')
      router.push(`/${communitySlug}/dashboard`)
    } catch (error) {
      console.error('Promotion creation error:', error)
      toast.error('Error al crear promoción')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="brutalist-card">
        <CardHeader>
          <CardTitle>Detalles de la Promoción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: ¡20% descuento en todo el menú!"
              className="brutalist-input"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalles de la oferta *</Label>
            <Textarea
              id="details"
              value={formData.offerDetails}
              onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
              placeholder="Describe tu oferta o promoción..."
              className="brutalist-input min-h-[120px]"
              maxLength={500}
              required
              disabled={isSubmitting}
            />
          </div>

          <ImageUploadField
            label="Imagen Promocional (opcional)"
            currentImageUrl={imageUrl}
            onUpload={setImageUrl}
            bucket="community-posts"
          />

          <div className="space-y-2">
            <Label htmlFor="validUntil">Válido hasta (opcional)</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="brutalist-input"
              disabled={isSubmitting}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="border-l-4 border-secondary bg-secondary/10 p-4">
            <p className="text-sm font-medium">
              📢 Tu promoción será revisada por un administrador antes de publicarse.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo puedes crear una promoción por semana.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="brutalist-button flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar Promoción
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
```

**Step 3: Test promotion creation**

Manual test:
1. Navigate to `/parqueindustrial/dashboard/promote`
2. Fill form and submit
3. Verify rate limiting (try creating second promotion)
4. Check database for promotion post
5. Verify requires admin approval

**Step 4: Commit**

```bash
git add "app/[community]/dashboard/promote/page.tsx" components/community/promotion-form.tsx
git commit -m "feat: add promotion creation page and form

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.10: Add Promotion Widget to Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Add promotion card to dashboard**

```tsx
import { Megaphone } from 'lucide-react'
import Link from 'next/link'

// Fetch business and check promotion eligibility
const oneWeekAgo = new Date()
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

const { data: recentPromotion } = await supabase
  .from('community_posts')
  .select('created_at')
  .eq('type', 'promotion')
  .eq('metadata->>linked_business_id', business.id)
  .gte('created_at', oneWeekAgo.toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

const canPromote = !recentPromotion

let nextPromotionDate
if (recentPromotion) {
  nextPromotionDate = new Date(recentPromotion.created_at)
  nextPromotionDate.setDate(nextPromotionDate.getDate() + 7)
}

// Add promotion card (before danger zone):
<Card className="brutalist-card border-secondary bg-secondary/5">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Megaphone className="h-5 w-5 text-secondary" strokeWidth={3} />
      Promocionar mi Negocio
    </CardTitle>
    <CardDescription>
      Comparte ofertas y novedades con la comunidad
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {canPromote ? (
      <>
        <p className="text-sm">
          Crea una promoción para destacar ofertas especiales o novedades de tu negocio.
        </p>
        <Button asChild className="brutalist-button w-full">
          <Link href={`/${communitySlug}/dashboard/promote`}>
            <Megaphone className="h-4 w-4 mr-2" />
            Crear Promoción
          </Link>
        </Button>
      </>
    ) : (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Ya creaste una promoción esta semana.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Próxima disponible: {nextPromotionDate?.toLocaleDateString('es-CO')}
        </p>
      </div>
    )}
  </CardContent>
</Card>
```

**Step 2: Test promotion widget**

Manual test:
1. Navigate to dashboard
2. Verify promotion card appears
3. Click "Crear Promoción" - should navigate to form
4. Create promotion
5. Return to dashboard - should show rate limit message

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add promotion widget to merchant dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.11: Create Promotion Card Component

**Files:**
- Create: `components/community/promotion-card.tsx`

**Step 1: Create styled promotion card**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImageLoader } from '@/components/ui/image-loader'
import { Building, Calendar } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

interface PromotionCardProps {
  post: CommunityPost
  communitySlug: string
}

export function PromotionCard({ post, communitySlug }: PromotionCardProps) {
  const validUntil = post.metadata?.valid_until
    ? new Date(post.metadata.valid_until)
    : null

  return (
    <Link href={`/${communitySlug}/community/promociones/${post.id}`}>
      <Card className="brutalist-card border-secondary shadow-[6px_6px_0px_0px_rgb(var(--secondary))] hover:shadow-[8px_8px_0px_0px_rgb(var(--secondary))] transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <Badge className="bg-secondary border-2 border-black uppercase font-bold text-xs">
              Promoción
            </Badge>
            {validUntil && validUntil > new Date() && (
              <Badge variant="outline" className="border-2 border-black text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Hasta {validUntil.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-heading font-black uppercase italic leading-tight">
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.image_url && (
            <ImageLoader
              src={post.image_url}
              alt={post.title}
              aspectRatio="16/9"
              className="brutalist-card"
            />
          )}
          <p className="text-sm line-clamp-3">{post.content}</p>
          {post.metadata?.linked_business_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{post.metadata.linked_business_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 2: Create promotions section component**

Create `components/community/promotions-section.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PromotionCard } from '@/components/community/promotion-card'
import { ArrowRight } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

interface PromotionsSectionProps {
  posts: CommunityPost[]
  communitySlug: string
}

export function PromotionsSection({ posts, communitySlug }: PromotionsSectionProps) {
  if (posts.length === 0) return null

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-heading font-black uppercase italic">
          Promociones
        </h2>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="brutalist-button"
        >
          <Link href={`/${communitySlug}/community/promociones`}>
            Ver todas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PromotionCard
            key={post.id}
            post={post}
            communitySlug={communitySlug}
          />
        ))}
      </div>
    </section>
  )
}
```

**Step 3: Test promotion card styling**

Manual test:
1. Create a promotion with image
2. View in community feed
3. Verify yellow border and special styling
4. Test with/without valid_until date
5. Verify hover effect

**Step 4: Commit**

```bash
git add components/community/promotion-card.tsx components/community/promotions-section.tsx
git commit -m "feat: add styled promotion card and section

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.12: Add Promotions to Community Page

**Files:**
- Modify: `app/[community]/community/page.tsx`

**Step 1: Fetch promotions**

Add to parallel fetching:

```tsx
import { PromotionsSection } from '@/components/community/promotions-section'

// Add to Promise.all:
const [alertsRes, announcementsRes, eventsRes, jobsRes, promotionsRes] = await Promise.all([
  // ... existing queries
  supabase.from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .eq('type', 'promotion')
    .order('created_at', { ascending: false })
    .limit(3),
])
```

**Step 2: Add promotions section to page**

```tsx
// Add after JobsSection and before CommunityCTA:
<PromotionsSection
  posts={(promotionsRes.data ?? []) as any}
  communitySlug={slug}
/>
```

**Step 3: Test promotions on community page**

Manual test:
1. Create 2-3 approved promotions
2. Navigate to community page
3. Verify promotions section appears
4. Test "Ver todas" link
5. Verify special styling

**Step 4: Commit**

```bash
git add "app/[community]/community/page.tsx"
git commit -m "feat: add promotions section to community page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Final Testing & Deployment

### Task 4.1: Comprehensive Testing

**Manual Testing Checklist:**

**Phase 1 - Quick Polish:**
- [ ] 404 page shows on invalid routes
- [ ] 500 error page shows on errors
- [ ] Community 404 shows on invalid community routes
- [ ] Images show skeleton before loading
- [ ] Share button works on community posts (mobile + desktop)

**Phase 2 - Infrastructure:**
- [ ] Offline mode caches visited pages
- [ ] Offline indicator appears when disconnected
- [ ] Report button creates reports in database
- [ ] Admin can view and manage reports
- [ ] RLS prevents non-admins from seeing reports

**Phase 3 - Business Features:**
- [ ] Business owners can request deletion
- [ ] Admin can approve/reject deletion requests
- [ ] Events can be linked to businesses
- [ ] Jobs can be linked to businesses
- [ ] Business badge appears on linked posts
- [ ] Business profile shows linked events/jobs
- [ ] Promotions can be created (with rate limiting)
- [ ] Promotions show special styling
- [ ] Promotions appear on community page

**Performance Testing:**
- [ ] Lighthouse score >90 (mobile + desktop)
- [ ] Service worker registers successfully
- [ ] Cache size stays under 50MB
- [ ] Bundle size increase <50KB

**Browser Testing:**
- [ ] Chrome/Edge - all features work
- [ ] Firefox - all features work
- [ ] Safari/iOS - Web Share API fallback works
- [ ] Mobile responsive on all pages

---

### Task 4.2: Build and Deploy

**Step 1: Build service worker**

```bash
npm run build:sw
```

**Step 2: Build Next.js app**

```bash
npm run build
```

**Step 3: Test production build locally**

```bash
npm run start
```

Test all features in production mode.

**Step 4: Deploy to production**

```bash
# If using Vercel
vercel --prod

# Or push to main branch for automatic deployment
git push origin main
```

**Step 5: Verify production deployment**

1. Test on production URL
2. Verify service worker registers
3. Test offline mode
4. Create test promotion
5. Monitor for errors

---

### Task 4.3: Documentation Update

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md with completed features**

```markdown
## Current State (Feb 2026)
- MVP complete: directory, business profiles, registration, admin, merchant dashboard
- Phase 3 complete: Community board with alerts, events, jobs, announcements
- **NEW:** User experience enhancements: custom error pages, image loading, offline mode
- **NEW:** Content moderation: reporting system with admin dashboard
- **NEW:** Business tools: deletion requests, promotions, event/job linking

## Phase Roadmap
1. MVP (done) - Directory core
2. Monetization (in progress) - Premium profiles, banners, analytics, reviews, payments
   - ✅ Promotional post type with rate limiting
   - ⏭ Featured business profiles
   - ⏭ Banner ads
   - ⏭ Analytics dashboard
3. Community (done) - Announcements, alerts, events, jobs, public services
4. Marketplace (next) - Buy/sell classifieds
5. Services (done) - Emergency/public services directory
```

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: update feature roadmap and current state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Metrics Tracking

After 1 week of deployment, measure:

**Phase 1 Metrics:**
- Zero 404/500 default Next.js pages seen ✓
- Image loading skeletons visible (check analytics)
- Share button usage >10% of post views

**Phase 2 Metrics:**
- >50% returning users with working offline cache
- >5 content reports received
- <24hr average admin response to reports

**Phase 3 Metrics:**
- >20% business owners create ≥1 promotion
- >30% events/jobs linked to businesses
- <5% deletion request rejection rate
- Promotion posts get 2x engagement vs announcements

---

**End of Implementation Plan**

Total estimated time: ~39 hours across 3 phases
- Phase 1: 8 hours
- Phase 2: 13 hours
- Phase 3: 18 hours

All features prioritize user experience, maintain brand consistency, and follow existing architecture patterns.
