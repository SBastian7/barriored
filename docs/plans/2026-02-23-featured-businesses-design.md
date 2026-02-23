# Featured Businesses Implementation - Design Document

**Date:** 2026-02-23
**Status:** Approved
**Phase:** Phase 2 - Monetization

## Overview

Implement a featured businesses system that allows super admins to highlight premium businesses on the community homepage. Community admins can nominate businesses for featured status, which super admins review and approve.

## Goals

1. Enable monetization through featured/premium business placement
2. Show featured businesses prominently on homepage (top section)
3. Maintain recent businesses section (below featured, no duplicates)
4. Provide role-based admin workflow (community admins request, super admins approve)
5. Manual ordering control for featured businesses

## User Roles

### Super Admin
- Platform-wide access across all communities
- Can mark any business as featured
- Can set featured display order
- Approves featured requests from community admins
- Profile: `role = 'admin'` AND `is_super_admin = true` AND `community_id = NULL`

### Community Admin (existing)
- Community-scoped access
- Can request featured status for businesses in their community
- Cannot directly mark businesses as featured
- Profile: `role = 'admin'` AND `is_super_admin = false/null` AND `community_id = <uuid>`

### Business Owner / Merchant
- Can edit their own business
- Cannot request or set featured status

## Database Schema Changes

### Migration: `005_add_featured_businesses_and_super_admin.sql`

#### Profiles Table
```sql
ALTER TABLE profiles
ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_super_admin IS
  'Platform-wide admin with full access across all communities';
```

#### Businesses Table
```sql
-- is_featured already exists from migration 004
ALTER TABLE businesses
ADD COLUMN featured_order INTEGER NULL,
ADD COLUMN featured_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN featured_requested_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX idx_businesses_featured_order
  ON businesses(community_id, is_featured, featured_order)
  WHERE is_featured = TRUE AND status = 'approved';

CREATE INDEX idx_businesses_featured_requested
  ON businesses(community_id, featured_requested)
  WHERE featured_requested = TRUE;

COMMENT ON COLUMN businesses.featured_order IS
  'Manual sort order for featured businesses (lower = higher priority)';
COMMENT ON COLUMN businesses.featured_requested IS
  'Community admin requested this business to be featured';
COMMENT ON COLUMN businesses.featured_requested_at IS
  'Timestamp when featured status was requested';
```

## Security Model

### Helper Functions

#### `is_super_admin()`
```sql
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_super_admin = TRUE
  );
$$;
```

#### `can_manage_featured(business_id UUID)`
```sql
CREATE OR REPLACE FUNCTION can_manage_featured(business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM businesses b
      INNER JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = business_id
        AND p.role = 'admin'
        AND p.community_id = b.community_id
        AND p.is_super_admin = FALSE
    );
$$;
```

### RLS Policies

#### Super Admin Full Access
```sql
CREATE POLICY "businesses_update_featured_super_admin"
ON businesses FOR UPDATE
TO public
USING (is_super_admin())
WITH CHECK (is_super_admin());
```

#### Community Admin Request Only
```sql
CREATE POLICY "businesses_update_featured_request_community_admin"
ON businesses FOR UPDATE
TO public
USING (
  is_community_admin(community_id)
  AND NOT is_super_admin()
)
WITH CHECK (
  is_community_admin(community_id)
);
```

**Note:** Application logic will enforce that community admins can only update `featured_requested`, not `is_featured` or `featured_order`.

## Homepage Implementation

### Query Logic

**File:** `app/[community]/page.tsx`

#### Featured Businesses Query
```typescript
const featuredRes = await supabase
  .from('businesses')
  .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
  .eq('community_id', community.id)
  .eq('status', 'approved')
  .eq('is_featured', true)
  .order('featured_order', { ascending: true, nullsFirst: false })
  .limit(3);
```

#### Recent Businesses Query (excluding featured)
```typescript
const featuredIds = featuredRes.data?.map(b => b.id) ?? [];
let recentQuery = supabase
  .from('businesses')
  .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
  .eq('community_id', community.id)
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .limit(3);

if (featuredIds.length > 0) {
  recentQuery = recentQuery.not('id', 'in', `(${featuredIds.join(',')})`);
}

const recentRes = await recentQuery;
```

### Component Structure

**Rename:** `FeaturedBusinesses` → `BusinessSection` (reusable component)

**New Props:**
- `title: string` - Section title ("Destacados" or "Recientes")
- `showBadge: boolean` - Show yellow "DESTACADO" badge on cards
- `businesses: Business[]` - Array of businesses to display
- `communitySlug: string` - For navigation links

**Layout:**
```tsx
<>
  <HeroBanner community={community} businessCount={businessCount} />
  <QuickNav communitySlug={slug} />

  {/* Featured businesses section */}
  {featuredRes.data && featuredRes.data.length > 0 && (
    <BusinessSection
      businesses={featuredRes.data}
      title="Destacados"
      communitySlug={slug}
      showBadge={true}
    />
  )}

  {/* Recent businesses section */}
  {recentRes.data && recentRes.data.length > 0 && (
    <BusinessSection
      businesses={recentRes.data}
      title="Recientes"
      communitySlug={slug}
      showBadge={false}
    />
  )}

  <RegisterCTA communitySlug={slug} />
</>
```

### Visual Design

**Featured Section:**
- Title: "Negocios **Destacados**" (font-heading, uppercase, italic)
- Yellow "DESTACADO" badge rotated -2deg on each card
- Same 3-column grid layout as current design
- Neo-brutalist card styling maintained

**Recent Section:**
- Title: "Negocios **Recientes**"
- No badge
- Same styling as featured (for consistency)

