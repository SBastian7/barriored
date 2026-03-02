# Admin Hub Dashboard - Design Document

**Date:** 2026-03-02
**Status:** Approved
**Implementation Approach:** Modular Server Components

## Overview

### Problem Statement
The admin panel has multiple functional subroutes (`/admin/businesses`, `/admin/users`, `/admin/categories`, etc.) but lacks a central hub at `/admin`, causing:
1. No landing page when accessing admin panel
2. User menu links directly to `/admin/businesses` instead of a dashboard
3. Poor discoverability of admin features
4. No mobile navigation (sidebar hidden on mobile)

### Solution Goals
1. Create comprehensive admin dashboard at `/admin` route
2. Provide at-a-glance platform health metrics
3. Surface pending actions requiring admin attention
4. Enable quick access to common admin tasks
5. Add mobile hamburger menu for full mobile accessibility
6. Update user menu to link to `/admin` hub

### Success Criteria
- Admin users land on an informative dashboard showing platform status
- Pending items (businesses, reports) are immediately visible
- Quick actions reduce clicks to common tasks
- Mobile admins can fully navigate admin panel
- Dashboard loads in <2 seconds with all data

## Architecture Decision: Modular Server Components

**Chosen Approach:** Modular server components with independent data fetching

**Rationale:**
- Clean separation of concerns
- Each section can be developed/tested independently
- Follows Next.js App Router best practices
- Fast initial load with parallel data fetching
- Easy to maintain and extend
- Avoids over-engineering (no real-time updates needed for MVP)

**Alternative Approaches Considered:**
- Single monolithic page (rejected: harder to maintain, sequential fetching)
- Hybrid with real-time updates (rejected: unnecessary complexity for MVP)

## Component Architecture

### Main Page Component
**File:** `app/admin/page.tsx`
- Server component (async)
- Fetches community context
- Orchestrates dashboard sections
- Handles auth/permission checks (admin role required)

### Dashboard Sub-Components (all server components)

#### 1. StatsCards Component
**File:** `components/admin/dashboard/stats-cards.tsx`

**Purpose:** Display 6 key metric cards showing platform health

**Metrics:**
1. Total Businesses (all statuses)
2. Pending Approvals (businesses awaiting review)
3. Total Users (all profiles)
4. New Users (last 7 days)
5. Active Alerts (community alerts with status='active')
6. Total Reports (all reports)

**UI Design:**
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Each card: `.brutalist-card` class with icon, large value, uppercase label
- Icons: lucide-react (Building2, Clock, Users, UserPlus, Bell, Flag)
- Colors: White bg, 2px black border, hard shadow
- Hover: Slight lift effect

#### 2. QuickActions Component
**File:** `components/admin/dashboard/quick-actions.tsx`

**Purpose:** Provide quick access to common admin tasks (Mixed Workflow)

**Actions:**
1. "Revisar Negocios Pendientes" → `/admin/businesses?status=pending`
   - Shows yellow badge with count if pending > 0
2. "Crear Alerta Comunitaria" → `/admin/alerts`
   - Always visible (proactive action)
3. "Gestionar Usuarios" → `/admin/users`
   - Always visible
4. "Ver Reportes" → `/admin/reports`
   - Shows yellow badge with count if pending > 0

**UI Design:**
- Grid layout: `grid-cols-1 md:grid-cols-2 gap-4`
- Large brutalist buttons (h-20 or h-24)
- Layout: Icon (left) + Text (uppercase, bold) + Optional badge (right)
- Badge: Yellow bg, black border, bold count
- Full width with centered content

#### 3. RecentActivity Component
**File:** `components/admin/dashboard/recent-activity.tsx`

**Purpose:** Show recent platform activity for context

**Sections:**
- Left column: Last 5 registered businesses (name, category, date)
- Right column: Last 5 new users (name, role, join date)
- Each entry links to detail page
- "Ver más" link at bottom of each column

**UI Design:**
- Grid: `grid-cols-1 lg:grid-cols-2 gap-6`
- Each section: White bg, 2px black border, hard shadow
- Title: Uppercase, tracking-widest, font-black
- List items: Border-bottom separator, hover bg change
- Date formatting: Relative time ("Hace 2 horas", "Ayer")

