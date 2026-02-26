# BarrioRed Feature Improvements - Design Document

**Date:** 2026-02-26
**Status:** Approved
**Implementation Approach:** Sequential by Complexity (3 phases)

## Overview

This document outlines the design for 10 user experience and business feature improvements to BarrioRed, prioritizing user-facing critical features first, then building toward Phase 2 monetization capabilities.

### Features Included

**Phase 1 - Quick Polish (Days 1-2):**
1. Custom 404 error page
2. Custom 500 error page
3. Image loading indicators (minimalist brutalist)
4. Community post sharing (hybrid: Web Share API + WhatsApp)

**Phase 2 - Infrastructure (Days 3-4):**
5. Offline mode (read-only with cached content)
6. Content reporting system (simple report button)

**Phase 3 - Business Features (Days 5-7):**
7. Business deletion requests (soft delete with admin approval)
8. Promotional post type (with rate limiting)
9. Optional business linking for events and jobs

**Excluded:**
- Business approval/rejection notifications (email not configured)

## Design Decisions

### User Experience Priority
Chosen approach prioritizes user-facing improvements first (error handling, loading states, offline support) before business owner tools. This ensures the community platform provides a solid foundation before adding monetization features.

### Neo-Brutalist Brand Consistency
All new components follow the established design system:
- 2-4px black borders
- Hard offset shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`)
- Uppercase labels with `tracking-widest`
- Primary red, secondary yellow, accent blue colors
- No rounded corners (`rounded-none`)

### Progressive Enhancement
Features degrade gracefully:
- Share buttons fallback from Web Share API to manual options
- Offline mode shows cached content when available
- Image loading shows skeleton instead of broken images

## Architecture

### Database Schema Changes

#### New Table: Content Reports
```sql
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

CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);
```

**RLS Policies:**
- Users can insert their own reports
- Only admins/moderators can view and update reports

#### Table Modifications

**businesses table:**
```sql
ALTER TABLE businesses
  ADD COLUMN deletion_requested boolean DEFAULT false,
  ADD COLUMN deletion_reason text,
  ADD COLUMN deletion_requested_at timestamp;

CREATE INDEX idx_businesses_deletion_requested ON businesses(deletion_requested)
  WHERE deletion_requested = true;
```

**community_posts table:**
```sql
-- Extend type constraint to include 'promotion'
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('announcement', 'event', 'job', 'promotion'));

-- Add last_promoted_at for rate limiting
ALTER TABLE community_posts
  ADD COLUMN last_promoted_at timestamp;

CREATE INDEX idx_community_posts_type_promotion ON community_posts(type)
  WHERE type = 'promotion';
```

**Metadata Usage:**
- Event/Job business linking: `metadata.linked_business_id`, `metadata.linked_business_name`
- Promotion details: `metadata.offer_details`, `metadata.valid_until`

### Component Architecture

Following existing patterns:
```
components/
  ui/
    image-loader.tsx          # New: Skeleton loading wrapper
  shared/
    share-button.tsx          # Extend: Add post sharing
    report-button.tsx         # New: Content reporting
    offline-indicator.tsx     # New: Connection status banner
  business/
    deletion-request-button.tsx   # New: Request deletion
  community/
    share-post-button.tsx     # New: Hybrid share for posts
    promotion-card.tsx        # New: Special card for promotions
    promotion-badge.tsx       # New: Visual indicator

app/
  not-found.tsx               # New: Global 404
  error.tsx                   # New: Global 500
  offline/page.tsx            # New: Offline page
  [community]/
    not-found.tsx             # New: Community-specific 404
    dashboard/
      promote/page.tsx        # New: Promotion creation
  admin/
    reports/page.tsx          # New: Content moderation
  api/
    reports/route.ts          # New: Report CRUD
    businesses/[id]/
      request-deletion/route.ts   # New: Deletion request
```

## Phase 1: Quick Polish (Days 1-2, ~8 hours)

### 1.1 Custom Error Pages

**Files:**
- `app/not-found.tsx` - Global 404
- `app/error.tsx` - Global 500
- `app/[community]/not-found.tsx` - Community-specific 404

**Design Pattern:**
```tsx
<div className="min-h-screen flex items-center justify-center p-4">
  <Card className="brutalist-card max-w-md">
    <CardContent className="text-center space-y-6 py-12">
      <h1 className="text-7xl font-heading font-black uppercase italic">
        404
      </h1>
      <p className="text-xl font-bold uppercase tracking-widest">
        Página no encontrada
      </p>
      <Button className="brutalist-button">
        Volver al inicio
      </Button>
    </CardContent>
  </Card>