## Admin UI Changes

### File: `app/admin/businesses/[id]/page.tsx`

### Super Admin View

```tsx
{isSuperAdmin && (
  <div className="brutalist-card p-6">
    <h3 className="font-heading font-black uppercase text-lg mb-4">
      Destacar Negocio
    </h3>

    {/* Pending request indicator */}
    {business.featured_requested && (
      <div className="mb-4 p-3 bg-secondary/20 border-2 border-black">
        <p className="text-sm font-bold">
          ⚠️ Solicitud pendiente de destacado
        </p>
        <p className="text-xs text-muted-foreground">
          Solicitado: {formatDate(business.featured_requested_at)}
        </p>
      </div>
    )}

    {/* Featured toggle */}
    <div className="flex items-center gap-3 mb-4">
      <Switch
        checked={isFeatured}
        onCheckedChange={setIsFeatured}
      />
      <Label>Marcar como negocio destacado</Label>
    </div>

    {/* Featured order input */}
    {isFeatured && (
      <div>
        <Label>Orden de visualización</Label>
        <Input
          type="number"
          value={featuredOrder ?? ''}
          onChange={(e) => setFeaturedOrder(Number(e.target.value))}
          placeholder="1, 2, 3... (menor = mayor prioridad)"
          className="brutalist-input"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Números menores aparecen primero en el homepage
        </p>
      </div>
    )}

    <Button onClick={saveFeatured} className="brutalist-button mt-4">
      Guardar cambios
    </Button>
  </div>
)}
```

### Community Admin View

```tsx
{isCommunityAdmin && !isSuperAdmin && (
  <div className="brutalist-card p-6">
    <h3 className="font-heading font-black uppercase text-lg mb-4">
      Solicitar Destacado
    </h3>

    {business.featured_requested ? (
      <div className="p-3 bg-secondary/20 border-2 border-black">
        <p className="text-sm font-bold">✓ Solicitud enviada</p>
        <p className="text-xs text-muted-foreground">
          Pendiente de aprobación por super admin
        </p>
      </div>
    ) : business.is_featured ? (
      <div className="p-3 bg-primary/20 border-2 border-black">
        <p className="text-sm font-bold">★ Negocio destacado</p>
      </div>
    ) : (
      <Button
        onClick={requestFeatured}
        className="brutalist-button"
      >
        Solicitar destacar este negocio
      </Button>
    )}
  </div>
)}
```

## API Routes

### File: `app/api/admin/businesses/[id]/featured/route.ts`

**Endpoint:** `PATCH /api/admin/businesses/[id]/featured`

**Super Admin Actions:**
- Update `is_featured`
- Update `featured_order`
- Clear `featured_requested` when approving

**Community Admin Actions:**
- Set `featured_requested = true`
- Set `featured_requested_at = now()`

**Implementation:**
```typescript
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (profile.is_super_admin) {
    // Super admin: update is_featured and featured_order
    const { data, error } = await supabase
      .from('businesses')
      .update({
        is_featured: body.is_featured,
        featured_order: body.featured_order,
        featured_requested: false,
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({ data, error });
  }

  // Community admin: only request featured
  const { data, error } = await supabase
    .from('businesses')
    .update({
      featured_requested: true,
      featured_requested_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  return NextResponse.json({ data, error });
}
```

## Notifications

**Phase 1 (Current Implementation):**
- Community admin sees success toast: "Solicitud enviada"
- Super admins see badge indicator in admin panel for pending requests
- No email notifications yet

**Future Enhancement:**
- Email notification to super admins when featured is requested
- In-app notification system
- Slack/Discord webhook integration

## TypeScript Types

**Update:** `lib/types/database.ts`

```typescript
// In businesses Row:
is_featured: boolean | null
featured_order: number | null
featured_requested: boolean | null
featured_requested_at: string | null

// In profiles Row:
is_super_admin: boolean | null
```

## Testing Checklist

### Database
- [ ] Migration applies successfully
- [ ] Indexes are created
- [ ] Helper functions work correctly
- [ ] RLS policies enforce permissions

### Homepage
- [ ] Featured section shows up to 3 businesses ordered by featured_order
- [ ] Recent section shows up to 3 businesses by created_at
- [ ] No duplicates between sections
- [ ] Both sections display correctly when empty
- [ ] Badge shows on featured businesses only

### Admin UI - Super Admin
- [ ] Can see featured toggle
- [ ] Can set featured_order
- [ ] Can see pending requests badge
- [ ] Saves correctly via API

### Admin UI - Community Admin
- [ ] Can only see "Request Featured" button
- [ ] Button disabled when request is pending
- [ ] Shows correct status messages
- [ ] Cannot access super admin controls

### Security
- [ ] Community admins cannot directly set is_featured
- [ ] Super admins can access all communities
- [ ] Business owners cannot request featured status
- [ ] RLS policies block unauthorized updates

## Success Metrics

- Featured businesses display prominently on homepage
- Community admins can easily nominate businesses
- Super admins can efficiently manage featured status
- No security vulnerabilities in role-based access
- Performance: homepage loads in < 2 seconds

## Future Enhancements

1. **Analytics Dashboard:** Show view counts for featured businesses
2. **Automated Rotation:** Auto-rotate featured businesses on schedule
3. **Tiered Featured Plans:** Bronze/Silver/Gold featured tiers
4. **Payment Integration:** Automated featured business billing
5. **A/B Testing:** Test different featured layouts
6. **Featured Duration:** Time-limited featured status with auto-expiry

## References

- CLAUDE.md - Project guidelines
- Phase 2 Roadmap - Monetization features
- Neo-Brutalist Tropical Design System