#### 4. PendingItemsSummary Component
**File:** `components/admin/dashboard/pending-items-summary.tsx`

**Purpose:** Alert admins to items requiring immediate attention

**Content:**
- Conditional render: Only shows if pending items exist
- Lists: "X negocios pendientes de aprobación", "Y reportes sin resolver"
- Quick links to review each

**UI Design:**
- Yellow background (bg-secondary - Sun Yellow)
- Border: 3px solid black
- Shadow: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Icon: AlertTriangle from lucide-react
- Text: Bold uppercase labels with counts
- Links: Underlined, primary color on hover

## Mobile Navigation Implementation

### Current State
- Admin sidebar only visible on desktop (`hidden lg:block`)
- Mobile users have no way to navigate admin sections

### Solution: Hamburger Menu

**Component:** `components/admin/mobile-nav.tsx` (client component)

**Features:**
- Hamburger icon button (top-left on mobile, hidden on desktop)
- Uses Radix UI Sheet component for slide-out drawer
- Drawer slides in from left with same nav items as desktop sidebar
- Click outside or close button dismisses drawer
- Active route highlighting using `usePathname()`

**Navigation Items:**
- Panel (Dashboard) → `/admin`
- Negocios → `/admin/businesses`
- Usuarios → `/admin/users`
- Categorías → `/admin/categories`
- Alertas → `/admin/alerts`
- Estadísticas → `/admin/statistics`

**UI Design:**
- Button: 2px black border, square (40x40px), Menu icon
- Drawer: Full height, white bg, slides from left
- Nav items: Same styling as desktop sidebar (brutalist buttons)
- Close: X icon (top-right) + click outside to dismiss

### Layout Changes
**File:** `app/admin/layout.tsx`

**Modifications:**
- Add `<MobileNav />` component above main content
- Mobile header bar: Fixed top, hamburger + "Admin Panel" title
- Show on mobile (`lg:hidden`), hide on desktop
- Desktop sidebar remains unchanged

## Data Fetching Strategy

### Database Queries (Supabase)

Each component fetches its own data independently using `createClient()` from `@/lib/supabase/server`.

#### StatsCards Queries

```typescript
// Total businesses count
const { count: totalBusinesses } = await supabase
  .from('businesses')
  .select('*', { count: 'exact', head: true })

// Pending businesses count
const { count: pendingBusinesses } = await supabase
  .from('businesses')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')

// Total users count
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })

// New users last 7 days
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
const { count: newUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', sevenDaysAgo)

// Active alerts count
const { count: activeAlerts } = await supabase
  .from('community_posts')
  .select('*', { count: 'exact', head: true })
  .eq('type', 'alert')
  .eq('status', 'active')

// Total reports count
const { count: totalReports } = await supabase
  .from('reports')
  .select('*', { count: 'exact', head: true })
```

#### RecentActivity Queries

```typescript
// Last 5 businesses
const { data: recentBusinesses } = await supabase
  .from('businesses')
  .select('name, category, created_at, slug')
  .order('created_at', { ascending: false })
  .limit(5)

// Last 5 users
const { data: recentUsers } = await supabase
  .from('profiles')
  .select('full_name, role, created_at, id')
  .order('created_at', { ascending: false })
  .limit(5)
```

#### PendingItems Queries

```typescript
// Pending businesses count (reuse from StatsCards)
// Pending reports count
const { count: pendingReports } = await supabase
  .from('reports')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')
```

### Performance Optimization
- All components render in parallel (React Suspense)
- Use `{ count: 'exact', head: true }` for efficient count queries
- Cache responses with Next.js revalidation (revalidate: 60 seconds)
- No client-side data fetching needed
- Parallel data fetching ensures fast page load

## UI/UX Design (Neo-Brutalist Tropical)

### Page Layout

```
┌─────────────────────────────────────┐
│ [Mobile: Hamburger + Title]         │ (only on mobile)
├─────────────────────────────────────┤
│ PendingItemsSummary (if items exist)│ Yellow banner, alert style
├─────────────────────────────────────┤
│ StatsCards (6 cards, 3x2 grid)      │ Brutalist cards with stats
├─────────────────────────────────────┤
│ QuickActions (4 buttons, 2x2 grid)  │ Large brutalist buttons
├─────────────────────────────────────┤
│ RecentActivity (2 columns)          │ Recent businesses | Recent users
└─────────────────────────────────────┘
```

