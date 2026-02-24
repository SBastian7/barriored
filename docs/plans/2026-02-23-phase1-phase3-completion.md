# Phase 1 & 3 Feature Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete missing Phase 1 & 3 features: user profile system, community post image uploads, edit/delete UI, logout fix, and push notifications.

**Architecture:** Incremental feature addition extending existing patterns. Reuse upload infrastructure with new Supabase Storage buckets. Add UI layers on top of existing API routes. Service worker for push notifications.

**Tech Stack:** Next.js 16, React 19, Supabase (Storage, Auth, PostgreSQL), TypeScript, Tailwind CSS, web-push, react-hook-form, Zod

---

## Prerequisites

### Task 0: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install web-push package**

Run:
```bash
npm install web-push@^3.6.7
npm install --save-dev @types/web-push@^3.6.3
```

Expected: Packages installed successfully

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add web-push dependency for push notifications"
```

---

## Part 1: Database Setup & Logout Fix

### Task 1: Create Supabase Storage Buckets

**Files:**
- Manual: Supabase Dashboard

**Step 1: Create community-images bucket**

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `community-images`
4. Public: Yes
5. File size limit: 5242880 (5MB)
6. Allowed MIME types: `image/jpeg,image/png,image/webp`

**Step 2: Create profile-images bucket**

1. Click "New bucket"
2. Name: `profile-images`
3. Public: Yes
4. File size limit: 2097152 (2MB)
5. Allowed MIME types: `image/jpeg,image/png,image/webp`

**Step 3: Set RLS policies for community-images**

Go to Storage → community-images → Policies

Policy 1 - INSERT:
```sql
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');
```

Policy 2 - SELECT:
```sql
CREATE POLICY "Public can view community images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-images');
```

Policy 3 - DELETE:
```sql
CREATE POLICY "Users can delete their own community images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Step 4: Set RLS policies for profile-images**

Go to Storage → profile-images → Policies

Policy 1 - INSERT:
```sql
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');
```

Policy 2 - SELECT:
```sql
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

Policy 3 - DELETE:
```sql
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Step 5: Document completion**

Create file to track bucket creation:
```bash
echo "✓ community-images bucket created" > .storage-buckets-created
echo "✓ profile-images bucket created" >> .storage-buckets-created
git add .storage-buckets-created
git commit -m "chore: create Supabase storage buckets for community and profile images"
```

---

### Task 2: Create push_subscriptions Table

**Files:**
- Create: `supabase/migrations/[timestamp]_create_push_subscriptions.sql`

**Step 1: Create migration file**

Create file `supabase/migrations/20260223000001_create_push_subscriptions.sql`:

```sql
-- Create push_subscriptions table for browser push notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Index for faster lookups by user
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all subscriptions (for sending notifications)
CREATE POLICY "Admins can read all push subscriptions"
ON push_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Step 2: Apply migration**

Run:
```bash
npx supabase db push
```

Expected: Migration applied successfully

**Step 3: Update database types**

Run:
```bash
npx supabase gen types typescript --local > lib/types/database.ts
```

Expected: Types generated with push_subscriptions table

**Step 4: Commit**

```bash
git add supabase/migrations/20260223000001_create_push_subscriptions.sql lib/types/database.ts
git commit -m "feat: add push_subscriptions table for browser notifications"
```

---

### Task 3: Fix Logout State Update

**Files:**
- Modify: `components/layout/user-menu.tsx:60-64`

**Step 1: Update handleSignOut function**

In `components/layout/user-menu.tsx`, modify the `handleSignOut` function:

```typescript
async function handleSignOut() {
  setUserState(null)  // Clear local state immediately
  await supabase.auth.signOut()
  router.push('/')
  router.refresh()
}
```

**Step 2: Test logout manually**

1. Start dev server: `npm run dev`
2. Log in to the app
3. Click logout
4. Verify UserMenu immediately shows logged-out state (no flash of logged-in UI)

Expected: Immediate UI update

**Step 3: Commit**

```bash
git add components/layout/user-menu.tsx
git commit -m "fix: immediately update UI state on logout"
```

---

## Part 2: Upload API Routes

### Task 4: Create Community Image Upload API

**Files:**
- Create: `app/api/upload/community/route.ts`

**Step 1: Create community upload route**

Create file `app/api/upload/community/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuid } from 'uuid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Solo se permiten imágenes (JPG, PNG, WebP)' },
      { status: 400 }
    )
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen es muy grande (máximo 5MB)' },
      { status: 400 }
    )
  }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${uuid()}.${ext}`

  const { data, error } = await supabase.storage
    .from('community-images')
    .upload(path, file)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('community-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
```

**Step 2: Test upload endpoint**

Manual test:
1. Start dev server
2. Use curl or Postman to test upload:
```bash
# Get auth token from browser dev tools (Application > Local Storage > supabase.auth.token)
curl -X POST http://localhost:3000/api/upload/community \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test-image.jpg"
```

