# Admin Panel Enhancements - Design Document

**Date:** 2026-02-27
**Status:** Approved
**Implementation Approach:** Phased by Admin Area

## Overview

Comprehensive enhancement of the BarrioRed admin panel to provide complete administrative control over businesses, users, categories, and platform analytics. Implements a three-tier role system (user/moderator/admin + super_admin) with granular permissions.

## Requirements Summary

### Missing Features (To Implement)
- ✅ Filter businesses by category
- ✅ Search businesses by name
- ✅ Provide rejection reason/feedback
- ✅ Edit any business information from admin
- ✅ Delete any business (hard delete)
- ✅ Change business status
- ✅ Reorder categories (drag-and-drop)
- ✅ View all registered users
- ✅ View user profile details
- ✅ Assign user roles (admin/moderator)
- ✅ Suspend user account
- ✅ Delete user account
- ✅ View platform statistics (comprehensive)
- ✅ Export business data (CSV)

### Already Implemented
- Filter businesses by status (pending/approved/rejected/deletion_requested)
- View business detail in admin panel
- Edit category name and icon
- Delete category
- Approve/Reject business actions

## Architecture Decisions

### 1. Role System: Three-Tier with Super Admin

**Roles:**
- `user` - Regular community members (no admin access)
- `moderator` - Content moderation (approve/reject businesses, manage community posts)
- `admin` - Full community control (all moderator permissions + user management + statistics)
- `super_admin` (via `is_super_admin` boolean) - Platform-wide control across all communities

**Permissions Matrix:**

| Permission | User | Moderator | Admin | Super Admin |
|------------|------|-----------|-------|-------------|
| View Admin Panel | ❌ | ✅ | ✅ | ✅ |
| Approve/Reject Businesses | ❌ | ✅ | ✅ | ✅ |
| Edit Any Business | ❌ | ✅ | ✅ | ✅ |
| Delete Businesses | ❌ | ❌ | ✅ | ✅ |
| Manage Categories | ❌ | ❌ | ✅ | ✅ |
| View Users | ❌ | ✅ (read-only) | ✅ | ✅ |
| Manage Roles | ❌ | ❌ | ✅ | ✅ |
| Suspend Users | ❌ | ❌ | ✅ | ✅ |
| Delete Users | ❌ | ❌ | ✅ | ✅ |
| View Statistics | ❌ | ✅ | ✅ | ✅ |
| Export Data | ❌ | ❌ | ✅ | ✅ |
| Manage Community Content | ❌ | ✅ | ✅ | ✅ |

### 2. Business Rejection Feedback: Predefined + Custom

Dropdown with common reasons:
- "Información incompleta o inexacta"
- "Fotos de baja calidad o inapropiadas"
- "Negocio duplicado"
- "No corresponde a la categoría"
- "Contenido inapropiado"
- "Otro (especificar)"

Plus optional textarea for additional details. Stored in database, visible to business owner.

### 3. Statistics Dashboard: Comprehensive Community Metrics

**Business Metrics:**
- Total businesses (by status: pending/approved/rejected)
- Businesses by category breakdown
- Recent registrations (last 7/30 days)
- Featured businesses count
- Deletion requests

**User Metrics:**
- Total users, new registrations over time
- Users by role (user/moderator/admin)
- Suspended users count

**Community Engagement:**
- Community posts, events, jobs created
- Recent activity (last 7 days)

**Moderation Stats:**
- Total reports, pending reports, resolved reports

### 4. Category Reordering: Drag-and-Drop

Using `@dnd-kit/sortable` library for intuitive drag-and-drop reordering with:
- Visual drag handles
- Instant reorder
- Auto-save on drop
- Neo-brutalist design integration

### 5. CSV Export: Essential Business Data

Export fields:
- Business name, slug, category
- Status, created date, owner name
- Contact info (WhatsApp, phone, email, address)
- Featured status
- Exclude complex fields (photos as URLs only, location coordinates simplified)

### 6. User Suspension: Status Flag with Login Prevention

