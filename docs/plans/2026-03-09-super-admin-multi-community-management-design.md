# Super Admin Multi-Community Management - Design Document

**Date:** 2026-03-09
**Status:** Approved
**Author:** Claude Code (via brainstorming skill)

## Overview

Implement super admin capabilities for managing multiple communities in the BarrioRed platform. This includes editing community information, defining geographic boundaries with polygon drawing, and managing community staff (admins/moderators).

## Problem Statement

Currently:
- Super admins can view communities but `/admin/communities/[id]/edit` returns 404
- No way to define community boundaries geographically
- Staff assignment UI exists but is not functional
- Business registration has no geographic validation against community boundaries

## Requirements Summary

1. **Edit community information** - Basic details (name, location, description, logo)
2. **Set community boundaries** - Define precise geographic polygon boundaries on map
3. **Manage staff** - Assign/remove admins and moderators for each community
4. **Validate businesses** - Enforce that businesses are within community boundaries
5. **Public boundary display** - Show boundaries on demand via toggle button

## Design Decisions

### 1. Boundary Approach
**Decision:** Precise polygon boundaries using PostGIS
**Alternatives considered:**
- Center point + radius (too simplistic)
- Text-based zones (no validation capability)
- MultiPolygon support (unnecessary complexity)

**Rationale:** Supabase includes PostGIS by default. Single polygon provides accurate boundaries for typical contiguous neighborhoods while enabling efficient spatial validation queries.

### 2. Staff Management
**Decision:** Search and assign existing users via modal
**Alternatives considered:**
- Email invitations (requires invitation system)
- Manual ID entry (poor UX)
- Both search + invite (over-engineering)

**Rationale:** Users already exist in the system (business owners, community members). Searching by name/email is intuitive and covers the primary use case.

### 3. Edit Page Structure
**Decision:** All-in-one tabbed edit page
**Alternatives considered:**
- Separate dedicated pages per section (more navigation)
- Modal-based editing (less space for complex tools like map)

**Rationale:** Tabbed interface provides focused sections while keeping everything accessible from one page. Suits admin workflow of making multiple related changes.

### 4. Boundary Validation
**Decision:** Strict validation with dual client+server checks
**Alternatives considered:**
- Warning only (allows bad data)
- No validation (boundaries purely informational)

**Rationale:** Data quality is critical. Client-side gives instant feedback, server-side prevents manipulation. Admins can still override during approval for edge cases.

### 5. Boundary Migration Strategy
**Decision:** Required for new communities, optional for existing
**Alternatives considered:**
- Required for all (disrupts existing operations)
- Optional for all (no incentive to complete)

**Rationale:** Allows smooth migration without blocking existing communities like Parque Industrial while ensuring new communities are complete.

---

## Technical Architecture

### Database Schema Changes

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add boundary column to communities table
ALTER TABLE communities
ADD COLUMN boundary GEOMETRY(Polygon, 4326);

-- Add spatial index for efficient point-in-polygon queries
CREATE INDEX idx_communities_boundary
ON communities USING GIST (boundary);

-- Helper function for boundary validation
CREATE OR REPLACE FUNCTION is_location_in_community_boundary(
  community_uuid UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_uuid
    AND boundary IS NOT NULL
    AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  );
END;
$$ LANGUAGE plpgsql;
```

**Key points:**
- `boundary` is nullable (existing communities without boundaries can operate)
- SRID 4326 (WGS 84) standard for lat/lng coordinates
- Spatial index for performance
- Helper function simplifies validation calls

### TypeScript Type Updates

```typescript
// lib/types/database.ts
export interface Community {
  id: string
  name: string
  slug: string
  municipality: string
  department: string
  description: string | null
  logo_url: string | null
  primary_color: string
  is_active: boolean
  boundary: GeoJSON.Polygon | null  // New field
  created_at: string
}
```

---

## Component Architecture

### Route: `/admin/communities/[id]/edit`

```
app/admin/communities/[id]/edit/page.tsx (Server Component)
├── Authentication & super admin check
├── Fetch community data
└── <CommunityEditPage communityId={id} initialData={community} />
    └── <Tabs> (Radix UI)
        ├── Tab: "Información"
        │   └── <CommunityForm mode="edit" initialData={...} />
        │       └── (Reuse existing component, no changes needed)
        │
        ├── Tab: "Límites"
        │   └── <BoundaryEditor
        │           communityId={id}
        │           communityName={name}
        │           municipality={municipality}
        │           department={department}
        │           initialBoundary={boundary}
        │       />
        │       ├── Leaflet map with drawing tools
        │       ├── Polygon editor (draw, edit, delete)
        │       ├── Existing businesses overlay
        │       └── Save button
        │
        └── Tab: "Configuración"
            └── <SettingsPanel communityId={id} initialSettings={...} />
                ├── Active/Inactive toggle
                ├── Primary color picker
                └── Logo URL input
