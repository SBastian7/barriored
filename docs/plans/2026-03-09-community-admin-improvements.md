# Community Admin Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace community logo URL input with Supabase image upload and add color picker for primary color customization.

**Architecture:** Create two reusable UI components (ImageUploadField, ColorPickerField) in `components/ui/`, update CommunityForm to use image upload for logo in Info tab, update SettingsPanel to use color picker and remove duplicate logo field.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase Storage, lucide-react icons

---

## Task 1: Create ColorPickerField Component

**Files:**
- Create: `components/ui/color-picker-field.tsx`

**Step 1: Create ColorPickerField component file**

Create the component with proper TypeScript types and neo-brutalist styling:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ColorPickerFieldProps {
  label: string
  value: string
  onChange: (color: string) => void
  defaultColor?: string
}

export function ColorPickerField({
  label,
  value,
  onChange,
  defaultColor = '#1E40AF',
}: ColorPickerFieldProps) {
  const [hexInput, setHexInput] = useState(value || defaultColor)
  const [error, setError] = useState('')

  // Sync hex input with value prop
  useEffect(() => {
    setHexInput(value || defaultColor)
  }, [value, defaultColor])

  // Validate hex format
  const validateHex = (hex: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(hex)
  }

  // Handle color picker change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value.toUpperCase()
    setHexInput(color)
    setError('')
    onChange(color)
  }

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value.toUpperCase()

    // Auto-add # if missing
    if (!hex.startsWith('#')) {
      hex = '#' + hex
    }

    setHexInput(hex)

    // Validate and update
    if (validateHex(hex)) {
      setError('')
      onChange(hex)
    } else if (hex.length === 7) {
      setError('Formato inválido (usa #RRGGBB)')
    }
  }

  // Handle blur - fallback to default if invalid
  const handleBlur = () => {
    if (!validateHex(hexInput)) {
      setHexInput(value || defaultColor)
      onChange(value || defaultColor)
      setError('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        {label}
      </Label>

      <div className="flex items-center gap-4">
        {/* Native color picker */}
        <input
          type="color"
          value={hexInput}
          onChange={handleColorChange}
          className="h-12 w-12 border-2 border-black rounded-md cursor-pointer"
        />

        {/* Hex input */}
        <Input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleBlur}
          placeholder="#1E40AF"
          className="brutalist-input w-[120px] uppercase"
          maxLength={7}
        />

        {/* Preview swatch */}
        <div
          className="h-12 w-12 border-2 border-black rounded-md"
          style={{ backgroundColor: validateHex(hexInput) ? hexInput : defaultColor }}
        />
      </div>

      {error && (
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Formato hexadecimal (ej: #1E40AF)
      </p>
    </div>
  )
}
```

**Step 2: Verify component exports**

The component is ready to use. No tests needed for UI components in this project (manual testing approach).

**Step 3: Commit ColorPickerField component**

```bash
git add components/ui/color-picker-field.tsx
git commit -m "feat(ui): add ColorPickerField component

- Hex color picker with native input + text sync
- Bi-directional sync between picker and text input
- Validation with error messages
- Neo-brutalist styling with borders and preview swatch

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create ImageUploadField Component

**Files:**
- Create: `components/ui/image-upload-field.tsx`

**Step 1: Create ImageUploadField component file**

Create the component with upload, preview, and delete functionality:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, X, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImageUploadFieldProps {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  bucket?: string
  maxSizeMB?: number
  aspectRatio?: string
  maxWidth?: string
}

export function ImageUploadField({
  label,
  value,
  onChange,
  bucket = 'community-images',
  maxSizeMB = 5,
  aspectRatio = '1/1',
  maxWidth = '200px',
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`La imagen es muy grande (máximo ${maxSizeMB}MB)`)
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WebP)')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Use appropriate upload endpoint based on bucket
      const endpoint = bucket === 'community-images'
        ? '/api/upload/community'
        : '/api/upload'

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al subir imagen')
        return
      }

      onChange(data.url)
      toast.success('Imagen subida correctamente')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  function handleDelete() {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        {label}
      </Label>

      {/* Empty state - Upload */}
      {!value && (
        <label
          className={cn(
            'brutalist-card flex flex-col items-center justify-center cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all p-8',
            'border-2 border-dashed border-black/30 hover:border-primary hover:bg-primary/5',
            uploading && 'opacity-50 pointer-events-none'
          )}
          style={{ aspectRatio, maxWidth }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="sr-only"
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                Subiendo...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ImagePlus className="h-12 w-12 text-black/30" />
              <span className="text-xs font-bold text-black/60 uppercase tracking-widest">
                Subir {label}
              </span>
            </div>
          )}
        </label>
      )}

      {/* Preview state - Show image with actions */}
      {value && (
        <div className="space-y-3">
          <div
            className="relative brutalist-card overflow-hidden border-2 border-black"
            style={{ aspectRatio, maxWidth }}
          >
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="sr-only"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="brutalist-button w-full"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? 'Subiendo...' : 'Cambiar'}
                </span>
              </Button>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={uploading}
              className="brutalist-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify component exports**

The component is ready to use with proper error handling and loading states.

**Step 3: Commit ImageUploadField component**

```bash
git add components/ui/image-upload-field.tsx
git commit -m "feat(ui): add ImageUploadField component

- Single image upload with preview/delete
- Upload to Supabase storage via API
- Validation: file type (JPG/PNG/WebP), size (5MB)
- Loading states and error handling with toast
- Neo-brutalist styling with hover effects

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update SettingsPanel Component

**Files:**
- Modify: `components/admin/settings-panel.tsx:1-145`

**Step 1: Import ColorPickerField component**

Add import at the top of the file:

```typescript
import { ColorPickerField } from '@/components/ui/color-picker-field'
```

**Step 2: Replace primary color input with ColorPickerField**

Replace lines 89-113 (the existing primary color section) with:

```typescript
        <ColorPickerField
          label="Color Primario"
          value={primaryColor}
          onChange={setPrimaryColor}
          defaultColor="#1E40AF"
        />
```

**Step 3: Remove logo URL field**

Delete lines 115-130 (the logo URL section entirely).

**Step 4: Update save handler**

The save handler already only sends `is_active` and `primary_color`, so no changes needed. Remove the `logoUrl` state variable if it exists.

**Step 5: Verify final SettingsPanel code**

The component should now have:
- is_active toggle (unchanged)
- ColorPickerField for primary_color
- NO logo_url field
- Save button (unchanged)

**Step 6: Commit SettingsPanel changes**

```bash
git add components/admin/settings-panel.tsx
git commit -m "refactor(admin): update SettingsPanel with ColorPickerField

- Replace primary color text input with ColorPickerField component
- Remove logo URL field (moved to Info tab)
- Only manages: is_active and primary_color

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update CommunityForm Component

**Files:**
- Modify: `components/admin/community-form.tsx:1-196`

**Step 1: Import ImageUploadField component**

Add import at the top of the file:

```typescript
import { ImageUploadField } from '@/components/ui/image-upload-field'
```

**Step 2: Remove old logo_url text input**

Delete lines 159-173 (the logo_url Input section).

**Step 3: Add ImageUploadField after description field**

Add this code after the description Textarea (around line 157, before the submit buttons div):

```typescript
      <ImageUploadField
        label="Logo de la Comunidad"
        value={formData.logo_url}
        onChange={(url) => setFormData({ ...formData, logo_url: url })}
        bucket="community-images"
        maxSizeMB={5}
        aspectRatio="1/1"
        maxWidth="200px"
      />
```

**Step 4: Verify form submission**

The form submission already sends `logo_url` in the formData, so no changes needed to the handleSubmit function.

**Step 5: Commit CommunityForm changes**

```bash
git add components/admin/community-form.tsx
git commit -m "feat(admin): add logo upload to CommunityForm

- Replace logo URL text input with ImageUploadField component
- Upload logos directly to Supabase community-images bucket
- Image preview, replace, and delete functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Manual Testing

**Files:**
- Test: Community admin interface in development mode

**Step 1: Start development server**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Navigate to community admin**

1. Login as super admin or community admin
2. Go to `/admin/communities/[community-id]`
3. Verify tabs: Información, Límites, Configuración

Expected: All three tabs visible

**Step 3: Test ColorPickerField in Settings tab**

1. Click "Configuración" tab
2. Verify "Color Primario" section has:
   - Color picker input (native)
   - Hex text input
   - Preview swatch
3. Click color picker → select new color
4. Verify hex input updates
5. Type hex code (e.g., #FF0000) in text input
6. Verify color picker updates
7. Type invalid hex (e.g., "xyz")
8. Verify error message appears
9. Click "Guardar Configuración"
10. Verify success toast
11. Refresh page
12. Verify color persisted

Expected: All color picker interactions work, color saves correctly

**Step 4: Test logo field removed from Settings**

1. In "Configuración" tab
2. Verify NO "URL del Logo" field exists

Expected: Logo field completely removed from Settings tab

**Step 5: Test ImageUploadField in Info tab**

1. Click "Información" tab
2. Verify "Logo de la Comunidad" section exists
3. If no logo exists:
   - Verify upload area with dashed border
   - Click to select image
   - Choose valid image (<5MB, JPG/PNG/WebP)
   - Verify loading spinner appears
   - Verify success toast
   - Verify image preview appears
4. With logo present:
   - Verify image preview displays
   - Click "Cambiar" button
   - Upload new image
   - Verify image updates
   - Click X (delete) button
   - Verify image removed, upload area returns

Expected: All image upload interactions work correctly

**Step 6: Test error cases**

1. Try uploading file >5MB
   - Expected: Error toast "La imagen es muy grande (máximo 5MB)"
2. Try uploading non-image file (e.g., .pdf)
   - Expected: Error toast "Solo se permiten imágenes (JPG, PNG, WebP)"
3. Disconnect internet, try upload
   - Expected: Error toast "Error de conexión al subir imagen"

**Step 7: Test form submission with logo**

1. Upload logo in Info tab
2. Fill other required fields (if creating new)
3. Click "Guardar Cambios" / "Crear Comunidad"
4. Verify success
5. Refresh page
6. Verify logo persisted

Expected: Logo saves to database correctly

**Step 8: Test with existing community**

1. Edit existing community with logo_url
2. Verify logo displays in preview
3. Change logo
4. Verify new logo saves
5. Delete logo
6. Verify logo removed from database

Expected: Existing logos load and can be updated/deleted

**Step 9: Verify no duplicate logo field**

1. Check Info tab - has logo upload
2. Check Settings tab - NO logo field
3. Verify both tabs save correctly independently

Expected: Logo only in Info tab, no confusion

**Step 10: Test create mode vs edit mode**

1. Create new community with logo upload
   - Expected: Works correctly
2. Edit existing community with logo
   - Expected: Loads current logo, can update

**Step 11: Document test results**

Create checklist of all tests:
- [ ] ColorPickerField: Pick color with native picker → updates hex
- [ ] ColorPickerField: Type hex → updates picker and preview
- [ ] ColorPickerField: Invalid hex → shows error
- [ ] ColorPickerField: Save → persists to database
- [ ] Settings: No logo field present
- [ ] ImageUploadField: Upload new logo → success
- [ ] ImageUploadField: Replace logo → updates image
- [ ] ImageUploadField: Delete logo → removes image
- [ ] ImageUploadField: File too large → error toast
- [ ] ImageUploadField: Invalid format → error toast
- [ ] Info tab: Logo field present and working
- [ ] Form submission: Logo saves correctly
- [ ] Edit mode: Existing logo loads
- [ ] Create mode: Can upload logo

**Step 12: Commit test results (if creating test checklist file)**

If you create a test checklist file, commit it:

```bash
git add docs/testing/community-admin-improvements-tests.md
git commit -m "docs: add manual testing checklist for community admin improvements

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Final Verification & Cleanup

**Files:**
- Review: All modified files

**Step 1: Verify all changes are committed**

```bash
git status
```

Expected: No uncommitted changes (or only untracked files)

**Step 2: Review commit history**

```bash
git log --oneline -6
```

Expected: 4-5 commits:
1. feat(ui): add ColorPickerField component
2. feat(ui): add ImageUploadField component
3. refactor(admin): update SettingsPanel with ColorPickerField
4. feat(admin): add logo upload to CommunityForm
5. (optional) docs: add manual testing checklist

**Step 3: Check for TypeScript errors**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 4: Check for ESLint errors**

```bash
npm run lint
```

Expected: No linting errors (or only warnings)

**Step 5: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes successfully

**Step 6: Final verification checklist**

- [ ] ColorPickerField component created in components/ui/
- [ ] ImageUploadField component created in components/ui/
- [ ] SettingsPanel uses ColorPickerField
- [ ] SettingsPanel has NO logo field
- [ ] CommunityForm uses ImageUploadField for logo
- [ ] All components follow neo-brutalist styling
- [ ] All error cases handled with toasts
- [ ] TypeScript types correct
- [ ] No build errors
- [ ] All manual tests passed

**Step 7: Push to remote (optional)**

If ready to push:

```bash
git push origin master
```

---

## Success Criteria

**Implementation complete when:**
- [x] ColorPickerField component created and styled
- [x] ImageUploadField component created and functional
- [x] SettingsPanel uses ColorPickerField for primary_color
- [x] SettingsPanel has NO logo_url field
- [x] CommunityForm uses ImageUploadField for logo
- [x] Logo field ONLY in Info tab (not Settings)
- [x] All error cases handled gracefully
- [x] Neo-brutalist styling consistent across components
- [x] Manual testing checklist completed
- [x] No TypeScript or build errors

**User experience improvements:**
- Faster logo setup (no external upload needed)
- Visual color picker (no manual hex entry required)
- No confusion from duplicate logo fields
- Consistent with business registration UX

---

## Troubleshooting

**If ImageUploadField upload fails:**
- Check `/api/upload/community` endpoint exists
- Verify Supabase `community-images` bucket exists
- Check browser network tab for error details
- Verify user is authenticated

**If ColorPickerField doesn't sync:**
- Check browser console for errors
- Verify hex validation regex is correct
- Test with different browsers (color picker support varies)

**If styles look wrong:**
- Verify Tailwind classes are correct
- Check `globals.css` for brutalist utility classes
- Clear browser cache and rebuild

**If form doesn't save:**
- Check API endpoint logs
- Verify database schema allows null for logo_url
- Check browser network tab for API errors

---

## Notes

**Reusable components:** Both ColorPickerField and ImageUploadField are designed to be reusable for future features:
- Cover image upload for communities
- Category icon uploads
- Profile picture improvements
- Any other single-image upload needs

**No breaking changes:** All changes are backward compatible with existing communities that have logo URLs or primary colors.

**API endpoints:** No changes needed to existing API routes - they already support the logo_url and primary_color fields.