- Add `is_suspended` boolean to profiles
- Suspended users blocked at auth middleware
- Preserve all data (reversible)
- Suspension reason stored and shown to user
- Dedicated `/suspended` page with reason

## Database Schema Changes

### New Columns - `profiles` Table

```sql
ALTER TABLE profiles
  ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN suspended_at TIMESTAMP,
  ADD COLUMN suspended_by UUID REFERENCES profiles(id),
  ADD COLUMN suspension_reason TEXT;

-- Role constraint
ALTER TABLE profiles
  ADD CONSTRAINT valid_role CHECK (role IN ('user', 'moderator', 'admin'));

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_suspended ON profiles(is_suspended) WHERE is_suspended = TRUE;
```

### New Columns - `businesses` Table

```sql
ALTER TABLE businesses
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN rejection_details TEXT,
  ADD COLUMN rejected_by UUID REFERENCES profiles(id),
  ADD COLUMN rejected_at TIMESTAMP,
  ADD COLUMN last_edited_by UUID REFERENCES profiles(id),
  ADD COLUMN admin_notes TEXT;
```

### Helper Functions

```sql
-- Check if user is moderator or higher
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role IN ('moderator', 'admin'), FALSE) OR COALESCE(is_super_admin, FALSE)
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage users (admin only)
CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role = 'admin', FALSE) OR COALESCE(is_super_admin, FALSE)
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Implementation Phases

### Phase 1: Business Management (Week 1)

**Features:**
- Enhanced filters (category + search by name)
- Rejection feedback system with predefined reasons
- Edit business from admin panel
- Delete business capability (hard delete with photo cleanup)

**Files to Create/Modify:**
- `app/admin/businesses/page.tsx` - Add category filter and search
- `components/admin/rejection-dialog.tsx` - New rejection UI
- `app/admin/businesses/[id]/edit/page.tsx` - New edit page
- `app/api/businesses/[id]/reject/route.ts` - Update with rejection feedback
- `app/api/businesses/[id]/route.ts` - Add PATCH and DELETE

**Key Components:**
- `RejectionDialog` - Predefined reasons + custom details
- Enhanced business list with filters and search
- Edit form reusing registration components

### Phase 2: User Management (Week 1-2)

**Features:**
- User list page with role display and search
- User profile detail view with activity tabs
- Role assignment interface (user/moderator/admin)
- User suspension system
- User deletion (with confirmation)

**Files to Create:**
- `app/admin/users/page.tsx` - User list with filters
- `app/admin/users/[id]/page.tsx` - User detail page
- `components/admin/role-assignment-dialog.tsx` - Role management UI
- `components/admin/suspend-user-dialog.tsx` - Suspension UI
- `components/admin/delete-user-dialog.tsx` - Deletion confirmation
- `app/suspended/page.tsx` - Page shown to suspended users
- `lib/supabase/middleware.ts` - Add suspension check

**Key Features:**
- Search by name/email
- Filter by role
- View user's businesses and posts
- Suspension with reason (reversible)
- Hard delete with cascade warnings

### Phase 3: Analytics & Reporting (Week 2)

**Features:**
- Comprehensive statistics dashboard
- CSV export for businesses

**Files to Create:**
- `app/admin/statistics/page.tsx` - Dashboard with all metrics
- `app/api/admin/export/businesses/route.ts` - CSV generation endpoint
- `components/admin/stat-card.tsx` - Reusable stat display component

**Metrics Displayed:**
- Business stats (total, by status, by category, growth)
- User stats (total, new, by role, suspended)
- Community engagement (posts, events, jobs)
- Moderation stats (reports)

### Phase 4: UX Enhancements (Week 2-3)

**Features:**
- Category drag-and-drop reordering
- Admin navigation updates
- Polish and testing

**Files to Modify:**
- `app/admin/categories/page.tsx` - Full rewrite with drag-and-drop
- `app/admin/layout.tsx` - Add new nav links (Users, Statistics)
- Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Key Features:**
- Sortable category list with drag handles
- Real-time order update
- Visual feedback during drag
- Auto-save on drop

## Authorization Architecture

### Permission Helper (`lib/auth/permissions.ts`)

```typescript
export type UserRole = 'user' | 'moderator' | 'admin'