</div>
```

**Features:**
- Match brutalist design system
- Clear CTAs to navigate back
- 500 page includes retry button
- Community 404 shows community context

**Implementation Time:** ~1 hour

---

### 1.2 Image Loading Indicators

**Component:** `components/ui/image-loader.tsx`

**Strategy:**
- Wrapper component with loading state
- Shows skeleton matching image dimensions
- Minimal animation (subtle pulse)
- Fade-in transition on load

**Skeleton Design:**
```tsx
<div
  className="border-2 border-black animate-pulse bg-background"
  style={{ aspectRatio: width/height }}
/>
```

**Usage Locations:**
1. Business photos (gallery, hero)
2. Community post images
3. User avatars
4. Category icons

**Error State:**
- Shows placeholder icon in bordered box
- Maintains layout consistency

**Implementation Time:** ~3 hours

---

### 1.3 Community Post Sharing

**Component:** `components/community/share-post-button.tsx`

**Hybrid Approach:**
1. **Primary:** Web Share API (mobile native share)
2. **Secondary:** WhatsApp direct button (Colombian market focus)
3. **Fallback:** Copy link button

**Implementation:**
```typescript
async function handleShare() {
  const shareData = { title, text: content, url }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Show fallback buttons
      }
    }
  } else {
    // Show fallback buttons
  }
}
```

**URL Structure:**
- Announcements: `/{community}/community/anuncios/{id}`
- Events: `/{community}/community/eventos/{id}`
- Jobs: `/{community}/community/empleos/{id}`
- Alerts: `/{community}/community#alert-{id}`

**Open Graph Meta Tags:**
Add to each post detail page:
```typescript
export async function generateMetadata({ params }) {
  const post = await fetchPost(params.id)
  return {
    title: post.title,
    description: post.content.slice(0, 160),
    openGraph: {
      images: [post.image_url || defaultOGImage],
      type: 'article',
    }
  }
}
```

**Implementation Time:** ~4 hours

## Phase 2: Infrastructure (Days 3-4, ~13 hours)

### 2.1 Offline Mode (Read-Only)

**Service Worker Updates:** `app/sw.ts`

Add runtime caching strategies:
```typescript
{
  // Cache navigations (HTML pages)
  matcher: ({ request }) => request.mode === 'navigate',
  handler: new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  }),
},
{
  // Cache business/community content pages
  matcher: ({ url }) =>
    url.pathname.includes('/business/') ||
    url.pathname.includes('/community/'),
  handler: new StaleWhileRevalidate({
    cacheName: 'content-pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  }),
}
```

**Offline Indicator:** `components/layout/offline-indicator.tsx`
- Banner at top when offline
- "Modo sin conexión" message
- Add to `app/layout.tsx`

**Offline Page:** `app/offline/page.tsx`
- Brutalist design matching brand
- Shows cached content indicator
- Display last sync time
- "Reconectar" button to retry

**Testing:**
1. Visit pages while online
2. Enable airplane mode
3. Navigate - should see cached pages
4. Verify offline indicator appears
5. Try to submit form - should show "necesitas conexión" message

**Implementation Time:** ~1 day

---

### 2.2 Content Reporting System

**Database Migration:**
See "Database Schema Changes" section above for full SQL.

**Report Button Component:** `components/shared/report-button.tsx`
- Dropdown menu with report reasons
- Shows dialog for "Other" with text input
- Prevents duplicate reports

**Report Reasons:**
- Spam
- Contenido inapropiado
- Información engañosa
- Otro... (opens dialog)

**Admin Panel:** `app/admin/reports/page.tsx`
- Table view with filters (status, content type)
- Shows: Reporter, Content Type, Reason, Date
- Actions: View Content, Review (mark reviewed), Dismiss
- Link to reported content

**API Route:** `app/api/reports/route.ts`
- POST: Create report
- GET: List reports (admin only)
- PATCH: Update status (admin only)

**Validation:**
- User must be authenticated
- Prevent duplicate reports (same user + content)
- Content must exist

**Where to Add:**
- Business profile page (below share button)
- Community post cards (header menu)
- Alert cards (header menu)

**Implementation Time:** ~5 hours

## Phase 3: Business Features (Days 5-7, ~18 hours)

### 3.1 Business Deletion Requests

**Database Migration:**
```sql
ALTER TABLE businesses
  ADD COLUMN deletion_requested boolean DEFAULT false,
  ADD COLUMN deletion_reason text,
  ADD COLUMN deletion_requested_at timestamp;
```

**Merchant Dashboard:** `app/dashboard/page.tsx`