Expected: Returns `{ "url": "https://..." }`

**Step 3: Commit**

```bash
git add app/api/upload/community/route.ts
git commit -m "feat: add community image upload API endpoint"
```

---

### Task 5: Create Profile Image Upload API

**Files:**
- Create: `app/api/upload/profile/route.ts`

**Step 1: Create profile upload route**

Create file `app/api/upload/profile/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Solo se permiten imágenes (JPG, PNG, WebP)' },
      { status: 400 }
    )
  }

  // Validate file size (2MB for avatars)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen es muy grande (máximo 2MB)' },
      { status: 400 }
    )
  }

  // Delete old avatar if exists
  const { data: existingFiles } = await supabase.storage
    .from('profile-images')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`)
    await supabase.storage
      .from('profile-images')
      .remove(filesToDelete)
  }

  // Upload new avatar (always named avatar.{ext})
  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
```

**Step 2: Test upload endpoint**

Manual test similar to Task 4 but with smaller image (<2MB):
```bash
curl -X POST http://localhost:3000/api/upload/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/avatar.jpg"
```

Expected: Returns `{ "url": "https://..." }` and deletes old avatar

**Step 3: Commit**

```bash
git add app/api/upload/profile/route.ts
git commit -m "feat: add profile avatar upload API endpoint with auto-delete old avatar"
```

---

## Part 3: Profile System

### Task 6: Create Profile API Route

**Files:**
- Create: `app/api/profile/route.ts`

**Step 1: Create profile API route**

Create file `app/api/profile/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+57\d{10}$/, 'Formato inválido. Debe ser +57XXXXXXXXXX').optional(),
  avatar_url: z.string().url().optional().or(z.literal('')).optional(),
  community_id: z.string().uuid().optional().or(z.literal('')).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, community_id, role')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...profile,
    email: user.email,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // If community_id is provided, validate it exists
  if (parsed.data.community_id && parsed.data.community_id !== '') {
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('id', parsed.data.community_id)
      .single()

    if (!community) {
      return NextResponse.json(
        { error: { community_id: ['Comunidad no encontrada'] } },
        { status: 400 }
      )
    }
  }

  // Convert empty string to null for community_id
  const updateData = {
    ...parsed.data,
    community_id: parsed.data.community_id === '' ? null : parsed.data.community_id,
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select('id, full_name, phone, avatar_url, community_id, role')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    email: user.email,
  })
}
```

**Step 2: Test GET endpoint**

```bash
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns profile data with email

**Step 3: Test PATCH endpoint**

```bash
curl -X PATCH http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","phone":"+573001234567"}'
```

Expected: Returns updated profile

**Step 4: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add profile API route for GET and PATCH"
```

---

### Task 7: Create Avatar Upload Component

**Files:**
- Create: `components/profile/avatar-upload.tsx`

**Step 1: Create avatar upload component**

Create file `components/profile/avatar-upload.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { User, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  currentAvatar: string | null
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ currentAvatar, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatar)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe pesar más de 2MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WebP')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al subir imagen')
        return
      }

      setPreview(data.url)
      onUploadComplete(data.url)
      toast.success('Avatar actualizado')
    } catch (error) {
      toast.error('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          'relative w-24 h-24 border-4 border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          uploading && 'opacity-50'
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-accent/20 flex items-center justify-center">
            <User className="h-12 w-12 text-black/40" />
          </div>
        )}
      </div>

      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
          asChild
        >
          <span>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Cambiar Foto
              </>
            )}
          </span>
        </Button>
      </label>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/profile/avatar-upload.tsx
git commit -m "feat: add avatar upload component"
```

---

### Task 8: Create Profile Form Component

**Files:**
- Create: `components/profile/profile-form.tsx`

**Step 1: Create profile form component**

Create file `components/profile/profile-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AvatarUpload } from './avatar-upload'
import { Loader2, Save, X } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().regex(/^\+57\d{10}$/, 'Formato inválido. Debe ser +57XXXXXXXXXX').optional().or(z.literal('')),
  avatar_url: z.string().optional(),
  community_id: z.string().uuid().optional().or(z.literal('')).nullable(),
})

type ProfileFormData = z.infer<typeof profileSchema>

type Props = {
  profile: {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    community_id: string | null
    email: string
  }
  communities: Array<{ id: string; name: string }>
  onCancel: () => void
  onSave: () => void
}

