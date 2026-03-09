# Community Boundary Management

## Overview

Super admins can define geographic boundaries for communities using polygon drawing tools powered by PostGIS and Leaflet.draw.

## Features

- **Interactive Polygon Drawing**: Draw community boundaries on an interactive map with Leaflet.draw
- **Edit Existing Boundaries**: Move vertices, reshape polygons, or delete boundaries
- **Automatic Validation**: Business locations are validated against boundaries (client + server)
- **PostGIS Integration**: Efficient spatial queries using PostgreSQL/PostGIS
- **Staff Management**: Assign admins and moderators to communities
- **Settings Control**: Manage community activation, colors, and logos

## Usage

### Setting Boundaries

1. Navigate to `/admin/communities/[id]/edit`
2. Click the "Límites" tab
3. Use the polygon tool (top-right of map) to draw the community boundary
4. Adjust vertices by clicking "Edit layers" then dragging points
5. Click "Guardar Límites" to save

### Business Validation

- **Client-side**: Real-time feedback when registering businesses
- **Server-side**: API validates location before saving to database
- **Admin Override**: Admins can manually approve businesses outside boundaries if needed

### Staff Management

1. Navigate to community detail page: `/admin/communities/[id]`
2. Click "Staff" tab
3. Click "Asignar Staff" to add new admin or moderator
4. Click edit icon on existing staff to change role or remove

## Technical Details

### Database Schema

```sql
-- Boundary column (PostGIS geometry)
ALTER TABLE communities ADD COLUMN boundary GEOMETRY(Polygon, 4326);

-- Spatial index for performance
CREATE INDEX idx_communities_boundary ON communities USING GIST (boundary);

-- Helper function for validation
CREATE FUNCTION is_location_in_community_boundary(
  community_uuid UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) RETURNS BOOLEAN;
```

### API Endpoints

- `PATCH /api/admin/communities/[id]` - Update community settings/boundary
- `POST /api/admin/communities/[id]/staff` - Assign staff member
- `DELETE /api/admin/communities/[id]/staff` - Remove staff member
- `POST /api/businesses` - Create business (validates boundary)

### TypeScript Types

```typescript
export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

// Added to communities table
boundary: GeoJSONPolygon | null
```

### Validation Flow

1. **Registration Form**: turf.js checks point-in-polygon on client
2. **Visual Feedback**: Red/green card shows validation status
3. **API Submission**: PostGIS function validates on server
4. **Error Response**: Returns 400 if location outside boundary

## Components

- `CommunityEditTabs` - Tabbed interface (Info, Límites, Configuración)
- `BoundaryEditor` - Map with Leaflet.draw polygon tools
- `SettingsPanel` - Community activation, color, logo settings
- `AssignStaffModal` - Search and assign staff with role selection
- `EditStaffModal` - Change roles or remove staff members

## File Structure

```
app/admin/communities/[id]/edit/page.tsx  # Edit page route
components/admin/
  community-edit-tabs.tsx                 # Tabbed interface
  boundary-editor.tsx                     # Map editor
  settings-panel.tsx                      # Settings form
  assign-staff-modal.tsx                  # Assign staff
  edit-staff-modal.tsx                    # Edit/remove staff
supabase/migrations/
  20260309000001_add_community_boundaries.sql  # PostGIS migration
```

## Security

- Super admin access required for all endpoints
- RLS policies enforce community-level isolation
- Audit logs track all boundary and staff changes
- Community admins cannot access other communities

## Performance

- Spatial index on boundary column for fast queries
- GeoJSON layer loads only when boundary exists
- Client-side validation prevents unnecessary API calls
- Dynamic imports prevent SSR issues with Leaflet

## Future Enhancements

- Public boundary display toggle (planned)
- Admin approval warnings for out-of-bounds businesses (planned)
- Boundary templates for common municipality shapes
- Multi-polygon support for non-contiguous communities
- Import/export boundaries as GeoJSON files