```

### New Components

#### 1. BoundaryEditor Component

**File:** `components/admin/boundary-editor.tsx`

**Props:**
```typescript
interface BoundaryEditorProps {
  communityId: string
  communityName: string
  municipality: string
  department: string
  initialBoundary: GeoJSON.Polygon | null
}
```

**Features:**
- Leaflet map with OpenStreetMap tiles
- Leaflet.draw plugin for polygon drawing
- Auto-center on municipality using Nominatim geocoding API
- Show existing businesses as markers (visual reference)
- Real-time vertex count and area display
- Single polygon enforcement (new drawing deletes old)
- Save converts Leaflet polygon → GeoJSON → API

**Drawing controls:**
- Polygon tool (draw new boundary)
- Edit tool (move vertices)
- Delete tool (remove boundary)
- Clear instructions in Spanish

**Validation:**
- Minimum 3 vertices
- Polygon must be closed
- No self-intersections

**Visual style:**
- Stroke: red (#E53E3E), 3px width
- Fill: transparent
- Editable vertices: white circles with black border

#### 2. AssignStaffModal Component

**File:** `components/admin/assign-staff-modal.tsx`

**Props:**
```typescript
interface AssignStaffModalProps {
  communityId: string
  onSuccess: () => void
}
```

**Features:**
- Search input with 300ms debounce
- Real-time user search (name, email)
- Results list: avatar + name + email + current role badge
- Gray out users already assigned to this community
- Role selector: Admin / Moderador (radio buttons)
- Role descriptions:
  - Admin: "Control total de la comunidad"
  - Moderador: "Gestión de contenido solamente"
- Assign button triggers API call
- Success closes modal and refreshes staff list

**Search behavior:**
- Minimum 2 characters to trigger search
- Case-insensitive partial match
- Max 20 results displayed
- Scrollable list if more results

#### 3. EditStaffModal Component

**File:** `components/admin/edit-staff-modal.tsx`

**Props:**
```typescript
interface EditStaffModalProps {
  communityId: string
  staffMember: {
    id: string
    full_name: string
    avatar_url: string | null
    role: 'admin' | 'moderator'
  }
  onSuccess: () => void
}
```

**Features:**
- Display user info (read-only)
- Role switcher: Admin ↔ Moderador
- "Guardar Cambios" button (updates role)
- "Remover del Staff" button (destructive, red)
  - Confirmation dialog: "¿Remover a [name] del staff?"
  - Resets user to 'user' role and clears community_id

#### 4. SettingsPanel Component

**File:** `components/admin/settings-panel.tsx`

**Props:**
```typescript
interface SettingsPanelProps {
  communityId: string
  initialSettings: {
    is_active: boolean
    primary_color: string
    logo_url: string | null
  }
}
```

**Features:**
- Active/Inactive toggle switch
- Primary color input (text field with color preview)
- Logo URL input
- Individual save buttons per section
- Success toasts on save

---

## API Changes

### Update: `PATCH /api/admin/communities/[id]`

**Additional accepted field:**
```typescript
{
  boundary?: GeoJSON.Polygon | null
}
```

**Processing:**
- Convert GeoJSON Polygon to PostGIS geometry
- Use Supabase to update the record
- Return updated community with boundary

### Update: `POST /api/admin/communities/[id]/staff`

**Current implementation:**
```typescript
{
  user_id: string
  role: 'admin' | 'moderator'
}
```

**Enhancement needed:**
- Add validation that user exists
- Check user isn't already assigned to this community
- Return meaningful error messages

### Update: `DELETE /api/admin/communities/[id]/staff`

**Current implementation:**
```typescript
?user_id=string
```

**No changes needed** - already functional.

---

## Business Registration Validation

### Client-Side (Registration Form)

**Location:** `app/[community]/register/page.tsx` - Location step

**Changes:**
1. Load community boundary when page loads
2. Display boundary overlay on map (semi-transparent red)
3. When user places pin, validate using `turf.js`:
   ```typescript
   import { booleanPointInPolygon, point, polygon } from '@turf/turf'

   const isInside = booleanPointInPolygon(
     point([lng, lat]),
     polygon(community.boundary.coordinates)
   )
   ```
4. Show validation feedback:
   - ✅ "Ubicación válida" (green) if inside
   - ❌ "Esta ubicación está fuera de los límites de [community name]" (red) if outside
5. Disable "Siguiente" button if outside boundary

**Benefits:**
- Instant feedback without server round-trip
- Visual explanation with boundary overlay
- User can adjust pin location immediately

### Server-Side (Business API)

**Location:** `app/api/businesses/route.ts` - POST handler

**Changes:**
1. After other validations, check community boundary:
   ```typescript
   // Check if community has boundary defined
   const { data: community } = await supabase
     .from('communities')
     .select('boundary')
     .eq('id', community_id)
     .single()

   if (community?.boundary) {
     // Validate location is within boundary
     const { data: isInside } = await supabase.rpc(
       'is_location_in_community_boundary',
       {
         community_uuid: community_id,
         lat: location.coordinates[1],
         lng: location.coordinates[0]
       }
     )

     if (!isInside) {
       return NextResponse.json(
         {
           error: 'La ubicación está fuera de los límites de la comunidad',
           code: 'LOCATION_OUTSIDE_BOUNDARY'
         },
         { status: 400 }
       )
     }
   }
   ```

2. If no boundary exists (null), skip validation (backward compatibility)

**Benefits:**
- Authoritative validation (can't be bypassed)
- Prevents API manipulation
- Graceful handling of communities without boundaries

### Admin Business Approval Enhancement

**Location:** `app/admin/businesses/page.tsx`

**Changes:**
1. For each pending business, check if location is within community boundary
2. If outside, show warning badge: "⚠️ Fuera de límites" (yellow)
3. Admin can still approve (for edge cases, appeals)
4. Just a visual indicator, not a blocker

**Benefits:**
- Admins can catch businesses outside boundaries
- Flexibility for legitimate edge cases
- Clear visual warning

---

## Public Map Boundary Display

### Toggle Button Component

**Locations to add:**
- `app/[community]/page.tsx` - Homepage hero map
- `app/[community]/map/page.tsx` - Full map view

**Implementation:**
```tsx
const [showBoundary, setShowBoundary] = useState(false)

