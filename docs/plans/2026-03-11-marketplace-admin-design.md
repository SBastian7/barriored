# Marketplace Admin Panel - Design Document

**Date:** 2026-03-11
**Author:** Claude Code
**Status:** Approved
**Phase:** Phase 4 - Marketplace (Clasificados)

## Executive Summary

This document outlines the design for marketplace admin moderation features, enabling community admins to manage classifieds within BarrioRed's multi-tenant platform. The design follows existing patterns from community and business moderation while introducing marketplace-specific features.

## Requirements Summary

Admin users must be able to:
- ✅ Access classifieds moderation panel
- ✅ View all classifieds in their community
- ✅ Filter classifieds by status (active/sold/flagged/archived)
- ✅ View classified detail in admin panel
- ✅ Edit any classified
- ✅ Delete any classified (soft delete)
- ✅ Flag inappropriate classifieds
- ✅ Remove flagged classifieds
- ✅ View classified reports
- ✅ Ban users from marketplace
- ✅ Export classifieds data (CSV)

## Key Design Decisions

### 1. Categories
**Decision:** Create new marketplace-specific categories (not reuse business categories)
**Rationale:** Categories like "Vendo", "Compro", "Arriendo", "Servicios", "Trabajo" are more intuitive for classifieds context than business categories.

### 2. Lifecycle
**Decision:** Hybrid auto-archive model
- Auto-archive after 60 days of inactivity
- Users can manually mark as "Sold"
- Users can reactivate archived listings
**Rationale:** Keeps marketplace fresh while giving users control.

### 3. Pricing
**Decision:** Free marketplace with optional price field
**Rationale:** Aligns with BarrioRed's accessible mission. Monetization via featured listings comes in Phase 2.

### 4. Images
**Decision:** Up to 5 images per classified (optional)
**Rationale:** Matches business registration pattern, enables code reuse.

### 5. Community Scoping
**Decision:** Strict community isolation
**Rationale:** Maintains hyperlocal focus and architectural consistency with businesses/posts.

### 6. Moderation
**Decision:** Auto-publish with post-moderation
**Rationale:** Encourages marketplace velocity. Admins moderate reactively via reports rather than pre-approving everything.

### 7. Contact Method
**Decision:** WhatsApp only
**Rationale:** Consistent with platform's WhatsApp-first approach.

### 8. Implementation Approach
**Decision:** Dedicated marketplace admin panel (not unified content dashboard)
**Rationale:** Clear separation of concerns, follows proven patterns, easier to extend.

---

## Database Schema

### New Tables

#### `marketplace_categories`
Marketplace-specific categories for classifieds.