Add "Danger Zone" card:
```tsx
<Card className="brutalist-card border-red-600">
  <CardHeader>
    <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="mb-4">
      Solicitar la eliminación desactivará tu perfil hasta que
      un administrador revise tu solicitud.
    </p>
    <Button variant="destructive" onClick={openDeleteDialog}>
      Solicitar Eliminación
    </Button>
  </CardContent>
</Card>
```

**Confirmation Dialog:**
- Warning message
- Optional reason textarea
- Confirm/Cancel buttons

**Admin Panel Enhancement:** `app/admin/businesses/page.tsx`
- Add filter: "Solicitudes de eliminación"
- Show deletion reason from owner
- Actions:
  - **Aprobar:** Set `is_active = false`, `deletion_requested = false`
  - **Rechazar:** Set `deletion_requested = false` only

**API Route:** `app/api/businesses/[id]/request-deletion/route.ts`
- Validate owner_id matches user
- Update deletion fields
- Return success message

**Implementation Time:** ~4 hours

---

### 3.2 Optional Business Linking (Events & Jobs)

**Data Model:**
Uses existing `metadata` JSONB field:
```typescript
// Event with business
metadata: {
  date: "2026-03-15",
  location: "Parque Principal",
  linked_business_id: "uuid",
  linked_business_name: "Cafetería El Sol"
}

// Job with business
metadata: {
  category: "mesero",
  contact_method: "whatsapp",
  contact_value: "+573001234567",
  linked_business_id: "uuid",
  linked_business_name: "Restaurante La Esquina"
}
```

**Form Enhancement:**
Update `components/community/event-form.tsx` and `job-form.tsx`:

1. Fetch user's owned businesses on mount
2. Show checkbox: "¿Este evento/empleo es de un negocio?"
3. If checked, show dropdown of owned businesses
4. Store business ID and name in metadata

**Display Enhancement:**
Update `components/community/post-card.tsx`:
```tsx
{post.metadata?.linked_business_id && (
  <Badge className="bg-accent border-2 border-black">
    <Building className="h-3 w-3 mr-1" />
    {post.metadata.linked_business_name}
  </Badge>
)}
```

**Business Profile Enhancement:**
Add sections to `app/[community]/business/[slug]/page.tsx`:
- "Eventos de este Negocio" (if any)
- "Ofertas de Empleo" (if any)
- Query posts where `metadata->>'linked_business_id' = business.id`

**Implementation Time:** ~6 hours

---

### 3.3 Promotional Post Type

**Database Migration:**
```sql
-- Extend type constraint
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('announcement', 'event', 'job', 'promotion'));

-- Add rate limiting field
ALTER TABLE community_posts
  ADD COLUMN last_promoted_at timestamp;
```

**Type Definitions:**
```typescript
export type PostType = 'announcement' | 'event' | 'job' | 'promotion'

export type PromotionMetadata = {
  linked_business_id: string
  linked_business_name: string
  offer_details?: string
  valid_until?: string
}
```

**Merchant Dashboard Widget:** `app/dashboard/page.tsx`
```tsx
<Card className="brutalist-card border-secondary bg-secondary/5">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Megaphone />
      Promocionar mi Negocio
    </CardTitle>
  </CardHeader>
  <CardContent>
    {canPromote ? (
      <Button href="/dashboard/promote">
        Crear Promoción
      </Button>
    ) : (
      <p>Ya creaste una promoción esta semana.
         Próxima: {nextPromotionDate}</p>
    )}
  </CardContent>
</Card>
```

**Rate Limiting Logic:**
```typescript
async function canCreatePromotion(businessId: string): Promise<boolean> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data } = await supabase
    .from('community_posts')
    .select('id')
    .eq('type', 'promotion')
    .eq('metadata->>linked_business_id', businessId)
    .gte('created_at', oneWeekAgo.toISOString())
    .limit(1)

  return !data || data.length === 0
}
```

**Promotion Creation Page:** `app/[community]/dashboard/promote/page.tsx`
- Form fields: Title, Details, Image (optional), Valid Until (optional)
- Auto-link to business (from owner_id)
- Submit creates `type: 'promotion'` post with business metadata
- Requires admin approval (follows existing workflow)

**Visual Treatment:**
```tsx
// components/community/promotion-card.tsx
<Card className="brutalist-card border-secondary shadow-[6px_6px_0px_0px_rgb(var(--secondary))]">
  <Badge className="bg-secondary border-2 border-black uppercase font-bold">
    Promoción
  </Badge>
  {/* Card content */}
</Card>
```

**Community Page Section:**
Add to `app/[community]/community/page.tsx`:
```tsx
<PromotionsSection
  posts={promotionPosts}
  communitySlug={slug}
/>
```

**Implementation Time:** ~1 day

## Error Handling

### Client-Side
- Error boundaries around critical sections (image galleries, post lists)
- Graceful offline degradation with toast messages
- Standardized error format in API responses