<Button
  variant="outline"
  size="sm"
  className="brutalist-button absolute top-4 right-4 z-[1000]"
  onClick={() => setShowBoundary(!showBoundary)}
>
  {showBoundary ? (
    <>
      <EyeOff className="h-4 w-4 mr-2" />
      Ocultar Límites
    </>
  ) : (
    <>
      <Eye className="h-4 w-4 mr-2" />
      Ver Límites
    </>
  )}
</Button>

{showBoundary && community.boundary && (
  <GeoJSON
    data={community.boundary}
    style={{
      color: '#E53E3E',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.1,
      fillColor: '#E53E3E'
    }}
  />
)}
```

**Key points:**
- Only show button if `community.boundary !== null`
- Toggle state persists while on page (not across sessions)
- Consistent styling: red stroke, very light fill
- Clear labeling in Spanish

**Not included:**
- Business profile maps (`app/[community]/business/[slug]/page.tsx`) - too small, adds no value

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "leaflet-draw": "^1.0.4",
    "@turf/turf": "^6.5.0"
  },
  "devDependencies": {
    "@types/leaflet-draw": "^1.0.11"
  }
}
```

**Note:** `leaflet` and `react-leaflet` already exist in project.

---

## Migration Strategy

### Phase 1: Database Setup
1. Create migration with PostGIS extension and boundary column
2. Run migration on development
3. Test spatial queries with sample data
4. Verify performance with spatial index

### Phase 2: Edit Page & Boundary Editor
1. Create edit page route
2. Implement BoundaryEditor component
3. Test polygon drawing, editing, saving
4. Verify GeoJSON ↔ PostGIS conversion