```sql
CREATE TABLE marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed Data:**
- Vendo (slug: vendo, icon: ShoppingCart)
- Compro (slug: compro, icon: ShoppingBag)
- Arriendo (slug: arriendo, icon: Home)
- Servicios (slug: servicios, icon: Wrench)
- Trabajo (slug: trabajo, icon: Briefcase)

#### `classifieds`
Main marketplace listings table.

```sql
CREATE TABLE classifieds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT, -- Optional, can be "Negociable", "Gratis", or numeric
  images TEXT[], -- Array of Supabase storage URLs (max 5)
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES profiles(id),
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_classifieds_community_status ON classifieds(community_id, status);
CREATE INDEX idx_classifieds_user ON classifieds(user_id);
CREATE INDEX idx_classifieds_category ON classifieds(category_id);
CREATE INDEX idx_classifieds_activity ON classifieds(last_activity_at);
```

#### `marketplace_user_bans`
Track users banned from marketplace.

```sql
CREATE TABLE marketplace_user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent ban
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_marketplace_bans_user ON marketplace_user_bans(user_id, is_active);
```

### Reused Tables

- **`content_reports`** - Extend to support `reported_entity_type = 'classified'`
- **`audit_logs`** - Track all admin actions on classifieds
- **`profiles`** - User ownership and admin permissions

### RLS Policies

**Users:**
- View active/sold classifieds in their community only
- Create classifieds if not banned
- Update/delete only their own classifieds

**Community Admins:**
- View all classifieds in their community (any status)
- Update any classified in their community
- Delete any classified in their community

**Moderators:**
- View all classifieds in their community
- Flag classifieds
- Cannot edit/delete or ban users

**Super Admins:**
- Full access to all classifieds across all communities

---

## Admin UI Architecture

### Page Structure

#### 1. `/app/admin/marketplace/page.tsx`
Main marketplace moderation dashboard.

**Components:**
- **Stats Strip** (brutalist divided sections):
  - Active listings count
  - Sold this week
  - Flagged listings (needs attention)
  - Banned users count

- **Filter Controls**:
  - Category dropdown (all, vendo, compro, arriendo, servicios, trabajo)
  - Status dropdown (all, active, sold, archived, flagged, removed)
  - Community dropdown (super admin only)
  - Date range filter (7/30/90 days, all time)
  - "Clear Filters" button
  - Results count: "Mostrando X de Y clasificados"

- **Listings Grid** (brutalist cards):
  - Thumbnail image
  - Title, price, category badge
  - User info (name, date posted)
  - Status badge with colors
  - Quick actions: Ver Detalle, Marcar Vendido, Archivar, Eliminar
  - Flagged items have red border

#### 2. `/app/admin/marketplace/[id]/page.tsx`
Individual classified detail and edit page.

**Sections:**
- **Classified Preview**:
  - Full image gallery
  - Title, description, price, category
  - WhatsApp contact button
  - User profile link
  - Posted date, last activity, status

- **Admin Action Panel** (right sidebar):
  - Status change dropdown
  - Flag/unflag with reason input
  - Edit button (toggles edit mode)
  - Delete with confirmation dialog
  - Ban user button
  - View reports link (if any exist)
  - Activity log (status changes, edits)

- **Edit Mode** (inline form):
  - Editable title, description, price
  - Image management (add/remove/reorder)
  - Category selector
  - WhatsApp input
  - Save/Cancel buttons

#### 3. `/app/admin/marketplace/banned-users/page.tsx`
Banned users management (future enhancement).

**Features:**
- List banned users with details
- Unban button
- View banned user's removed classifieds

### Component Reuse

**Existing Components:**
- `<Card>`, `<CardContent>` - Listing cards
- `<Select>` - Filter dropdowns
- `<Badge>` - Status badges
- `<Button>` - All actions (brutalist-button class)
- Brutalist design utilities (borders, shadows, uppercase)

**New Components:**
- `<ClassifiedCard>` - Reusable classified preview card
- `<ClassifiedStatusBadge>` - Color-coded status badges
- `<MarketplaceFilters>` - Filter controls section

### Navigation Integration

Add to admin sidebar (`components/admin/collapsible-sidebar.tsx`):

```typescript
{
  href: '/admin/marketplace',
  label: 'Marketplace',
  icon: ShoppingBag
}
```

Position after "Services" in navigation order.

---

## API Routes

### 1. `/app/api/admin/marketplace/route.ts`

**GET** - List all classifieds with filters
- **Query params:** `community_id`, `category`, `status`, `search`, `limit`, `offset`
- **Returns:** Classified list with user, category, community joins
- **Permission:** Admin or super admin only
- **Logic:** Auto-filters by admin's community unless super admin

**Example response:**
```json
{
  "classifieds": [
    {
      "id": "uuid",
      "title": "Vendo bicicleta de montaña",
      "price": "$200,000",
      "status": "active",
      "category": { "name": "Vendo", "slug": "vendo" },
      "user": { "full_name": "Juan Pérez" },
      "community": { "name": "Parque Industrial" },
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### 2. `/app/api/admin/marketplace/[id]/route.ts`

**GET** - Get single classified detail
- **Returns:** Full classified with user, reports, activity log
- **Permission:** Admin in same community or super admin

**PATCH** - Update classified
- **Body:** `{ status?, title?, description?, price?, category_id?, whatsapp?, images? }`
- **Validations:** Check admin permissions, validate fields
- **Side effects:** Log to `audit_logs`, update `updated_at`

**DELETE** - Remove classified (soft delete)
- **Logic:** Set `status = 'removed'`
- **Side effects:** Log to `audit_logs`, notify user (future)

### 3. `/app/api/admin/marketplace/[id]/flag/route.ts`

**POST** - Flag classified
- **Body:** `{ reason }`
- **Logic:** Set `status = 'flagged'`, populate flag fields
- **Side effects:** Create `content_reports` entry, log action

**DELETE** - Remove flag
- **Logic:** Revert status to previous state (usually 'active')
- **Side effects:** Clear flag fields, log action

### 4. `/app/api/admin/marketplace/[id]/ban-user/route.ts`

**POST** - Ban user from marketplace
- **Body:** `{ reason, expires_at }` (expires_at nullable = permanent)
- **Logic:**
  - Insert into `marketplace_user_bans`
  - Set all user's classifieds to `removed`
- **Side effects:** Log each removal, show confirmation of X classifieds removed

### 5. `/app/api/admin/marketplace/export/route.ts`

**GET** - Export classifieds to CSV
- **Query params:** Same filters as list endpoint
- **Returns:** CSV file download
- **Permission:** Admin or super admin
- **Columns:** title, category, price, status, user, dates

---

## Data Flow Patterns

### Listing Classifieds
```
Admin page → GET /api/admin/marketplace?status=active&category=vendo
  ↓
  Verify user is admin/super_admin
  ↓
  Query classifieds with RLS (auto-filters by community unless super admin)
  ↓
  Join with profiles, categories, communities
  ↓
  Apply filters (status, category, search)
  ↓
  Paginate results (limit 20)
  ↓
  Return JSON with classifieds array + total count
```

### Updating Status
```
Admin clicks "Marcar como Vendido" → PATCH /api/admin/marketplace/[id]
  ↓
  Verify admin has permission for this community
  ↓
  Update: status = 'sold', sold_at = NOW()
  ↓
  Insert audit_log: { action: 'update', old_data, new_data }
  ↓
  Return updated classified
  ↓
  UI shows toast: "Clasificado marcado como vendido"
  ↓
  Refresh listing
```

### Banning User
```
Admin clicks "Suspender Usuario" → POST /api/admin/marketplace/[id]/ban-user
  ↓
  Show confirmation: "También se eliminarán X clasificados activos"
  ↓
  Verify admin permissions
  ↓
  Insert into marketplace_user_bans
  ↓
  Query all user's active classifieds
  ↓
  Update each to status = 'removed'
  ↓
  Log each removal to audit_logs
  ↓
  Return success with count
  ↓
  Toast: "Usuario suspendido. X clasificados eliminados."
```

### Auto-Archive Background Job

**Recommended: Database Trigger**
```sql
CREATE OR REPLACE FUNCTION auto_archive_old_classifieds()
RETURNS void AS $$
BEGIN
  UPDATE classifieds
  SET status = 'archived', archived_at = NOW()
  WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via Supabase cron or pg_cron
SELECT cron.schedule(
  'auto-archive-classifieds',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT auto_archive_old_classifieds()'
);
```

---

## Permissions & Security

### Role-Based Access Matrix

| Action | Regular User | Moderator | Community Admin | Super Admin |
|--------|-------------|-----------|-----------------|-------------|
| View own classifieds | ✅ | ✅ | ✅ | ✅ |
| View all (own community) | ❌ | ✅ | ✅ | ✅ |
| View all (all communities) | ❌ | ❌ | ❌ | ✅ |
| Edit any classified | ❌ | ❌ | ✅ | ✅ |
| Delete any classified | ❌ | ❌ | ✅ | ✅ |
| Flag classified | ✅ | ✅ | ✅ | ✅ |
| Remove flagged | ❌ | ❌ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ✅ | ✅ |
| Export data | ❌ | ❌ | ✅ | ✅ |
| Access `/admin/marketplace` | ❌ | ❌ | ✅ | ✅ |

### Validation Rules

**Client-side:**
- Title: 10-100 characters required
- Description: 20-1000 characters required
- WhatsApp: Valid phone format (Colombian number)
- Images: Max 5, each under 5MB, valid formats (jpg, png, webp)
- Price: Optional, alphanumeric + spaces allowed

**Server-side:**
- Same validations as client
- Check user not banned before allowing create/update
- Verify admin has permission for community
- Sanitize HTML in description
- Validate image URLs are from Supabase storage

### Error Responses

```typescript
// Unauthorized
{ error: 'No tienes permisos para realizar esta acción', code: 403 }

// Banned user
{ error: 'Estás suspendido del marketplace', code: 403 }

// Not found
{ error: 'Clasificado no encontrado', code: 404 }

// Community mismatch
{ error: 'No puedes moderar clasificados de otra comunidad', code: 403 }

// Validation
{ error: 'Título requerido (10-100 caracteres)', code: 400 }
```

### Audit Logging

All admin actions logged to `audit_logs`:
```typescript
{
  community_id: 'uuid',
  user_id: 'admin-uuid',
  action: 'update_classified',
  entity_type: 'classified',
  entity_id: 'classified-uuid',
  old_data: { status: 'active' },
  new_data: { status: 'sold' },
  metadata: { admin_role: 'admin' },
  created_at: '2026-03-11T...'
}
```

---

## Edge Cases & Handling

### 1. User tries to create while banned
- Check `marketplace_user_bans` on create
- Return 403: "Tu cuenta está suspendida del marketplace hasta [date]"
- Show reason if provided

### 2. Classified about to be archived
- Show warning if `last_activity_at` > 55 days
- "Este clasificado será archivado en X días"
- Allow "bump" (update last_activity_at) to keep active

### 3. Concurrent admin edits
- Use optimistic locking with `updated_at`
- If `updated_at` changed since page load:
  - Show error: "Modificado por otro admin"
  - Refresh and show current state

### 4. Multiple reports on same classified
- Group reports by `reported_entity_id`
- Show count badge: "3 reportes"
- Link to view all reports
- Resolve all when admin takes action

### 5. Banning user with active classifieds
- Query count before showing confirmation
- "También se eliminarán X clasificados activos"
- Automatically remove all on confirmation
- Log each removal individually

### 6. Super admin cross-community management
- Always display community name in listings
- Require community filter selection
- Show confirmation for cross-community actions

---

## Performance Optimizations

### Database Indexing
```sql
CREATE INDEX idx_classifieds_community_status ON classifieds(community_id, status);
CREATE INDEX idx_classifieds_user ON classifieds(user_id);
CREATE INDEX idx_classifieds_category ON classifieds(category_id);
CREATE INDEX idx_classifieds_activity ON classifieds(last_activity_at);
CREATE INDEX idx_marketplace_bans_user ON marketplace_user_bans(user_id, is_active);
```

### Pagination
- Default 20 items per page
- Use offset/limit pattern
- Include total count for pagination UI
- Consider cursor-based pagination for very large datasets

### Image Optimization
- Generate 200x200 thumbnails for grid view
- Lazy load images below fold
- Use Next.js Image component with optimization
- Serve from CDN (Supabase Storage)

---

## Migration Strategy

### Phase 1: Database Setup (Day 1)
1. Create migration: `20260311_create_marketplace_tables.sql`
2. Add tables: `marketplace_categories`, `classifieds`, `marketplace_user_bans`
3. Add RLS policies
4. Add indexes
5. Seed default categories

### Phase 2: API Layer (Day 2)
1. Create API routes under `/app/api/admin/marketplace/`
2. Implement CRUD operations
3. Add validation and error handling
4. Add audit logging

### Phase 3: Admin UI (Day 3-4)
1. Add sidebar navigation item
2. Create main listing page with filters
3. Create detail/edit page
4. Add components (ClassifiedCard, filters, etc.)
5. Integrate with API

### Phase 4: Testing (Day 5)
1. Create test data (10-20 sample classifieds)
2. Test all admin actions
3. Verify RLS policies work
4. Test edge cases
5. Performance testing

### Phase 5: Documentation & Deployment
1. Update CLAUDE.md
2. Create admin user guide
3. Deploy to staging
4. User acceptance testing
5. Production deployment

---

## Future Enhancements (Out of Scope)

### Phase 2: Monetization
- Payment integration for featured listings
- `is_featured` flag usage
- Featured badge and placement
- Admin dashboard for revenue tracking

### Phase 3: Analytics
- View counts per classified
- Click-through rate to WhatsApp
- Popular categories analytics
- User engagement metrics

### Phase 4: Auto-Moderation
- Keyword filtering (profanity, scams)
- Duplicate listing detection
- Price anomaly detection
- Image content moderation

### Phase 5: Notifications
- Email/push when classified flagged
- Notify user when banned/unbanned
- Weekly admin digest
- Expiration reminders

---

## Success Metrics

### MVP Success Criteria
- ✅ Admins can view all classifieds in their community
- ✅ Admins can filter by status, category, date
- ✅ Admins can edit/delete any classified
- ✅ Admins can ban users from marketplace
- ✅ All actions logged to audit trail
- ✅ RLS policies prevent unauthorized access
- ✅ Export functionality works

### Performance Targets
- Dashboard loads in < 2 seconds with 100 classifieds
- Filter/search responds in < 500ms
- Image thumbnails load progressively
- No N+1 query problems

### Quality Targets
- Zero security vulnerabilities (unauthorized access)
- TypeScript: No `any` types
- All admin actions logged
- Error messages in Spanish, user-friendly

---

## Conclusion

This design provides a comprehensive marketplace admin moderation system that:
1. Follows BarrioRed's existing architectural patterns
2. Maintains multi-tenant community isolation
3. Provides all required admin capabilities
4. Sets foundation for future monetization
5. Balances marketplace velocity with quality control

The auto-publish + post-moderation approach encourages marketplace growth while maintaining community standards through reactive moderation and user reporting.

---

**Next Steps:** Proceed to implementation planning phase using writing-plans skill.