export interface UserPermissions {
  canViewAdminPanel: boolean
  canApproveBusinesses: boolean
  canRejectBusinesses: boolean
  canEditAnyBusiness: boolean
  canDeleteBusinesses: boolean
  canManageCategories: boolean
  canViewUsers: boolean
  canManageRoles: boolean
  canSuspendUsers: boolean
  canDeleteUsers: boolean
  canViewStatistics: boolean
  canExportData: boolean
  canManageCommunityContent: boolean
}

export function getPermissions(
  role: UserRole | null,
  isSuperAdmin: boolean
): UserPermissions
```

### API Protection Helper (`lib/auth/api-protection.ts`)

```typescript
export async function requirePermission(
  permission: keyof UserPermissions,
  supabase: SupabaseClient
): Promise<{ authorized: true } | { authorized: false; error: Response }>
```

Usage in API routes:
```typescript
const auth = await requirePermission('canApproveBusinesses', supabase)
if (!auth.authorized) return auth.error
```

### Middleware Suspension Check

```typescript
// In lib/supabase/middleware.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('is_suspended')
  .eq('id', user.id)
  .single()

if (profile?.is_suspended) {
  return NextResponse.redirect(new URL('/suspended', req.url))
}
```

## Migration & Backward Compatibility

### Database Migration

```sql
-- File: supabase/migrations/2026-02-27_update_role_system.sql

-- 1. Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
-- ... (other columns)

-- 2. Keep existing admin users as admin
UPDATE profiles SET role = 'admin' WHERE role = 'admin';

-- 3. Set default role for null
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- 4. Add constraints
ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('user', 'moderator', 'admin'));
```

### Files to Audit for Role Checks

**Priority 1 - Critical:**
- `app/admin/layout.tsx` - Update to use `canViewAdminPanel`
- `app/api/businesses/[id]/approve/route.ts` - Use `requirePermission`
- `app/api/businesses/[id]/reject/route.ts` - Use `requirePermission`
- `app/api/community/posts/[id]/approve/route.ts` - Use `requirePermission`
- `app/api/community/posts/[id]/reject/route.ts` - Use `requirePermission`

**Priority 2 - Important:**
- All other API routes in `app/api/`
- Admin page components
- Dashboard/profile pages

**Pattern to replace:**
```typescript
// OLD
if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

// NEW
const auth = await requirePermission('canApproveBusinesses', supabase)
if (!auth.authorized) return auth.error
```

### RLS Policy Updates

```sql
-- Business approval (moderators can approve)
DROP POLICY IF EXISTS "Admins can approve businesses" ON businesses;
CREATE POLICY "Staff can approve businesses" ON businesses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin', 'moderator') OR is_super_admin = TRUE)
    )
  );

-- Category management (admins only)
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR is_super_admin = TRUE)
    )
  );

-- User profile policies
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.is_super_admin = TRUE)
    )
  );

-- Users can view/update own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    -- Prevent self-role-escalation
    (NEW.role = OLD.role OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin' OR is_super_admin = TRUE
    ))
  );