### Typography & Spacing
- Page title: `text-3xl font-black uppercase tracking-tighter italic` (Outfit)
- Section titles: `text-xl font-black uppercase tracking-widest` (Outfit)
- Body text: Inter font
- Consistent padding: `p-6` for sections, `p-8` for page container
- Gap between sections: `space-y-6`

### Color Palette (oklch)
- Primary Red: `oklch(0.57 0.23 18)` - Buttons, icons, links
- Secondary Yellow: `oklch(0.85 0.17 85)` - Badges, alerts, highlights
- Accent Blue: `oklch(0.5 0.2 260)` - Info elements
- Background: `oklch(0.99 0.01 60)` - Warm paper white
- Borders: Pure black `oklch(0 0 0)` - All brutalist borders

### Brutalist Design Elements
- 2-4px solid black borders on all cards/buttons
- Hard offset shadows: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- No rounded corners (rounded-none)
- Uppercase labels with tracking-widest
- Bold, high-contrast typography
- Hover lift effects: translate-y-[-2px]

## File Structure

### New Files to Create

```
app/admin/
  page.tsx                          # Main admin dashboard page (orchestrator)

components/admin/dashboard/
  stats-cards.tsx                   # 6 key metric cards component
  quick-actions.tsx                 # 4 quick action buttons component
  recent-activity.tsx               # Recent businesses & users lists
  pending-items-summary.tsx         # Yellow alert banner for pending items

components/admin/
  mobile-nav.tsx                    # Mobile hamburger menu + drawer
```

### Files to Modify

```
app/admin/layout.tsx                # Add mobile nav component
components/layout/user-menu.tsx     # Change admin link: /admin/businesses → /admin
```

## Dependencies

No new dependencies required! Using existing:
- Radix UI (Sheet component for drawer - already installed)
- lucide-react (icons)
- Next.js 16 App Router patterns
- Supabase client
- Tailwind CSS

## Out of Scope

The following are NOT included in this implementation:
- Real-time updates via Supabase subscriptions (can be added later if needed)
- Charts/graphs (statistics page already has comprehensive visualizations)
- Filtering/sorting on dashboard (not needed for overview page)
- Export functionality (already exists in individual admin pages)
- Push notification management (separate admin/alerts page handles this)

## Testing Approach

### Manual Testing Checklist
- [ ] Dashboard loads successfully at `/admin` route
- [ ] All stat counts accurately reflect database data
- [ ] Pending items banner shows when items exist, hides when none
- [ ] Quick action buttons navigate to correct routes
- [ ] Quick action badges display correct pending counts
- [ ] Recent activity lists show latest 5 items with correct data
- [ ] Mobile hamburger menu appears on small screens
- [ ] Mobile drawer opens/closes correctly
- [ ] Active route highlighted in both desktop sidebar and mobile drawer
- [ ] User menu links to `/admin` instead of `/admin/businesses`
- [ ] Admin-only access enforced (non-admins redirected)
- [ ] Page loads in <2 seconds with all data
- [ ] All neo-brutalist styling applied correctly

### Auth & Permissions
- Admin role required to access `/admin` route
- Middleware handles auth checks
- Non-authenticated users redirected to `/auth/login`
- Non-admin users see "Access Denied" or redirect to home

## Implementation Notes

### Next.js Patterns
- Use async server components for data fetching
- Implement proper error boundaries
- Add loading states with Suspense fallbacks
- Follow App Router conventions

### Code Quality
- TypeScript strict mode
- Proper type definitions for all data
- Reusable utility functions for date formatting
- Consistent component structure across dashboard components

### Accessibility
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly

## Success Metrics

**Technical:**
- Page load time: <2 seconds
- All queries optimized with proper indexes
- Zero layout shift (CLS = 0)
- Mobile responsive at all breakpoints

**User Experience:**
- Admins can see platform status at a glance
- Pending items immediately visible
- Quick actions reduce navigation clicks by 50%
- Mobile admins have full access to admin features

**Business Impact:**
- Faster admin response to pending approvals
- Better platform health monitoring
- Improved admin workflow efficiency
- Reduced time to complete admin tasks
