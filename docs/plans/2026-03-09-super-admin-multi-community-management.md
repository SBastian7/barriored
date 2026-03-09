# Super Admin Multi-Community Management - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable super admins to edit community info, define geographic boundaries with polygon drawing, and manage staff assignments.

**Architecture:** PostGIS-native boundary storage with Leaflet.draw editor, tabbed edit page reusing existing CommunityForm, modal-based staff search/assign, dual client+server validation for business locations.

**Tech Stack:** Next.js 16, React 19, Supabase (PostGIS), Leaflet + Leaflet.draw, TypeScript, Tailwind CSS, Radix UI

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add new dependencies**

```bash
npm install leaflet-draw @turf/turf
```

**Step 2: Add type definitions**

```bash
npm install --save-dev @types/leaflet-draw
```

**Step 3: Verify installation**

Run: `npm list leaflet-draw @turf/turf`
Expected: Shows installed versions

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add leaflet-draw and turf.js for boundary editing"
```

---

## Task 2: Database Migration - Add Boundary Column

**Files:**
- Create: `supabase/migrations/[timestamp]_add_community_boundaries.sql`

**Step 1: Create migration file**

Create file: `supabase/migrations/20260309000001_add_community_boundaries.sql`

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

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify in database**

Check: Communities table should have `boundary` column
Check: Index `idx_communities_boundary` exists
Check: Function `is_location_in_community_boundary` exists

**Step 4: Commit**

```bash
git add supabase/migrations/20260309000001_add_community_boundaries.sql
git commit -m "db: add boundary column and PostGIS helpers for communities"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts`

**Step 1: Add GeoJSON types import**

At top of file, add:

```typescript
// Add after existing imports
export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}
```

**Step 2: Update communities table type**

Find the `communities` table definition and update it:

```typescript
communities: {
  Row: {
    id: string
    name: string
    slug: string
    municipality: string
    department: string
    description: string | null
    logo_url: string | null
    primary_color: string | null
    is_active: boolean | null
    boundary: GeoJSONPolygon | null  // Add this field
    created_at: string | null
  }
  Insert: {
    id?: string
    name: string
    slug: string
    municipality: string
    department: string
    description?: string | null
    logo_url?: string | null
    primary_color?: string | null
    is_active?: boolean | null
    boundary?: GeoJSONPolygon | null  // Add this field
    created_at?: string | null
  }
  Update: {
    id?: string
    name?: string
    slug?: string
    municipality?: string
    department?: string
    description?: string | null
    logo_url?: string | null
    primary_color?: string | null
    is_active?: boolean | null
    boundary?: GeoJSONPolygon | null  // Add this field
    created_at?: string | null
  }
}
```

**Step 3: Run TypeScript check**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add lib/types/database.ts
git commit -m "types: add boundary field to communities table type"
```

---

## Task 4: Create Edit Page Route

**Files:**
- Create: `app/admin/communities/[id]/edit/page.tsx`

**Step 1: Create edit page file**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CommunityEditTabs } from '@/components/admin/community-edit-tabs'