```

## Testing Strategy

### Role-Based Test Scenarios

**Super Admin:**
- ✅ Can access all admin pages
- ✅ Can manage users across all communities
- ✅ Can approve/reject/edit/delete businesses
- ✅ Can manage categories
- ✅ Can suspend/delete users
- ✅ Can view statistics and export data

**Admin (Community-Scoped):**
- ✅ Can access admin panel
- ✅ Can approve/reject/edit/delete businesses in their community
- ✅ Can manage categories
- ✅ Can view/manage users in their community
- ✅ Can assign moderator roles
- ✅ Can suspend users
- ✅ Can view statistics and export data
- ❌ Cannot access other communities

**Moderator:**
- ✅ Can access admin panel
- ✅ Can approve/reject/edit businesses
- ❌ Cannot delete businesses
- ❌ Cannot manage categories
- ✅ Can view users (read-only)
- ❌ Cannot assign roles or suspend users
- ✅ Can view statistics
- ❌ Cannot export data
- ✅ Can manage community content

**User:**
- ❌ Cannot access admin panel (redirects to home)
- ✅ Can access merchant dashboard (own businesses)
- ✅ Can edit own profile
- ✅ Can create community posts
- ❌ Cannot approve/reject content

**Suspended User:**
- ❌ Cannot login (redirects to /suspended)
- ✅ Sees suspension reason
- ❌ Cannot create any content
- ✅ Can logout

### Pre-Deployment Checklist

- [ ] Database migration tested on staging
- [ ] All existing admin pages still accessible
- [ ] Business approval/rejection still works
- [ ] Merchant dashboard unaffected
- [ ] User profile editing unaffected
- [ ] Community content creation works
- [ ] RLS policies prevent unauthorized access
- [ ] Suspension mechanism blocks login
- [ ] Role assignment requires admin permission
- [ ] CSV export generates valid file
- [ ] Statistics dashboard loads without errors
- [ ] Category drag-and-drop saves correctly

## Deployment Strategy

1. **Deploy Database Migration**
   - Run migration script
   - Verify all columns added
   - Check constraints applied
   - Existing users keep current roles

2. **Deploy Backend (API + Auth)**
   - Deploy permission helpers
   - Deploy API protection utilities
   - Update middleware with suspension check
   - Update existing API routes one by one

3. **Deploy Frontend (Pages + Components)**
   - Deploy updated admin layout
   - Deploy new user management pages
   - Deploy statistics dashboard
   - Deploy enhanced business management
   - Deploy category reordering

4. **Test Each Role**
   - Create test accounts for each role
   - Verify permission matrix
   - Check suspension flow
   - Validate statistics accuracy

5. **Monitor & Rollback Plan**
   - Monitor error logs for permission issues
   - Keep old code commented for quick rollback
   - Database changes are additive (safe)
   - Can revert to simple role checks if needed

## Design Consistency (Neo-Brutalist Tropical)

All new components follow BarrioRed brand guidelines:

- **Cards:** `brutalist-card` class (2px border, 4px shadow, hover lift)
- **Buttons:** `brutalist-button` class (2px border, hard shadow, uppercase, bold)
- **Inputs:** `brutalist-input` class (2px black border, hard shadow, focus lift)
- **Typography:** Outfit (headings, black, italic) + Inter (body)
- **Colors:** Primary Red, Secondary Yellow, Accent Blue (oklch)
- **Uppercase labels:** `tracking-widest` for all labels
- **Badges:** Rotated `-2deg` for playful elements
- **Stats:** White bg, thick black border, divided sections

## Success Metrics

**Phase 1 (Business Management):**
- Admins can filter/search businesses in <2 seconds
- Rejection feedback visible to business owners within 1 minute
- Business edits save successfully 100% of the time

**Phase 2 (User Management):**
- User list loads in <3 seconds with 1000+ users
- Role assignment takes <1 second
- Suspended users blocked immediately (next login)

**Phase 3 (Analytics):**
- Statistics dashboard loads in <5 seconds
- CSV export generates file in <10 seconds
- All metrics accurate within 1 minute of real-time

**Phase 4 (UX):**
- Category reorder saves in <500ms
- Drag interaction feels smooth (60fps)
- No layout shift during drag

## Future Enhancements (Post-Implementation)

- Activity logs (audit trail for admin actions)
- Bulk operations (approve multiple businesses at once)
- Advanced filters (date ranges, custom queries)
- Role-based email notifications
- Analytics charts/graphs (time-series)
- User activity heatmaps
- Automated moderation (AI-assisted flagging)

## Conclusion

This design provides a comprehensive, production-ready admin panel that:
- ✅ Addresses all missing features from the requirements
- ✅ Implements a flexible three-tier role system
- ✅ Maintains backward compatibility with existing code
- ✅ Follows BarrioRed's neo-brutalist design language
- ✅ Provides granular permission control
- ✅ Includes comprehensive testing and migration strategy
- ✅ Supports phased rollout with low risk

Implementation will proceed in 4 phases over 2-3 weeks, with each phase independently testable and deployable.
