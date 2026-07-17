# Community Admin Improvements - Design Document

**Date:** 2026-03-09
**Status:** Approved
**Author:** Claude Code

## Overview

Improve the community admin interface by integrating proper Supabase image upload for community logos (replacing URL input), adding a color picker for primary color customization, and removing duplicate logo field between Info and Settings tabs.

## Problem Statement

Current issues with community admin interface:
1. **Logo URL duplication:** Logo URL field appears in both Info tab and Settings tab
2. **Manual URL entry:** Admins must manually upload images elsewhere and paste URLs instead of direct upload
3. **Poor color UX:** Primary color uses text input requiring manual hex code entry
4. **Inconsistent with business workflow:** Business registration has proper image upload, but community admin doesn't

## Goals

1. Replace logo URL text input with proper Supabase image upload (like business photos)
2. Remove duplicate logo field (keep in Info tab only)
3. Add color picker for primary color in Settings tab
4. Maintain neo-brutalist tropical brand consistency
5. Create reusable components for future use (cover images, category icons, etc.)

## User Requirements

Based on clarification:
- Logo upload field in **Info tab** (not Settings)
- Color picker supports **hex only** (#RRGGBB format)
- Logo upload shows **preview + replace/delete** options
- Follow existing business photo upload pattern

## Design Decisions

### Approach: Reusable Components

Create two new reusable UI components that can be used across the admin interface:

1. **`<ImageUploadField>`** - Single image upload with preview/delete
2. **`<ColorPickerField>`** - Hex color picker with native input + text sync

**Why reusable components?**
- Future features will need similar uploads (cover images, category icons)
- Clean separation of concerns
- Easier to test and maintain
- Follows existing pattern (brutalist-card, brutalist-input, etc.)
- Consistent UX across admin interface

## Architecture

### Component Structure

```
components/
  ui/
    image-upload-field.tsx    # NEW - Single image upload component
    color-picker-field.tsx    # NEW - Color picker component
  admin/
    community-form.tsx        # UPDATED - Add logo upload, remove logo URL
    settings-panel.tsx        # UPDATED - Add color picker, remove logo URL
    community-edit-tabs.tsx   # NO CHANGE
```

### Component Specifications

#### ImageUploadField Component

**Purpose:** Reusable single image upload with preview

**Props:**
```typescript
interface ImageUploadFieldProps {
  label: string              // Field label (e.g., "Logo de la Comunidad")
  value: string | null       // Current image URL
  onChange: (url: string | null) => void  // Callback when image changes
  bucket?: string            // Supabase bucket name (default: 'community-images')
  maxSizeMB?: number         // Max file size (default: 5)
  aspectRatio?: string       // CSS aspect ratio (default: '1/1')
  maxWidth?: string          // CSS max width (default: '200px')
}
```

**States:**
- **Empty:** Dashed border, upload icon, "Subir [Label]" text
- **Uploading:** Spinner, "Subiendo..." text, disabled
- **Preview:** Image preview, "Cambiar" and "Eliminar" buttons
- **Error:** Toast notification with error message

**Styling:**
- Container: `brutalist-card` with 2px black border
- Upload area: Dashed border when empty, centered content
- Preview: Square (1:1 aspect ratio), max 200px, black border
- Buttons: `brutalist-button` small variant, horizontal layout
- Icons: lucide-react `Upload`, `X`, `ImagePlus`

**Behavior:**
- Click to upload when empty
- "Cambiar" button to replace image
- "Eliminar" button to remove image (no confirmation needed)
- Uses `/api/upload/community` endpoint
- Validates: file type (JPG/PNG/WebP), size (5MB max)
- Shows loading state during upload
- Displays errors via toast notifications

#### ColorPickerField Component

**Purpose:** Reusable hex color picker with native input

**Props:**
```typescript
interface ColorPickerFieldProps {
  label: string                    // Field label (e.g., "Color Primario")
  value: string                    // Current hex color (e.g., "#1E40AF")
  onChange: (color: string) => void // Callback when color changes
  defaultColor?: string            // Fallback if invalid (default: "#1E40AF")
}
```

**Layout:**
- Horizontal flex: Color picker + Hex input + Preview swatch
- Native `<input type="color">` - 48px square, 2px black border
- Text input for hex code - `brutalist-input`, 120px width, uppercase
- Preview swatch - 48px square, 2px black border, rounded-md

**Validation:**
- Validates hex format: `/^#[0-9A-F]{6}$/i`
- Converts input to uppercase automatically
- Shows error text if invalid: "Formato inválido (usa #RRGGBB)"
- Bi-directional sync between color picker and text input

**Styling:**
- Label: uppercase tracking-widest font-bold text-xs
- Error text: text-xs font-bold text-red-500 uppercase tracking-wider
- Focus states: lifted shadow (brutalist pattern)

### Form Integration

#### CommunityForm (Info Tab)

**Changes:**
- **Add:** `<ImageUploadField>` after description field (line ~173)
  - Label: "Logo de la Comunidad"
  - Wire to `formData.logo_url`
  - Update handler: `onChange={(url) => setFormData({ ...formData, logo_url: url })}`
- **Remove:** Current logo_url text input (lines 159-173)
- **Keep:** All other fields unchanged

**Form submission:**
- No changes to API endpoint (`/api/admin/communities`)
- Logo URL saved to `communities.logo_url` via existing PATCH

#### SettingsPanel (Configuración Tab)

**Changes:**
- **Replace:** Primary color text input (lines 89-113) with `<ColorPickerField>`
  - Label: "Color Primario"
  - Wire to `primaryColor` state
  - Update handler: `onChange={setPrimaryColor}`
- **Remove:** Logo URL field entirely (lines 115-130)
- **Keep:** is_active toggle unchanged

**Form submission:**
- No changes to API endpoint (`/api/admin/communities/${communityId}`)
- Only saves: `is_active`, `primary_color` (logo now saved in Info tab)

## Data Flow

### Image Upload Flow

1. User selects image file in `<ImageUploadField>`
2. Component validates file type and size client-side
3. If valid, shows loading state and POSTs to `/api/upload/community`
4. API uploads to Supabase `community-images` bucket
5. API returns public URL
6. Component calls `onChange(url)` with new URL
7. Parent form updates state
8. User saves form → URL persisted to `communities.logo_url`

### Color Picker Flow

1. User interacts with color picker OR hex input
2. Component validates hex format
3. If valid, syncs both inputs (picker ↔ text)
4. Component calls `onChange(hexColor)`
5. Parent form updates state
6. User saves form → Color persisted to `communities.primary_color`

## Error Handling

### ImageUploadField Errors

| Error | Detection | User Feedback |
|-------|-----------|---------------|
| File too large (>5MB) | Client-side | Toast: "La imagen es muy grande (máximo 5MB)" |
| Invalid format | Client-side | Toast: "Solo se permiten imágenes (JPG, PNG, WebP)" |
| Network failure | API response | Toast: "Error de conexión al subir imagen" |
| API error | API response | Toast: error message from API |

### ColorPickerField Errors

| Error | Detection | User Feedback |
|-------|-----------|---------------|
| Invalid hex format | Client-side regex | Error text below input: "Formato inválido (usa #RRGGBB)" |
| Empty value | On blur | Fall back to `defaultColor` (#1E40AF) |

## Styling & Brand Consistency

All components follow **Neo-Brutalist Tropical** guidelines:

**Visual Elements:**
- 2-4px solid black borders
- Hard offset shadows: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Uppercase labels with `tracking-widest`
- Font: Outfit (headings) + Inter (body)

**Interactive States:**
- Hover: Lifted shadow effect
- Focus: Ring with lifted shadow
- Disabled: Reduced opacity + pointer-events-none
- Loading: Spinner + disabled state

**Colors:**
- Primary (Barrio Red): `oklch(0.57 0.23 18)`
- Secondary (Sun Yellow): `oklch(0.85 0.17 85)`
- Accent (Street Art Blue): `oklch(0.5 0.2 260)`
- Borders: Pure black `oklch(0 0 0)`

## Migration & Compatibility

**No breaking changes:**
- Existing communities with logo URLs continue to work
- No database schema changes required
- No API changes required
- Both create and edit modes supported

**Backward compatibility:**
- Communities without logos show empty upload state
- Communities with existing primary colors display correctly
- Invalid hex colors fall back to default (#1E40AF)

## Testing Approach

**Manual Testing Checklist:**
1. [ ] Upload logo in Info tab → saves correctly
2. [ ] Change logo → replaces old image
3. [ ] Delete logo → removes image, shows upload state
4. [ ] Upload file too large → shows error toast
5. [ ] Upload invalid format → shows error toast
6. [ ] Pick color with color picker → updates hex input
7. [ ] Type hex code → updates color picker and preview
8. [ ] Enter invalid hex → shows validation error
9. [ ] Save Info tab → logo URL persists
10. [ ] Save Settings tab → primary color persists
11. [ ] Verify Settings tab has NO logo field
12. [ ] Create new community → both components work
13. [ ] Edit existing community → loads current values

**Edge Cases:**
- Network interruption during upload
- Extremely slow upload (timeout handling)
- Invalid hex codes (empty, wrong length, invalid chars)
- Browser without color picker support (fallback to text input)

## Future Enhancements

These reusable components enable:
- Cover image upload for communities
- Category icon uploads
- Profile picture improvements
- Business logo uploads (separate from photos)
- Multi-image galleries with color themes

## Success Metrics

**Implementation success:**
- [ ] Logo upload working in Info tab only
- [ ] Color picker working in Settings tab
- [ ] No logo field in Settings tab
- [ ] All error cases handled gracefully
- [ ] Neo-brutalist styling consistent
- [ ] Reusable components in `components/ui/`

**User experience success:**
- Faster logo setup (no external upload needed)
- Clearer color customization (visual picker)
- No confusion from duplicate fields
- Consistent with business registration UX

## Technical Notes

**Dependencies:**
- No new packages required
- Uses existing: lucide-react, sonner (toast), Next.js Image
- Uses existing API: `/api/upload/community`
- Uses existing Supabase bucket: `community-images`

**Browser Support:**
- Native color picker: Modern browsers (fallback to text input)
- Image upload: All browsers with FormData support
- File validation: Client-side File API

**Performance:**
- Image optimization: Next.js Image component (automatic)
- Upload progress: Could add progress bar in future
- Lazy loading: Not needed for admin interface

## Implementation Order

1. Create `<ColorPickerField>` component (simpler, no API)
2. Create `<ImageUploadField>` component (more complex)
3. Update `SettingsPanel` (replace color input, remove logo)
4. Update `CommunityForm` (add logo upload, remove URL input)
5. Manual testing of all scenarios
6. Commit and verify in production

---

**Status:** Design approved, ready for implementation planning