### Phase 3: Staff Management
1. Implement AssignStaffModal
2. Implement EditStaffModal
3. Wire up to existing API endpoints
4. Test assignment, role changes, removal

### Phase 4: Business Validation
1. Add client-side validation to registration
2. Add server-side validation to API
3. Test boundary enforcement
4. Add admin approval warnings

### Phase 5: Public Display
1. Add boundary toggle to homepage map
2. Add boundary toggle to directory map
3. Test boundary rendering
4. Verify performance impact

### Phase 6: Testing & Rollout
1. Test with Parque Industrial (existing community)
2. Create test community with boundary
3. Test business registration within/outside boundary
4. Verify staff management end-to-end
5. Deploy to production

---

## Success Criteria

- ✅ Super admin can edit community information via `/admin/communities/[id]/edit`
- ✅ Super admin can draw and save community boundaries on map
- ✅ Super admin can search and assign users as admin/moderator
- ✅ Super admin can change staff roles or remove staff
- ✅ Business registration validates location against boundary (if defined)
- ✅ Users can toggle boundary visibility on public maps
- ✅ Existing communities without boundaries continue to operate
- ✅ New communities can be created with boundaries from day one

---

## Future Enhancements (Out of Scope)

- Multi-polygon support for non-contiguous communities
- Boundary overlap detection between communities
- Geocoding address → auto-place pin in registration
- Heatmaps of business density within boundaries
- Coverage analysis (% of boundary area with businesses)
- Boundary change history / versioning
- Community boundary suggestions based on existing businesses

---

## Security Considerations

- ✅ All endpoints enforce super admin check (`is_super_admin = true`)
- ✅ Server-side validation prevents boundary manipulation
- ✅ Audit logs capture all community edits and staff changes
- ✅ RLS policies ensure community data isolation
- ✅ Staff assignment validates user existence
- ✅ No public API access to edit communities or assign staff

---

## Performance Considerations

- Spatial index on `boundary` column for fast point-in-polygon queries
- Boundary data only loaded when needed (edit page, map toggle)
- Debounced search prevents excessive API calls
- Client-side validation reduces server load during registration
- GeoJSON format is standard and efficient
- Max 20 search results prevents UI overload

---

## Accessibility

- All modals are keyboard navigable
- Toggle buttons have clear labels (not icon-only)
- Form inputs have proper labels
- Error messages are clearly associated with fields
- Color is not the only indicator (use icons + text)
- Map controls are keyboard accessible via Leaflet defaults

---

## Localization

All user-facing text is in Spanish (Colombia):
- "Información" / "Límites" / "Configuración" (tabs)
- "Dibuja el límite de la comunidad en el mapa"
- "Asignar Staff" / "Remover del Staff"
- "Ubicación válida" / "Fuera de los límites"
- "Ver Límites" / "Ocultar Límites"

Technical/admin labels can remain in English if preferred.

---

## Questions & Assumptions

**Assumptions:**
- Supabase PostGIS extension is available (standard in Supabase)
- OpenStreetMap Nominatim API is accessible for geocoding
- Communities are typically contiguous neighborhoods
- Super admins are trusted users (no additional approval needed)

**Open questions:**
- Should we add boundary change approval workflow?
- Should we notify existing staff when their role changes?
- Should we log boundary changes separately in audit log?

---

## Appendices

### A. GeoJSON Polygon Format

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-75.6881, 4.8133],
      [-75.6880, 4.8135],
      [-75.6878, 4.8134],
      [-75.6879, 4.8132],
      [-75.6881, 4.8133]
    ]
  ]
}
```

**Notes:**
- First and last coordinate must be identical (closed polygon)
- Coordinates are `[longitude, latitude]` (not lat/lng!)
- Outer array can contain multiple rings (holes), but we only use first ring

### B. PostGIS Geometry Format

PostGIS stores as binary (WKB - Well-Known Binary), but can be represented as WKT (Well-Known Text):

```
POLYGON((-75.6881 4.8133, -75.6880 4.8135, -75.6878 4.8134, -75.6879 4.8132, -75.6881 4.8133))
```

**Conversion:**
- GeoJSON → PostGIS: `ST_GeomFromGeoJSON(geojson_string)`
- PostGIS → GeoJSON: `ST_AsGeoJSON(geometry_column)`

Supabase handles conversion automatically when using geometry columns.

---

**End of Design Document**