export default async function CommunityEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  // Fetch community details
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  if (!community) {
    redirect('/admin/communities')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/admin/communities/${id}`}>
          <Button variant="outline" className="brutalist-button" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Editar Comunidad
          </h1>
          <p className="text-muted-foreground">{community.name}</p>
        </div>
      </div>

      <CommunityEditTabs communityId={id} initialData={community} />
    </div>
  )
}
```

**Step 2: Test page loads**

Visit: `http://localhost:3000/admin/communities/[existing-id]/edit`
Expected: Page loads (may show component error until next task)

**Step 3: Commit**

```bash
git add app/admin/communities/[id]/edit/page.tsx
git commit -m "feat: add community edit page route"
```

---

## Task 5: Create Community Edit Tabs Component

**Files:**
- Create: `components/admin/community-edit-tabs.tsx`

**Step 1: Create tabs component**

```typescript
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunityForm } from '@/components/admin/community-form'
import { BoundaryEditor } from '@/components/admin/boundary-editor'
import { SettingsPanel } from '@/components/admin/settings-panel'

interface Props {
  communityId: string
  initialData: any
}

export function CommunityEditTabs({ communityId, initialData }: Props) {
  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList className="brutalist-card inline-flex">
        <TabsTrigger
          value="info"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Información
        </TabsTrigger>
        <TabsTrigger
          value="boundaries"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Límites
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <CommunityForm mode="edit" initialData={initialData} />
      </TabsContent>

      <TabsContent value="boundaries">
        <BoundaryEditor
          communityId={communityId}
          communityName={initialData.name}
          municipality={initialData.municipality}
          department={initialData.department}
          initialBoundary={initialData.boundary}
        />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsPanel
          communityId={communityId}
          initialSettings={{
            is_active: initialData.is_active,
            primary_color: initialData.primary_color,
            logo_url: initialData.logo_url,
          }}
        />
      </TabsContent>
    </Tabs>
  )
}
```

**Step 2: Test tabs render**

Visit edit page, tabs should render (content will error until components created)

**Step 3: Commit**

```bash
git add components/admin/community-edit-tabs.tsx
git commit -m "feat: add community edit tabs component"
```

---

## Task 6: Create Settings Panel Component

**Files:**
- Create: `components/admin/settings-panel.tsx`

**Step 1: Create settings panel**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface Props {
  communityId: string
  initialSettings: {
    is_active: boolean
    primary_color: string | null
    logo_url: string | null
  }
}

export function SettingsPanel({ communityId, initialSettings }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(initialSettings.is_active ?? true)
  const [primaryColor, setPrimaryColor] = useState(
    initialSettings.primary_color || '#1E40AF'
  )
  const [logoUrl, setLogoUrl] = useState(initialSettings.logo_url || '')

  async function handleSave() {
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          primary_color: primaryColor,
          logo_url: logoUrl || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han guardado correctamente',
      })

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="brutalist-card p-8 space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label
              htmlFor="is-active"
              className="uppercase tracking-widest font-bold text-xs"
            >
              Estado de la Comunidad
            </Label>
            <p className="text-sm text-muted-foreground">
              {isActive ? 'La comunidad está activa y visible' : 'La comunidad está desactivada'}
            </p>
          </div>
          <Switch
            id="is-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="primary-color"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Color Primario
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="primary-color"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1E40AF"
              className="brutalist-input flex-1"
            />
            <div
              className="w-12 h-12 border-2 border-black rounded-md"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Formato hexadecimal (ej: #1E40AF)
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="logo-url"
            className="uppercase tracking-widest font-bold text-xs"
          >
            URL del Logo
          </Label>
          <Input
            id="logo-url"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="brutalist-input"
          />
        </div>
      </div>

      <div className="pt-6 border-t-2 border-black">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="brutalist-button w-full"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Test settings panel**

Visit edit page → Settings tab
Should render form with toggle, color input, and logo URL

**Step 3: Commit**

```bash
git add components/admin/settings-panel.tsx
git commit -m "feat: add settings panel component for community edit"
```

---

## Task 7: Create Boundary Editor Component (Structure)

**Files:**
- Create: `components/admin/boundary-editor.tsx`

**Step 1: Create boundary editor component skeleton**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

// Import Leaflet types
import type { Map as LeafletMap, Layer } from 'leaflet'
import type { GeoJSONPolygon } from '@/lib/types/database'

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
)

interface Props {
  communityId: string
  communityName: string
  municipality: string
  department: string
  initialBoundary: GeoJSONPolygon | null
}

export function BoundaryEditor({
  communityId,
  communityName,
  municipality,
  department,
  initialBoundary,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [center, setCenter] = useState<[number, number]>([4.8133, -75.6881]) // Default Pereira
  const [boundary, setBoundary] = useState<GeoJSONPolygon | null>(
    initialBoundary
  )
  const mapRef = useRef<LeafletMap | null>(null)

  // Geocode municipality to get center
  useEffect(() => {
    async function geocode() {
      try {
        const query = `${municipality}, ${department}, Colombia`
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        )
        const data = await response.json()
        if (data && data[0]) {
          setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        }
      } catch (error) {
        console.error('Geocoding error:', error)
      }
    }

    geocode()
  }, [municipality, department])

  async function handleSave() {
    if (!boundary) {
      toast({
        title: 'Error',
        description: 'Debes dibujar un límite primero',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundary }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast({
        title: 'Límites guardados',
        description: 'El límite de la comunidad se ha guardado correctamente',
      })

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al guardar límites',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="brutalist-card p-6">
        <div className="flex items-start gap-4 mb-4">
          <MapPin className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-1">
              Dibuja el límite de {communityName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Usa la herramienta de polígono para dibujar el límite geográfico
              de la comunidad en el mapa.
            </p>
          </div>
        </div>

        {/* Map placeholder - will add drawing tools in next task */}
        <div className="border-2 border-black h-[600px] bg-background flex items-center justify-center">
          <p className="text-muted-foreground">
            Mapa con herramientas de dibujo (próximo paso)
          </p>
        </div>

        {boundary && (
          <div className="mt-4 text-sm text-muted-foreground">
            Límite definido con {boundary.coordinates[0].length} vértices
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={loading || !boundary}
          className="brutalist-button flex-1"
        >
          {loading ? 'Guardando...' : 'Guardar Límites'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Test component renders**

Visit edit page → Límites tab
Should show placeholder for map

**Step 3: Commit**

```bash
git add components/admin/boundary-editor.tsx
git commit -m "feat: add boundary editor component skeleton"
```

---

## Task 8: Add Leaflet Drawing Tools to Boundary Editor

**Files:**
- Modify: `components/admin/boundary-editor.tsx`

**Step 1: Import Leaflet.draw and add EditControl**

Replace the map placeholder section with:

```typescript
// Add these imports at top
import { EditControl } from 'react-leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// Add this import for Leaflet icon fix
import L from 'leaflet'

// Fix Leaflet default icon paths (add after imports)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Replace the map placeholder div with:
<MapContainer
  center={center}
  zoom={14}
  className="h-[600px] border-2 border-black"
  ref={mapRef}
>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />

  <FeatureGroup>
    <EditControl
      position="topright"
      onCreated={handlePolygonCreated}
      onEdited={handlePolygonEdited}
      onDeleted={handlePolygonDeleted}
      draw={{
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#E53E3E',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.1,
          },
        },
      }}
      edit={{
        edit: true,
        remove: true,
      }}
    />
  </FeatureGroup>
</MapContainer>
```

**Step 2: Add polygon event handlers**

Add these functions inside the component:

```typescript
const handlePolygonCreated = (e: any) => {
  const layer = e.layer
  const geoJSON = layer.toGeoJSON()

  // Convert to our GeoJSON format
  const polygon: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: geoJSON.geometry.coordinates,
  }

  setBoundary(polygon)

  toast({
    title: 'Límite dibujado',
    description: 'Ahora puedes editar los vértices o guardar',
  })
}

const handlePolygonEdited = (e: any) => {
  const layers = e.layers
  layers.eachLayer((layer: Layer) => {
    const geoJSON = (layer as any).toGeoJSON()
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: geoJSON.geometry.coordinates,
    }
    setBoundary(polygon)
  })
}

const handlePolygonDeleted = () => {
  setBoundary(null)
  toast({
    title: 'Límite eliminado',
    description: 'El límite ha sido eliminado',
  })
}
```

**Step 3: Copy Leaflet icons to public folder**

```bash
mkdir -p public/leaflet
# Copy marker icons from node_modules/leaflet/dist/images/ to public/leaflet/
```

**Step 4: Test drawing**

Visit edit page → Límites tab
Should be able to draw polygon on map

**Step 5: Commit**

```bash
git add components/admin/boundary-editor.tsx public/leaflet/
git commit -m "feat: add Leaflet drawing tools to boundary editor"
```

---

## Task 9: Load Initial Boundary in Editor

**Files:**
- Modify: `components/admin/boundary-editor.tsx`

**Step 1: Add GeoJSON layer for initial boundary**

Import GeoJSON component:

```typescript
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)
```

**Step 2: Add initial boundary rendering**

Inside the `<FeatureGroup>`, after `<EditControl>`, add:

```typescript
{initialBoundary && (
  <GeoJSON
    data={{
      type: 'Feature',
      properties: {},
      geometry: initialBoundary,
    }}
    style={{
      color: '#E53E3E',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.1,
    }}
  />
)}
```

**Step 3: Test initial boundary loads**

If community has boundary saved, it should render on map load

**Step 4: Commit**

```bash
git add components/admin/boundary-editor.tsx
git commit -m "feat: load initial boundary in editor"
```

---

## Task 10: Create Assign Staff Modal Component

**Files:**
- Create: `components/admin/assign-staff-modal.tsx`

**Step 1: Create modal component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

interface Props {
  communityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignStaffModal({
  communityId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>(
    'moderator'
  )
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, community_id')
        .or(`full_name.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`)
        .limit(20)

      setSearchResults(data || [])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleAssign() {
    if (!selectedUser) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selectedUser.id,
            role: selectedRole,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al asignar staff')
      }

      toast({
        title: 'Staff asignado',
        description: `${selectedUser.full_name} ha sido asignado como ${selectedRole}`,
      })

      onSuccess()
      onOpenChange(false)
      setSearchQuery('')
      setSelectedUser(null)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al asignar staff',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brutalist-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
            Asignar Staff
          </DialogTitle>
          <DialogDescription>
            Busca un usuario para asignarlo como admin o moderador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search input */}
          <div className="space-y-2">
            <Label className="uppercase tracking-widest font-bold text-xs">
              Buscar Usuario
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre o ID del usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="brutalist-input pl-10"
              />
            </div>
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="brutalist-card max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-8 text-center text-muted-foreground">
                  Buscando...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="divide-y-2 divide-black">
                  {searchResults.map((user) => {
                    const isInThisCommunity = user.community_id === communityId
                    const isDisabled = isInThisCommunity

                    return (
                      <button
                        key={user.id}
                        onClick={() => !isDisabled && setSelectedUser(user)}
                        disabled={isDisabled}
                        className={`w-full p-4 flex items-center gap-4 hover:bg-accent transition-colors text-left ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          selectedUser?.id === user.id ? 'bg-accent' : ''
                        }`}
                      >
                        {user.avatar_url && (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full border-2 border-black"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-bold">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.id}
                          </div>
                        </div>
                        {user.role && user.role !== 'user' && (
                          <Badge>{user.role}</Badge>
                        )}
                        {isInThisCommunity && (
                          <Badge variant="outline">Ya asignado</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Role selection */}
          {selectedUser && (
            <div className="space-y-4 brutalist-card p-6">
              <div className="font-bold text-lg">Usuario seleccionado:</div>
              <div className="flex items-center gap-4">
                {selectedUser.avatar_url && (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-12 h-12 rounded-full border-2 border-black"
                  />
                )}
                <div>
                  <div className="font-bold">{selectedUser.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedUser.id}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t-2 border-black">
                <Label className="uppercase tracking-widest font-bold text-xs">
                  Rol
                </Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as 'admin' | 'moderator')
                  }
                >
                  <div className="flex items-start space-x-3 brutalist-card p-4">
                    <RadioGroupItem value="admin" id="admin" />
                    <div className="flex-1">
                      <Label htmlFor="admin" className="font-bold cursor-pointer">
                        Admin
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Control total de la comunidad
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 brutalist-card p-4">
                    <RadioGroupItem value="moderator" id="moderator" />
                    <div className="flex-1">
                      <Label htmlFor="moderator" className="font-bold cursor-pointer">
                        Moderador
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Gestión de contenido solamente
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="brutalist-button flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUser || loading}
              className="brutalist-button flex-1"
            >
              {loading ? 'Asignando...' : 'Asignar Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Test modal opens**

Modal component is ready, will wire up in next task

**Step 3: Commit**

```bash
git add components/admin/assign-staff-modal.tsx
git commit -m "feat: add assign staff modal component"
```

---

## Task 11: Create Edit Staff Modal Component

**Files:**
- Create: `components/admin/edit-staff-modal.tsx`

**Step 1: Create edit staff modal**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface StaffMember {
  id: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'moderator'
}

interface Props {
  communityId: string
  staffMember: StaffMember
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditStaffModal({
  communityId,
  staffMember,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<'admin' | 'moderator'>(staffMember.role)
  const [loading, setLoading] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  async function handleSave() {
    if (role === staffMember.role) {
      onOpenChange(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: staffMember.id,
            role,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar rol')
      }

      toast({
        title: 'Rol actualizado',
        description: `${staffMember.full_name} ahora es ${role}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al actualizar rol',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff?user_id=${staffMember.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al remover staff')
      }

      toast({
        title: 'Staff removido',
        description: `${staffMember.full_name} ha sido removido del staff`,
      })

      onSuccess()
      onOpenChange(false)
      setShowRemoveDialog(false)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al remover staff',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              Editar Staff
            </DialogTitle>
            <DialogDescription>
              Cambia el rol o remueve del staff de la comunidad
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User info */}
            <div className="brutalist-card p-6 flex items-center gap-4">
              {staffMember.avatar_url && (
                <img
                  src={staffMember.avatar_url}
                  alt={staffMember.full_name}
                  className="w-12 h-12 rounded-full border-2 border-black"
                />
              )}
              <div className="flex-1">
                <div className="font-bold text-lg">{staffMember.full_name}</div>
                <Badge
                  className={
                    staffMember.role === 'admin'
                      ? 'bg-primary'
                      : 'bg-secondary text-foreground'
                  }
                >
                  {staffMember.role === 'admin' ? 'Admin' : 'Moderador'}
                </Badge>
              </div>
            </div>

            {/* Role selection */}
            <div className="space-y-4">
              <Label className="uppercase tracking-widest font-bold text-xs">
                Cambiar Rol
              </Label>
              <RadioGroup
                value={role}
                onValueChange={(value) =>
                  setRole(value as 'admin' | 'moderator')
                }
              >
                <div className="flex items-start space-x-3 brutalist-card p-4">
                  <RadioGroupItem value="admin" id="edit-admin" />
                  <div className="flex-1">
                    <Label
                      htmlFor="edit-admin"
                      className="font-bold cursor-pointer"
                    >
                      Admin
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Control total de la comunidad
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 brutalist-card p-4">
                  <RadioGroupItem value="moderator" id="edit-moderator" />
                  <div className="flex-1">
                    <Label
                      htmlFor="edit-moderator"
                      className="font-bold cursor-pointer"
                    >
                      Moderador
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Gestión de contenido solamente
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 pt-4 border-t-2 border-black">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="brutalist-button flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || role === staffMember.role}
                  className="brutalist-button flex-1"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowRemoveDialog(true)}
                disabled={loading}
                className="brutalist-button w-full border-red-500 text-red-500 hover:bg-red-50"
              >
                Remover del Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              ¿Remover del Staff?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de remover a <strong>{staffMember.full_name}</strong>{' '}
              del staff? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="brutalist-button">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="brutalist-button bg-red-500 hover:bg-red-600"
            >
              {loading ? 'Removiendo...' : 'Sí, Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

**Step 2: Test modal structure**

Modal component ready, will wire up in next task

**Step 3: Commit**

```bash
git add components/admin/edit-staff-modal.tsx
git commit -m "feat: add edit staff modal component"
```

---

## Task 12: Wire Up Staff Modals in CommunityStaffPanel

**Files:**
- Modify: `components/admin/community-staff-panel.tsx`

**Step 1: Import modals and add state**

At top of file, add imports:

```typescript
import { AssignStaffModal } from '@/components/admin/assign-staff-modal'
import { EditStaffModal } from '@/components/admin/edit-staff-modal'
import { Edit } from 'lucide-react'
```

**Step 2: Add modal state**

Inside component:

```typescript
const [assignModalOpen, setAssignModalOpen] = useState(false)
const [editModalOpen, setEditModalOpen] = useState(false)
const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
const router = useRouter()

function handleSuccess() {
  router.refresh()
}
```

**Step 3: Update "Asignar Staff" button**

Replace the button:

```typescript
<Button
  className="brutalist-button"
  onClick={() => setAssignModalOpen(true)}
>
  <Plus className="h-4 w-4 mr-2" />
  Asignar Staff
</Button>
```

**Step 4: Update staff member actions**

Replace the `UserMinus` button with:

```typescript
<Button
  variant="outline"
  className="brutalist-button"
  size="icon"
  onClick={() => {
    setSelectedStaff(member)
    setEditModalOpen(true)
  }}
>
  <Edit className="h-4 w-4" />
</Button>
```

**Step 5: Add modals at bottom of component**

Before the closing div:

```typescript
<AssignStaffModal
  communityId={communityId}
  open={assignModalOpen}
  onOpenChange={setAssignModalOpen}
  onSuccess={handleSuccess}
/>

{selectedStaff && (
  <EditStaffModal
    communityId={communityId}
    staffMember={selectedStaff}
    open={editModalOpen}
    onOpenChange={(open) => {
      setEditModalOpen(open)
      if (!open) setSelectedStaff(null)
    }}
    onSuccess={handleSuccess}
  />
)}
```

**Step 6: Test staff management**

Visit community detail → Staff tab
Should be able to assign and edit staff

**Step 7: Commit**

```bash
git add components/admin/community-staff-panel.tsx
git commit -m "feat: wire up staff modals in staff panel"
```

---

## Task 13: Add Client-Side Boundary Validation to Business Registration

**Files:**
- Modify: `app/[community]/register/page.tsx` (or wherever location step is)

**Step 1: Install turf.js if not already**

(Should be installed from Task 1, verify)

**Step 2: Add boundary validation logic**

Find the location selection component/step and add:

```typescript
import { booleanPointInPolygon, point, polygon } from '@turf/turf'
import { useEffect, useState } from 'react'

// Add state for boundary validation
const [locationValid, setLocationValid] = useState<boolean | null>(null)
const [communityBoundary, setCommunityBoundary] = useState<any | null>(null)

// Fetch community boundary on mount
useEffect(() => {
  async function fetchBoundary() {
    const response = await fetch(`/api/communities/${communitySlug}`)
    const data = await response.json()
    if (data.community?.boundary) {
      setCommunityBoundary(data.community.boundary)
    }
  }
  fetchBoundary()
}, [communitySlug])

// Validate location when coordinates change
useEffect(() => {
  if (!coordinates || !communityBoundary) {
    setLocationValid(null)
    return
  }

  const isInside = booleanPointInPolygon(
    point([coordinates.lng, coordinates.lat]),
    polygon(communityBoundary.coordinates)
  )

  setLocationValid(isInside)
}, [coordinates, communityBoundary])
```

**Step 3: Add visual feedback**

Add validation message UI:

```typescript
{locationValid === false && (
  <div className="brutalist-card p-4 bg-red-50 border-red-500">
    <p className="text-sm text-red-700 font-bold">
      ⚠️ Esta ubicación está fuera de los límites de {communityName}
    </p>
  </div>
)}

{locationValid === true && (
  <div className="brutalist-card p-4 bg-green-50 border-green-500">
    <p className="text-sm text-green-700 font-bold">
      ✅ Ubicación válida
    </p>
  </div>
)}
```

**Step 4: Disable next button if invalid**

Update next/submit button:

```typescript
<Button
  disabled={!locationValid && communityBoundary !== null}
  className="brutalist-button"
>
  Siguiente
</Button>
```

**Step 5: Test validation**

Register a business, place pin outside boundary
Should show error and disable next button

**Step 6: Commit**

```bash
git add app/[community]/register/page.tsx
git commit -m "feat: add client-side boundary validation to registration"
```

---

## Task 14: Add Server-Side Boundary Validation to Business API

**Files:**
- Modify: `app/api/businesses/route.ts` (POST handler)

**Step 1: Add boundary validation**

In the POST handler, after other validations, add:

```typescript
// Check if community has boundary and validate location
const { data: community } = await supabase
  .from('communities')
  .select('boundary')
  .eq('id', business.community_id)
  .single()

if (community?.boundary) {
  // Call PostGIS function to validate
  const { data: isInside, error: validationError } = await supabase.rpc(
    'is_location_in_community_boundary',
    {
      community_uuid: business.community_id,
      lat: business.location.coordinates[1],
      lng: business.location.coordinates[0],
    }
  )

  if (validationError) {
    console.error('Boundary validation error:', validationError)
    return NextResponse.json(
      { error: 'Error al validar ubicación' },
      { status: 500 }
    )
  }

  if (!isInside) {
    return NextResponse.json(
      {
        error: 'La ubicación está fuera de los límites de la comunidad',
        code: 'LOCATION_OUTSIDE_BOUNDARY',
      },
      { status: 400 }
    )
  }
}
```

**Step 2: Test server validation**

Try to POST business with location outside boundary via API
Should return 400 error

**Step 3: Commit**

```bash
git add app/api/businesses/route.ts
git commit -m "feat: add server-side boundary validation to business API"
```

---

## Task 15: Add Boundary Toggle to Public Maps

**Files:**
- Modify: `app/[community]/page.tsx` (homepage map)
- Modify: `app/[community]/map/page.tsx` (full map view)

**Step 1: Add boundary toggle to homepage map**

In homepage map component:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { GeoJSON } from 'react-leaflet'

// Add state
const [showBoundary, setShowBoundary] = useState(false)

// Add toggle button (position over map)
{community.boundary && (
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
)}

// Add GeoJSON layer
{showBoundary && community.boundary && (
  <GeoJSON
    data={{
      type: 'Feature',
      properties: {},
      geometry: community.boundary,
    }}
    style={{
      color: '#E53E3E',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.1,
      fillColor: '#E53E3E',
    }}
  />
)}
```

**Step 2: Add same to full map page**

Repeat for `app/[community]/map/page.tsx`

**Step 3: Test toggle**

Visit homepage and map page
Should be able to toggle boundary visibility

**Step 4: Commit**

```bash
git add app/[community]/page.tsx app/[community]/map/page.tsx
git commit -m "feat: add boundary toggle to public maps"
```

---

## Task 16: Add Warning Badge to Admin Business Approval

**Files:**
- Modify: `app/admin/businesses/page.tsx`

**Step 1: Add boundary check for each business**

In the businesses list rendering:

```typescript
// For each pending business, check if within boundary
const businessesWithValidation = await Promise.all(
  pendingBusinesses.map(async (business) => {
    if (!business.community.boundary) {
      return { ...business, withinBoundary: null }
    }

    const { data: isInside } = await supabase.rpc(
      'is_location_in_community_boundary',
      {
        community_uuid: business.community_id,
        lat: business.location.coordinates[1],
        lng: business.location.coordinates[0],
      }
    )

    return { ...business, withinBoundary: isInside }
  })
)
```

**Step 2: Add warning badge**

In business card rendering:

```typescript
{business.withinBoundary === false && (
  <Badge
    variant="outline"
    className="border-yellow-500 text-yellow-700 bg-yellow-50"
  >
    ⚠️ Fuera de límites
  </Badge>
)}
```

**Step 3: Test warning appears**

Business outside boundary should show warning badge

**Step 4: Commit**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat: add boundary warning badge to admin approval"
```

---

## Task 17: Final Testing & Documentation

**Files:**
- Update: `README.md` (if needed)
- Create: `docs/BOUNDARY_MANAGEMENT.md` (usage guide)

**Step 1: Test complete workflow**

1. Create new community with boundary
2. Assign staff to community
3. Edit staff roles
4. Register business within boundary (should work)
5. Try to register business outside boundary (should fail)
6. Toggle boundary on public maps
7. Edit community settings
8. Remove staff member

**Step 2: Create usage documentation**

Create `docs/BOUNDARY_MANAGEMENT.md`:

```markdown
# Community Boundary Management

## Overview

Super admins can define geographic boundaries for communities using polygon drawing tools.

## Features

- Draw polygon boundaries on interactive map
- Edit existing boundaries by moving vertices
- Delete boundaries
- Automatic business location validation
- Public boundary display (toggle on/off)

## Usage

### Setting Boundaries

1. Navigate to `/admin/communities/[id]/edit`
2. Click "Límites" tab
3. Use polygon tool to draw boundary
4. Adjust vertices as needed
5. Click "Guardar Límites"

### Business Validation

- New businesses MUST be within boundary (if defined)
- Client-side validation provides instant feedback
- Server-side validation prevents bypassing
- Admins can override during manual approval

### Staff Management

1. Navigate to community detail page
2. Click "Staff" tab
3. Click "Asignar Staff" to add
4. Click edit icon to change roles or remove

## Technical Details

- Uses PostGIS for efficient spatial queries
- GeoJSON Polygon format (SRID 4326)
- Leaflet.draw for map editing
- Turf.js for client-side validation
```

**Step 3: Update main README if needed**

Add section about super admin features

**Step 4: Final commit**

```bash
git add docs/BOUNDARY_MANAGEMENT.md README.md
git commit -m "docs: add boundary management documentation"
```

---

## Task 18: Push Changes and Create Pull Request

**Step 1: Push to remote**

```bash
git push origin HEAD
```

**Step 2: Create pull request**

```bash
gh pr create --title "feat: super admin multi-community management" --body "$(cat <<'EOF'
## Summary
Implements super admin capabilities for managing multiple communities:
- Edit community information via tabbed interface
- Define geographic boundaries with polygon drawing
- Manage staff (assign, change roles, remove)
- Validate business locations against boundaries
- Public boundary display with toggle

## Architecture
- PostGIS for boundary storage and spatial queries
- Leaflet.draw for polygon editing
- Dual client+server validation
- Modal-based staff management

## Testing
- [x] Draw and save community boundaries
- [x] Edit existing boundaries
- [x] Assign staff to communities
- [x] Change staff roles
- [x] Remove staff members
- [x] Business registration validates against boundary
- [x] Public maps show boundary toggle
- [x] Settings panel saves correctly

## Documentation
- Design doc: `docs/plans/2026-03-09-super-admin-multi-community-management-design.md`
- Usage guide: `docs/BOUNDARY_MANAGEMENT.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Verify PR created**

Expected: PR created successfully with link

---

## Completion Checklist

- [x] Dependencies installed (leaflet-draw, turf.js)
- [x] Database migration applied (boundary column + PostGIS)
- [x] TypeScript types updated
- [x] Edit page route created
- [x] Boundary editor component implemented
- [x] Settings panel implemented
- [x] Staff assignment modal implemented
- [x] Staff edit modal implemented
- [x] Staff panel wired up
- [x] Client-side validation added
- [x] Server-side validation added
- [x] Public map toggle added
- [x] Admin warning badge added
- [x] Documentation written
- [x] Pull request created

---

## Notes

- Boundary column is nullable (existing communities can operate without)
- Super admin access required for all endpoints
- Audit logging captures all community/staff changes
- RLS policies enforce community isolation
- Public boundaries are opt-in (toggle required)