### Service Worker
- Error event listeners for debugging
- Console logging for development
- Graceful cache failures

### API Routes
Consistent error response structure:
```typescript
return NextResponse.json(
  {
    error: 'Spanish user-friendly message',
    code: 'ERROR_CODE',
    details: isDevelopment ? debugInfo : undefined
  },
  { status: 400 }
)
```

## Testing Strategy

### Phase 1
- Manual testing in Chrome DevTools (offline mode, network throttling)
- Test 404/500 errors in development
- Verify image loading on slow connections
- Test share buttons on mobile + desktop

### Phase 2
- Offline mode: Visit pages → go offline → verify cache works
- Content reporting: Submit as different users, verify admin view
- Test RLS policies (non-admin cannot see reports)

### Phase 3
- Deletion: Request as owner → verify admin sees → test approval/rejection
- Business linking: Create post with link → verify badge → check business profile
- Promotions: Create → verify rate limit → test visual treatment

### Database
```sql
-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id';
-- Run test queries
RESET ROLE;
```

### Performance
- Lighthouse scores (target: >90)
- Bundle size impact (<50KB increase)
- Service worker cache size monitoring
- Image loading impact on LCP

### Browser Compatibility
- Chrome/Edge (primary)
- Firefox
- Safari (iOS - Colombian market focus)
- Web Share API fallback testing

## Rollout Strategy

### Phase 1 → Production
- Deploy immediately
- Monitor error tracking
- Verify no regressions in existing flows

### Phase 2 → Production
- Deploy with monitoring
- Track service worker registration rate
- Test on real devices in Colombia

### Phase 3 → Soft Launch
- Enable for pilot community only (parqueindustrial)
- Beta test with 5-10 business owners
- Gather feedback on promotional feature
- Adjust rate limits if needed
- Roll out to other communities after validation

## Success Metrics

### Phase 1 (Quick Polish)
- ✅ Zero default Next.js error pages seen
- ✅ Image loading skeletons visible (analytics event)
- ✅ Share button usage >10% of post views

### Phase 2 (Infrastructure)
- ✅ >50% returning users with working offline cache
- ✅ >5 content reports in first week
- ✅ <24hr average admin response to reports

### Phase 3 (Business Features)
- ✅ >20% business owners create ≥1 promotion
- ✅ >30% events/jobs linked to businesses
- ✅ <5% deletion request rejection rate
- ✅ Promotion posts get 2x engagement vs announcements

## Next Steps

1. ✅ Design approved
2. ⏭️ Create detailed implementation plan with writing-plans skill
3. ⏭️ Execute Phase 1 (Days 1-2)
4. ⏭️ Execute Phase 2 (Days 3-4)
5. ⏭️ Execute Phase 3 (Days 5-7)
6. ⏭️ Testing and rollout

## Appendix: File Changes Summary

### New Files (17)
- `app/not-found.tsx`
- `app/error.tsx`
- `app/[community]/not-found.tsx`
- `app/offline/page.tsx`
- `app/[community]/dashboard/promote/page.tsx`
- `app/admin/reports/page.tsx`
- `app/api/reports/route.ts`
- `app/api/businesses/[id]/request-deletion/route.ts`
- `components/ui/image-loader.tsx`
- `components/shared/report-button.tsx`
- `components/shared/offline-indicator.tsx`
- `components/business/deletion-request-button.tsx`
- `components/community/share-post-button.tsx`
- `components/community/promotion-card.tsx`
- `components/community/promotion-badge.tsx`
- `components/community/promotions-section.tsx`
- `supabase/migrations/YYYYMMDDHHMMSS_add_content_reports.sql`

### Modified Files (10+)
- `app/sw.ts` - Add offline caching strategies
- `app/layout.tsx` - Add offline indicator
- `app/[community]/community/page.tsx` - Add promotions section
- `app/[community]/business/[slug]/page.tsx` - Add linked events/jobs sections, report button
- `app/dashboard/page.tsx` - Add promotion widget, deletion danger zone
- `app/admin/businesses/page.tsx` - Add deletion requests filter
- `components/community/event-form.tsx` - Add business linking checkbox
- `components/community/job-form.tsx` - Add business linking checkbox
- `components/community/post-card.tsx` - Add business badge, report button
- `components/business/share-button.tsx` - Extend for community posts
- `lib/types/index.ts` - Add PromotionMetadata type, extend PostType
- `lib/types/database.ts` - Regenerate after migrations

### Estimated Total Changes
- **New code:** ~2,500 lines
- **Modified code:** ~500 lines
- **Database migrations:** 2 files
- **Total files touched:** ~27 files

---

**End of Design Document**