export function ProfileForm({ profile, communities, onCancel, onSave }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      avatar_url: profile.avatar_url || '',
      community_id: profile.community_id || '',
    },
  })

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone || undefined,
          avatar_url: data.avatar_url || undefined,
          community_id: data.community_id || null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.full_name?.[0] || result.error?.phone?.[0] || 'Error al actualizar perfil')
      }

      toast.success('Perfil actualizado correctamente')
      onSave()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex justify-center">
        <AvatarUpload
          currentAvatar={watch('avatar_url') || null}
          onUploadComplete={(url) => setValue('avatar_url', url)}
        />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="font-black uppercase tracking-widest text-xs">
            Nombre Completo
          </Label>
          <Input
            id="full_name"
            placeholder="Tu nombre completo"
            {...register('full_name')}
            className={errors.full_name ? 'border-primary' : ''}
          />
          {errors.full_name && (
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-black uppercase tracking-widest text-xs">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            value={profile.email}
            disabled
            className="bg-black/5 cursor-not-allowed"
          />
          <p className="text-[10px] text-black/40 font-bold italic">
            El correo no se puede cambiar
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="font-black uppercase tracking-widest text-xs">
            Teléfono (Opcional)
          </Label>
          <PhoneInput
            value={watch('phone') || ''}
            onChange={(val) => setValue('phone', val)}
            placeholder="312 345 6789"
            error={errors.phone?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="community_id" className="font-black uppercase tracking-widest text-xs">
            Comunidad Predeterminada (Opcional)
          </Label>
          <Select
            onValueChange={(v) => setValue('community_id', v)}
            defaultValue={watch('community_id') || ''}
          >
            <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
              <SelectValue placeholder="Selecciona tu comunidad" />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="">Ninguna</SelectItem>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t-2 border-black">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar Cambios
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-12 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest"
        >
          <X className="mr-2 h-5 w-5" />
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

**Step 2: Commit**

```bash
git add components/profile/profile-form.tsx
git commit -m "feat: add profile form component with validation"
```

---

### Task 9: Create Profile Page

**Files:**
- Create: `app/profile/page.tsx`

**Step 1: Create profile page**

Create file `app/profile/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from './profile-view'

export const metadata = {
  title: 'Mi Perfil | BarrioRed',
  description: 'Administra tu perfil de usuario',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, community_id, role')
    .eq('id', user.id)
    .single()

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name')
    .order('name')

  return (
    <ProfileView
      profile={{
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        community_id: profile?.community_id || null,
        email: user.email || '',
        role: profile?.role || 'user',
      }}
      communities={communities || []}
    />
  )
}
```

**Step 2: Create profile view component**

Create file `app/profile/profile-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'
import { User, Edit } from 'lucide-react'

type Props = {
  profile: {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    community_id: string | null
    email: string
    role: string
  }
  communities: Array<{ id: string; name: string }>
}

export function ProfileView({ profile, communities }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  const selectedCommunity = communities.find((c) => c.id === profile.community_id)

  function handleSave() {
    setIsEditing(false)
    router.refresh()
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: 'BarrioRed', href: '/' },
          { label: 'Mi Perfil', active: true },
        ]}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter leading-none">
            Mi Perfil
          </h1>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Perfil
            </Button>
          )}
        </div>

        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {isEditing ? (
            <ProfileForm
              profile={profile}
              communities={communities}
              onCancel={() => setIsEditing(false)}
              onSave={handleSave}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-24 h-24 border-4 border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                      <User className="h-12 w-12 text-black/40" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Nombre
                  </p>
                  <p className="text-xl font-heading font-black uppercase italic">
                    {profile.full_name || 'Sin nombre'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Correo Electrónico
                  </p>
                  <p className="text-lg font-bold">{profile.email}</p>
                </div>

                {profile.phone && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                      Teléfono
                    </p>
                    <p className="text-lg font-bold">{profile.phone}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Comunidad Predeterminada
                  </p>
                  <p className="text-lg font-bold">
                    {selectedCommunity?.name || 'Ninguna'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    Rol
                  </p>
                  <span className="inline-block bg-secondary text-black px-3 py-1 border-2 border-black uppercase tracking-widest text-xs font-black">
                    {profile.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Test profile page manually**

1. Navigate to `/profile` while logged in
2. Verify view mode shows profile data
3. Click "Editar Perfil" to enter edit mode
4. Make changes and save
5. Verify changes persist after refresh

Expected: Full profile CRUD workflow works

**Step 4: Commit**

```bash
git add app/profile/page.tsx app/profile/profile-view.tsx
git commit -m "feat: add profile page with view and edit modes"
```

---

### Task 10: Add Profile Link to UserMenu

**Files:**
- Modify: `components/layout/user-menu.tsx:95-100`

**Step 1: Add profile menu item**

In `components/layout/user-menu.tsx`, add a new menu item after line 94:

```typescript
<DropdownMenuItem asChild>
  <Link href="/profile" className="flex items-center gap-2 w-full">
    <User className="h-4 w-4" />
    Mi Perfil
  </Link>
</DropdownMenuItem>
```

The updated menu section should look like:

```typescript
<DropdownMenuItem asChild>
  <Link href="/profile" className="flex items-center gap-2 w-full">
    <User className="h-4 w-4" />
    Mi Perfil
  </Link>
</DropdownMenuItem>
<DropdownMenuItem asChild>
  <Link href="/dashboard" className="flex items-center gap-2 w-full">
    <LayoutDashboard className="h-4 w-4" />
    Mi Panel
  </Link>
</DropdownMenuItem>
```

**Step 2: Test menu link**

1. Click user menu
2. Verify "Mi Perfil" option appears
3. Click it and verify navigation to /profile

Expected: Profile link works

**Step 3: Commit**

```bash
git add components/layout/user-menu.tsx
git commit -m "feat: add profile link to user menu"
```

---

## Part 4: Community Post Image Upload

### Task 11: Create Image Upload Field Component

**Files:**
- Create: `components/community/image-upload-field.tsx`

**Step 1: Create image upload field**

Create file `components/community/image-upload-field.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Upload, Loader2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  error?: string
}

export function ImageUploadField({ value, onChange, label, error }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe pesar más de 5MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WebP')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/community', {
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
      toast.error('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="font-black uppercase tracking-widest text-xs">
          {label}
        </Label>
      )}

      {value ? (
        <div className="relative aspect-video w-full border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
          <Image
            src={value}
            alt="Imagen subida"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white border-2 border-black p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            'aspect-video w-full border-4 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm font-black uppercase tracking-widest text-black/40">
                Subiendo...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus className="h-8 w-8 text-black/30" />
              <span className="text-sm font-black uppercase tracking-widest text-black/40">
                Subir Imagen
              </span>
              <span className="text-xs text-black/30">
                JPG, PNG o WebP (máx. 5MB)
              </span>
            </div>
          )}
        </label>
      )}

      {error && (
        <p className="text-primary text-[10px] font-black uppercase tracking-widest">
          {error}
        </p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/community/image-upload-field.tsx
git commit -m "feat: add image upload field component for community posts"
```

---

### Task 12: Update PostForm to Use File Upload

**Files:**
- Modify: `components/community/post-form.tsx:105-116`

**Step 1: Import ImageUploadField**

Add to imports at top of file:

```typescript
import { ImageUploadField } from './image-upload-field'
```

**Step 2: Replace URL input with ImageUploadField**

Replace lines 105-116 (the image_url input section) with:

```typescript
<ImageUploadField
  value={watch('image_url') || null}
  onChange={(url) => setValue('image_url', url || '')}
  label="Imagen (Opcional)"
/>
```

**Step 3: Test image upload in post form**

1. Navigate to create announcement/event/job page
2. Click "Subir Imagen" area
3. Select image file
4. Verify upload and preview
5. Test removing image
6. Submit form and verify image URL saved

Expected: File upload replaces URL input

**Step 4: Commit**

```bash
git add components/community/post-form.tsx
git commit -m "feat: replace URL input with file upload in post form"
```

---

## Part 5: Edit/Delete Post UI

### Task 13: Create Post Edit Actions Component

**Files:**
- Create: `components/community/post-edit-actions.tsx`

**Step 1: Create post edit actions**

Create file `components/community/post-edit-actions.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  postId: string
  postType: 'announcement' | 'event' | 'job'
  communitySlug: string
  isAuthor: boolean
  isAdmin: boolean
}

export function PostEditActions({ postId, postType, communitySlug, isAuthor, isAdmin }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Only show if user is author or admin
  if (!isAuthor && !isAdmin) {
    return null
  }

  const postTypeSpanish = {
    announcement: 'anuncios',
    event: 'eventos',
    job: 'empleos',
  }[postType]

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Publicación eliminada correctamente')
      router.push(`/${communitySlug}/community/${postTypeSpanish}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar publicación')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Link href={`/${communitySlug}/community/${postTypeSpanish}/${postId}/edit`}>
        <Button
          variant="outline"
          size="sm"
          className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Button>
      </Link>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-3.5 w-3.5" />
            )}
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black uppercase italic text-2xl">
              ¿Eliminar publicación?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Esta acción no se puede deshacer. La publicación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs"
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/community/post-edit-actions.tsx
git commit -m "feat: add post edit actions component with delete confirmation"
```

---

### Task 14: Add Edit Actions to Announcement Detail Page

**Files:**
- Modify: `app/[community]/community/announcements/[id]/page.tsx`

**Step 1: Add server-side auth check**

Add after line 28 (after fetching supabase):

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

**Step 2: Check if user is author or admin**

Add after fetching post (around line 43):

```typescript
let isAuthor = false
let isAdmin = false

if (user) {
  isAuthor = post.author_id === user.id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  isAdmin = profile?.role === 'admin'
}
```

**Step 3: Import PostEditActions**

Add to imports:

```typescript
import { PostEditActions } from '@/components/community/post-edit-actions'
```

**Step 4: Add edit actions to page**

Add after the title (around line 73), before the author section:

```typescript
<div className="flex justify-end">
  <PostEditActions
    postId={post.id}
    postType="announcement"
    communitySlug={slug}
    isAuthor={isAuthor}
    isAdmin={isAdmin}
  />
</div>
```

**Step 5: Test edit/delete buttons**

1. Create a test announcement
2. View announcement detail page
3. Verify edit/delete buttons appear for author
4. Test as non-author (buttons hidden)
5. Test delete confirmation dialog

Expected: Buttons visible only to author/admin

**Step 6: Commit**

```bash
git add app/[community]/community/announcements/[id]/page.tsx
git commit -m "feat: add edit/delete actions to announcement detail page"
```

---

### Task 15: Add Edit Actions to Event Detail Page

**Files:**
- Modify: `app/[community]/community/events/[id]/page.tsx`

**Step 1: Follow same steps as Task 14**

Add auth check, author/admin check, import, and render PostEditActions with `postType="event"`.

**Step 2: Test**

Same testing as Task 14 but for events.

**Step 3: Commit**

```bash
git add app/[community]/community/events/[id]/page.tsx
git commit -m "feat: add edit/delete actions to event detail page"
```

---

### Task 16: Add Edit Actions to Job Detail Page

**Files:**
- Modify: `app/[community]/community/jobs/[id]/page.tsx`

**Step 1: Follow same steps as Task 14**

Add auth check, author/admin check, import, and render PostEditActions with `postType="job"`.

**Step 2: Test**

Same testing as Task 14 but for jobs.

**Step 3: Commit**

```bash
git add app/[community]/community/jobs/[id]/page.tsx
git commit -m "feat: add edit/delete actions to job detail page"
```

---

### Task 17: Create Post Edit Form Component

**Files:**
- Create: `components/community/post-edit-form.tsx`

**Step 1: Create post edit form**

Create file `components/community/post-edit-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUploadField } from './image-upload-field'
import { createPostSchema, type CreatePostInput } from '@/lib/validations/community'
import { Loader2, Save, X } from 'lucide-react'
import type { CommunityPost, EventMetadata, JobMetadata } from '@/lib/types'

type Props = {
  post: CommunityPost
  communitySlug: string
}

export function PostEditForm({ post, communitySlug }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      type: post.type as 'announcement' | 'event' | 'job',
      community_id: post.community_id,
      title: post.title,
      content: post.content,
      image_url: post.image_url || '',
      metadata: post.metadata as any,
    },
  })

  async function onSubmit(data: CreatePostInput) {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          image_url: data.image_url || null,
          metadata: data.metadata,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Error al actualizar')
      }

      toast.success('Publicación actualizada correctamente')
      const typeMap = {
        announcement: 'anuncios',
        event: 'eventos',
        job: 'empleos',
      }
      router.push(`/${communitySlug}/community/${typeMap[post.type as keyof typeof typeMap]}/${post.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const postType = watch('type')
  const jobMetadata = postType === 'job' ? (watch('metadata') as JobMetadata) : null
  const eventMetadata = postType === 'event' ? (watch('metadata') as EventMetadata) : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white border-4 border-black p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="font-black uppercase tracking-widest text-xs">
            Título de la Publicación
          </Label>
          <Input
            id="title"
            placeholder="Título"
            {...register('title')}
            className={errors.title ? 'border-primary' : ''}
          />
          {errors.title && (
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="font-black uppercase tracking-widest text-xs">
            Contenido / Descripción
          </Label>
          <Textarea
            id="content"
            placeholder="Escribe aquí todos los detalles..."
            rows={6}
            {...register('content')}
            className={errors.content ? 'border-primary' : ''}
          />
          {errors.content && (
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">
              {errors.content.message}
            </p>
          )}
        </div>

        <ImageUploadField
          value={watch('image_url') || null}
          onChange={(url) => setValue('image_url', url || '')}
          label="Imagen (Opcional)"
        />

        {/* Event metadata fields */}
        {postType === 'event' && (
          <div className="space-y-6 p-6 bg-accent/5 border-2 border-black border-dashed">
            <div className="space-y-2">
              <Label htmlFor="event-organizer" className="font-black uppercase tracking-widest text-xs">
                Organizador
              </Label>
              <Input
                id="event-organizer"
                placeholder="Organizador del evento"
                {...register('metadata.organizer' as any)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="event-date" className="font-black uppercase tracking-widest text-xs">
                  Fecha y Hora
                </Label>
                <Input
                  id="event-date"
                  type="datetime-local"
                  {...register('metadata.date' as any)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-location" className="font-black uppercase tracking-widest text-xs">
                  Lugar / Dirección
                </Label>
                <Input
                  id="event-location"
                  placeholder="Lugar del evento"
                  {...register('metadata.location' as any)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Job metadata fields */}
        {postType === 'job' && (
          <div className="space-y-6 p-6 bg-secondary/5 border-2 border-black border-dashed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="job-category" className="font-black uppercase tracking-widest text-xs">
                  Categoría
                </Label>
                <Input
                  id="job-category"
                  placeholder="Categoría del empleo"
                  {...register('metadata.category' as any)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-salary" className="font-black uppercase tracking-widest text-xs">
                  Rango Salarial (Opcional)
                </Label>
                <Input
                  id="job-salary"
                  placeholder="Ej: $1.300.000 + Prestaciones"
                  {...register('metadata.salary_range' as any)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/10">
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-xs">
                  Método de Contacto
                </Label>
                <Select
                  onValueChange={(v) => setValue('metadata.contact_method' as any, v)}
                  defaultValue={jobMetadata?.contact_method || 'whatsapp'}
                >
                  <SelectTrigger className="border-2 border-black rounded-none h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                    <SelectValue placeholder="Selecciona uno" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Llamada Telefónica</SelectItem>
                    <SelectItem value="email">Correo Electrónico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-contact-value" className="font-black uppercase tracking-widest text-xs">
                  Dato de Contacto
                </Label>
                {jobMetadata?.contact_method === 'email' ? (
                  <Input
                    id="job-contact-value"
                    type="email"
                    placeholder="nombre@correo.com"
                    {...register('metadata.contact_value' as any)}
                  />
                ) : (
                  <PhoneInput
                    value={watch('metadata.contact_value' as any) || ''}
                    onChange={(val) => setValue('metadata.contact_value' as any, val)}
                    placeholder="312 345 6789"
                    error={(errors as any).metadata?.contact_value?.message}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-6 border-t-4 border-black mt-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-14 text-lg border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-widest"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar Cambios
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1 h-14 text-lg border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-widest"
        >
          <X className="mr-2 h-5 w-5" />
          Cancelar
        </Button>
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 text-center italic">
        * Los cambios serán visibles inmediatamente después de guardar.
      </p>
    </form>
  )
}
```

**Step 2: Commit**

```bash
git add components/community/post-edit-form.tsx
git commit -m "feat: add post edit form component"
```

---

### Task 18: Create Announcement Edit Page

**Files:**
- Create: `app/[community]/community/announcements/[id]/edit/page.tsx`

**Step 1: Create edit page**

Create file `app/[community]/community/announcements/[id]/edit/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { PostEditForm } from '@/components/community/post-edit-form'
import type { CommunityPost } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('community_posts')
    .select('title')
    .eq('id', id)
    .single()

  if (!post) return {}
  return {
    title: `Editar: ${post.title} | BarrioRed`,
  }
}

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ community: string; id: string }>
}) {
  const { community: slug, id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single()
  if (!community) return notFound()

  const { data: postRes } = await supabase
    .from('community_posts')
    .select('*')
    .eq('id', id)
    .eq('community_id', community.id)
    .eq('type', 'announcement')
    .single()

  if (!postRes) return notFound()

  const post = postRes as unknown as CommunityPost

  // Check authorization: only author or admin can edit
  let canEdit = false
  if (post.author_id === user.id) {
    canEdit = true
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') canEdit = true
  }

  if (!canEdit) {
    redirect(`/${slug}/community/anuncios/${id}`)
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Comunidad', href: `/${slug}/community` },
          { label: 'Anuncios', href: `/${slug}/community/announcements` },
          { label: post.title, href: `/${slug}/community/anuncios/${id}` },
          { label: 'Editar', active: true },
        ]}
      />

      <div className="mt-8">
        <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter leading-none mb-8">
          Editar Anuncio
        </h1>

        <PostEditForm post={post} communitySlug={slug} />
      </div>
    </div>
  )
}
```

**Step 2: Test edit page**

1. Navigate to announcement detail page
2. Click "Editar" button
3. Verify form pre-fills with existing data
4. Make changes and save
5. Verify redirect to detail page with updated data

Expected: Edit flow works end-to-end

**Step 3: Commit**

```bash
git add app/[community]/community/announcements/[id]/edit/page.tsx
git commit -m "feat: add announcement edit page with authorization"
```

---

### Task 19: Create Event Edit Page

**Files:**
- Create: `app/[community]/community/events/[id]/edit/page.tsx`

**Step 1: Create edit page (similar to Task 18)**

Copy structure from announcement edit page, change:
- `eq('type', 'event')`
- Breadcrumb: 'Eventos' instead of 'Anuncios'
- Title: 'Editar Evento'

**Step 2: Test**

Same testing as Task 18 but for events.

**Step 3: Commit**

```bash
git add app/[community]/community/events/[id]/edit/page.tsx
git commit -m "feat: add event edit page with authorization"
```

---

### Task 20: Create Job Edit Page

**Files:**
- Create: `app/[community]/community/jobs/[id]/edit/page.tsx`

**Step 1: Create edit page (similar to Task 18)**

Copy structure from announcement edit page, change:
- `eq('type', 'job')`
- Breadcrumb: 'Empleos' instead of 'Anuncios'
- Title: 'Editar Empleo'

**Step 2: Test**

Same testing as Task 18 but for jobs.

**Step 3: Commit**

```bash
git add app/[community]/community/jobs/[id]/edit/page.tsx
git commit -m "feat: add job edit page with authorization"
```

---

## Part 6: Push Notifications

### Task 21: Generate VAPID Keys

**Files:**
- Create: `.env.local` (add keys)

**Step 1: Generate VAPID keys**

Run:
```bash
npx web-push generate-vapid-keys
```

Expected: Outputs public and private keys

**Step 2: Add to environment variables**

Add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BEd..."
VAPID_PRIVATE_KEY="ABC..."
```

**Step 3: Document completion**

```bash
echo "✓ VAPID keys generated and added to .env.local" > .vapid-keys-configured
git add .vapid-keys-configured
git commit -m "chore: generate and configure VAPID keys for push notifications"
```

Note: DO NOT commit .env.local to git

---

### Task 22: Create Service Worker

**Files:**
- Create: `public/service-worker.js`

**Step 1: Create service worker**

Create file `public/service-worker.js`:

```javascript
/* eslint-disable no-restricted-globals */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event)

  let data = {
    title: 'Notificación de BarrioRed',
    body: 'Tienes una nueva notificación',
    url: '/',
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
    tag: 'barriored-notification',
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if ('focus' in client) {
          return client.focus().then(() => client.navigate(url))
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
```

**Step 2: Register service worker in app**

Add to `app/layout.tsx` inside the body (client-side component needed):

Create `components/service-worker-register.tsx`:

```typescript
'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
```

Then import and use in `app/layout.tsx`:

```typescript
import { ServiceWorkerRegister } from '@/components/service-worker-register'

// Inside the body:
<ServiceWorkerRegister />
```

**Step 3: Test service worker registration**

1. Start dev server
2. Open browser dev tools → Application → Service Workers
3. Verify service worker registered

Expected: Service worker active

**Step 4: Commit**

```bash
git add public/service-worker.js components/service-worker-register.tsx app/layout.tsx
git commit -m "feat: add service worker for push notifications"
```

---

### Task 23: Create Push Notification Utilities

**Files:**
- Create: `lib/push-notifications.ts`

**Step 1: Create push utilities**

Create file `lib/push-notifications.ts`:

```typescript
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Este navegador no soporta notificaciones')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    throw new Error('Permisos de notificación denegados')
  }

  const permission = await Notification.requestPermission()
  return permission
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Save subscription to backend
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    })

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return false
  }
}
```

**Step 2: Commit**

```bash
git add lib/push-notifications.ts
git commit -m "feat: add push notification utility functions"
```

---

### Task 24: Create Subscribe Notification API

**Files:**
- Create: `app/api/notifications/subscribe/route.ts`

**Step 1: Create subscribe route**

Create file `app/api/notifications/subscribe/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { subscription } = await request.json()

  if (!subscription || !subscription.endpoint) {
    return NextResponse.json(
      { error: 'Suscripción inválida' },
      { status: 400 }
    )
  }

  // Upsert subscription
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,endpoint',
    }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Test subscribe endpoint**

Manual test:
1. Register service worker
2. Request notification permission
3. Subscribe to push
4. Verify subscription saved in push_subscriptions table

Expected: Subscription stored in database

**Step 3: Commit**

```bash
git add app/api/notifications/subscribe/route.ts
git commit -m "feat: add push subscription API endpoint"
```

---

### Task 25: Create Send Notification API

**Files:**
- Create: `app/api/notifications/send/route.ts`

**Step 1: Create send route**

Create file `app/api/notifications/send/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@barriored.co',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { community_id, title, body, url } = await request.json()

  if (!community_id || !title || !body) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    )
  }

  // Get all subscriptions for users in this community
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in(
      'user_id',
      supabase
        .from('profiles')
        .select('id')
        .eq('community_id', community_id)
    )

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json(
      { success: true, sent: 0, message: 'No hay suscriptores en esta comunidad' },
      { status: 200 }
    )
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/',
  })

  let sentCount = 0
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
      sentCount++
    } catch (error: any) {
      console.error('Failed to send notification:', error)
      // If subscription is invalid (410), delete it
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
      }
    }
  })

  await Promise.allSettled(sendPromises)

  return NextResponse.json({
    success: true,
    sent: sentCount,
  })
}
```

**Step 2: Test send endpoint**

Manual test:
1. Create subscription as regular user
2. Login as admin
3. POST to /api/notifications/send with community_id, title, body
4. Verify notification appears in browser

Expected: Push notification received

**Step 3: Commit**

```bash
git add app/api/notifications/send/route.ts
git commit -m "feat: add send push notification API endpoint for admins"
```

---

### Task 26: Add Push Subscription to Community Page

**Files:**
- Modify: `app/[community]/community/page.tsx`

**Step 1: Create client component for push prompt**

Create `components/community/push-notification-prompt.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { requestPermission, subscribeToPush } from '@/lib/push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, X } from 'lucide-react'

export function PushNotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      // Show prompt if permission not yet granted or denied
      if (Notification.permission === 'default') {
        setTimeout(() => setShowPrompt(true), 3000) // Show after 3 seconds
      }
    }
  }, [])

  async function handleEnable() {
    try {
      const perm = await requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        await subscribeToPush()
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
  }

  if (!showPrompt || permission !== 'default') {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:max-w-md bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 animate-in slide-in-from-bottom">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-black/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 border-2 border-black bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="font-heading font-black uppercase italic text-lg leading-tight">
            Recibe Alertas Importantes
          </h3>
          <p className="text-sm text-black/70">
            Activa las notificaciones para recibir alertas de seguridad, cortes de servicios y eventos importantes de tu comunidad.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleEnable}
              size="sm"
              className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
            >
              <Bell className="mr-2 h-3.5 w-3.5" />
              Activar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
            >
              Ahora No
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add to community page**

In `app/[community]/community/page.tsx`, import and add:

```typescript
import { PushNotificationPrompt } from '@/components/community/push-notification-prompt'

// At the end of the return, before closing div:
<PushNotificationPrompt />
```

**Step 3: Test notification prompt**

1. Navigate to community page
2. Wait 3 seconds
3. Verify prompt appears
4. Click "Activar" and grant permission
5. Verify subscription created

Expected: Prompt appears and subscribes user

**Step 4: Commit**

```bash
git add components/community/push-notification-prompt.tsx app/[community]/community/page.tsx
git commit -m "feat: add push notification prompt to community page"
```

---

## Part 7: Final Testing & Documentation

### Task 27: Manual Testing Checklist

**Step 1: Test all features**

Go through the testing checklist from design document:

User Profile:
- [ ] View profile shows correct data
- [ ] Edit mode works
- [ ] Avatar upload works
- [ ] Phone validation works
- [ ] Profile accessible from UserMenu and Dashboard
- [ ] Unauthorized redirect to login

Community Post Images:
- [ ] Upload works in all post types
- [ ] Preview shows after upload
- [ ] Delete removes file
- [ ] Validation works (size, type)

Edit/Delete Posts:
- [ ] Buttons visible to author/admin only
- [ ] Edit pre-fills data
- [ ] Save updates correctly
- [ ] Delete with confirmation works
- [ ] Non-author gets 403

Logout:
- [ ] Immediate UI update
- [ ] Redirect to home
- [ ] Auth cleared

Push Notifications:
- [ ] Permission prompt appears
- [ ] Subscription saves
- [ ] Notification received when alert created
- [ ] Click opens correct page
- [ ] Service worker registered

**Step 2: Document test results**

Create `TESTING.md` file with test results.

**Step 3: Commit**

```bash
git add TESTING.md
git commit -m "docs: add manual testing results"
```

---

### Task 28: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md**

Add to Phase 1 checklist:
- [x] View own user profile
- [x] Edit own user profile
- [x] Log out from account (state fixed)

Add to Phase 3 checklist:
- [x] Edit own announcement
- [x] Delete own announcement
- [x] Edit own event
- [x] Delete own event
- [x] Edit own job posting
- [x] Delete own job posting
- [x] Receive community alert notifications (push)
- [x] Image upload for community posts

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Phase 1 & 3 features as complete in CLAUDE.md"
```

---

### Task 29: Final Commit

**Step 1: Review all changes**

Run:
```bash
git log --oneline -20
```

Verify all commits are present.

**Step 2: Create summary commit**

```bash
git commit --allow-empty -m "feat: complete Phase 1 & 3 features

Implemented:
- User profile system (view, edit, avatar upload)
- Community post image uploads (file picker)
- Edit/delete UI for announcements, events, jobs
- Logout state fix
- Browser push notifications for community alerts

Resolves #[issue-number]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Execution Complete

All tasks completed! Features implemented:

✅ User profile view and edit
✅ Avatar upload to Supabase Storage
✅ Community post image upload
✅ Edit/delete UI for all post types
✅ Logout state fix
✅ Push notifications system
✅ Database migrations
✅ API routes
✅ Testing and documentation

**Next Steps:**
1. Deploy to staging environment
2. Create storage buckets in production Supabase
3. Generate production VAPID keys
4. Run database migration in production
5. Deploy to production
6. Monitor error logs
