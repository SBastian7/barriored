# Phase 1 & 3 Feature Completion - Design Document

**Date:** 2026-02-23
**Status:** Approved
**Implementation Approach:** Incremental Feature Addition

## Overview

This document details the design for completing missing Phase 1 (MVP Directorio) and Phase 3 (Red Vecinal) features in BarrioRed.

### Feature Set

1. **User Profile System** - View and edit user profile (name, phone, avatar, community)
2. **Community Post Image Upload** - File upload for announcements, events, jobs (like businesses)
3. **Edit/Delete Post UI** - UI for editing and deleting community posts (API already exists)
4. **Logout State Fix** - Fix Supabase auth state not updating on logout
5. **Push Notifications** - Browser push notifications for community alerts

## Architecture

### Implementation Strategy

- Extend existing patterns (minimal refactoring)
- Reuse upload infrastructure with new Supabase Storage buckets
- Add UI layers on top of existing API routes (PATCH/DELETE already exist)
- Service worker for push notification handling
- Independent feature development (can test separately)

### File Structure

```
app/
  profile/
    page.tsx                          # User profile view/edit
  [community]/community/
    announcements/[id]/
      edit/page.tsx                   # Edit announcement
    events/[id]/
      edit/page.tsx                   # Edit event
    jobs/[id]/
      edit/page.tsx                   # Edit job

api/
  upload/
    community/route.ts                # Community post image upload
    profile/route.ts                  # Profile avatar upload
  profile/
    route.ts                          # Get/update user profile
  notifications/
    subscribe/route.ts                # Save push subscription
    send/route.ts                     # Send push notification (admin)

components/
  profile/
    profile-form.tsx                  # Edit profile form
    avatar-upload.tsx                 # Avatar upload component
  community/
    image-upload-field.tsx            # Single image upload for posts
    post-edit-actions.tsx             # Edit/delete buttons
    post-edit-form.tsx                # Edit post form

lib/
  push-notifications.ts               # Push notification utilities

public/
  service-worker.js                   # Service worker for push notifications
```

## Database Changes

### New Table: `push_subscriptions`

```sql
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

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

### New Supabase Storage Buckets

1. **`community-images`** - For announcements, events, jobs images
   - Max file size: 5MB
   - Allowed types: JPEG, PNG, WebP
   - Public read access
   - Authenticated upload
   - Owner-only delete

2. **`profile-images`** - For user avatar uploads
   - Max file size: 2MB
   - Allowed types: JPEG, PNG, WebP
   - Public read access
   - Authenticated upload
   - Owner-only delete

### Storage Policies (RLS)

```sql
-- community-images bucket
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');

CREATE POLICY "Public can view community images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-images');

CREATE POLICY "Users can delete their own community images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- profile-images bucket
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Existing Tables (No Schema Changes)

- `community_posts.image_url` - Will store uploaded file URLs instead of external URLs
- `profiles.avatar_url` - Will store uploaded avatar URLs

## API Routes

### Upload Routes

#### `POST /api/upload/community`

**Purpose:** Upload single image for community posts

**Request:**
- Content-Type: multipart/form-data
- Body: file (image file)

**Validation:**
- Max size: 5MB
- Allowed types: image/jpeg, image/png, image/webp
- Auth required

**Response:**
```json
{
  "url": "https://[supabase-url]/storage/v1/object/public/community-images/[user-id]/[uuid].jpg"
}
```

**Error Responses:**
- 401: Not authenticated
- 400: Invalid file type or size
- 500: Upload failed

#### `POST /api/upload/profile`

**Purpose:** Upload avatar for user profile

**Request:**
- Content-Type: multipart/form-data
- Body: file (image file)

**Validation:**
- Max size: 2MB
- Allowed types: image/jpeg, image/png, image/webp
- Auth required
- Auto-deletes old avatar if exists

**Response:**
```json
{
  "url": "https://[supabase-url]/storage/v1/object/public/profile-images/[user-id]/avatar.jpg"
}
```

### Profile Routes

#### `GET /api/profile`

**Purpose:** Fetch current user's profile

**Auth:** Required

**Response:**
```json
{
  "id": "uuid",
  "full_name": "string",
  "phone": "+57...",
  "avatar_url": "string | null",
  "community_id": "uuid | null",
  "role": "user | admin",
  "email": "string"
}
```

#### `PATCH /api/profile`

**Purpose:** Update current user's profile

**Auth:** Required

**Request Body:**
```json
{
  "full_name": "string (optional, min 2 chars)",
  "phone": "string (optional, Colombian format)",
  "avatar_url": "string (optional)",
  "community_id": "uuid (optional)"
}
```

**Validation:**
- Phone must match Colombian format (+57...)
- full_name min 2 characters
- community_id must exist in communities table

**Response:** Updated profile object

### Push Notification Routes

#### `POST /api/notifications/subscribe`

**Purpose:** Save push subscription for current user

**Auth:** Required

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "string",
    "keys": {
      "p256dh": "string",
      "auth": "string"
    }
  }
}
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:** Upserts subscription (updates if exists, inserts if new)

#### `POST /api/notifications/send`

**Purpose:** Send push notification (admin only)

**Auth:** Required (admin role)

**Request Body:**
```json
{
  "community_id": "uuid",
  "title": "string",
  "body": "string",
  "url": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 42
}
```

**Behavior:**
- Fetches all push subscriptions for community
- Sends push notification using Web Push protocol
- Returns count of successful sends

### Existing Routes (Reused)

- `PATCH /api/community/posts/[id]` - Edit post (already exists)
- `DELETE /api/community/posts/[id]` - Delete post (already exists)

## Component Design

### Profile Components

#### `app/profile/page.tsx`

**Purpose:** User profile view and edit page

**Features:**
- View/edit mode toggle (same page)
- Displays: avatar, full_name, email (readonly), phone, community
- "Editar Perfil" button switches to edit mode
- "Guardar Cambios" / "Cancelar" in edit mode
- Neo-brutalist styling (brutalist-card, borders, shadows)
- Breadcrumbs: BarrioRed > Mi Perfil

**Access:**
- Route: `/profile`
- Auth required (redirect to /auth/login if not authenticated)
- Accessible from UserMenu dropdown and Dashboard sidebar

#### `components/profile/profile-form.tsx`

**Purpose:** Profile edit form

**Fields:**
- full_name (Input)
- phone (PhoneInput component)
- community_id (Select dropdown)
- avatar (AvatarUpload component)

**Validation:**
- react-hook-form + Zod
- Phone: Colombian format (+57...)
- full_name: min 2 chars, max 100
- community_id: valid UUID or null

**Submit:**
- PATCH /api/profile
- Toast success/error
- Revalidate profile data

#### `components/profile/avatar-upload.tsx`

**Purpose:** Avatar upload component

**Features:**
- Circular preview (96x96px)
- Click to upload or change
- Shows current avatar or User icon placeholder
- Upload button with loading state
- File validation (max 2MB, JPEG/PNG/WebP)
- Deletes old avatar on new upload

**Pattern:** Simplified version of StepPhotos (single image only)

### Community Post Components

#### `components/community/image-upload-field.tsx`

**Purpose:** Single image upload for community posts

**Features:**
- Replaces URL input field in post-form.tsx
- Preview thumbnail (aspect-video, bordered)
- "Subir Imagen" button or drag-drop zone
- Upload progress indicator
- "Eliminar" button to remove image
- File validation (max 5MB, JPEG/PNG/WebP)

**Integration:**
- Used in PostForm component
- Used in PostEditForm component
- Uploads to /api/upload/community

#### `components/community/post-edit-actions.tsx`

**Purpose:** Edit and delete buttons for post detail pages

**Features:**
- Only visible to post author or admin
- "Editar" button (Pencil icon) → navigates to edit page
- "Eliminar" button (Trash icon) → confirmation dialog → DELETE API
- Brutalist button styling with icons
- Positioned at top-right of post detail

**Authorization Check:**
- Fetch current user
- Show if user.id === post.author_id OR user.role === 'admin'

#### `components/community/post-edit-form.tsx`

**Purpose:** Form for editing existing posts

**Features:**
- Reuses PostForm structure and validation
- Pre-filled with existing post data
- Same fields as create form
- "Guardar Cambios" button instead of "Publicar"
- Shows updated_at timestamp after save
- Cancel button returns to detail page

**Submit:**
- PATCH /api/community/posts/[id]
- Toast success/error
- Navigate back to detail page on success

### Edit Pages

#### Structure (x3 pages)
- `app/[community]/community/announcements/[id]/edit/page.tsx`
- `app/[community]/community/events/[id]/edit/page.tsx`
- `app/[community]/community/jobs/[id]/edit/page.tsx`

**Features:**
- Server-side auth check (redirect if not owner/admin)
- Fetch existing post data
- Render PostEditForm with pre-filled data
- Breadcrumbs: [Community] > Comunidad > [Type] > [Title] > Editar

## Push Notifications Implementation

### Service Worker

#### `public/service-worker.js`

**Features:**
- Listens for 'push' events
- Displays notification with title, body, icon
- Notification click opens specified URL or community page
- Background sync for offline support
- Caches BarrioRed logo for notification icon

**Code Pattern:**
```javascript
self.addEventListener('push', event => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { url: data.url }
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})
```

### Push Utilities

#### `lib/push-notifications.ts`

**Functions:**

1. `requestPermission()` - Request browser permission
2. `subscribeToPush()` - Create subscription and save to backend
3. `unsubscribeFromPush()` - Remove subscription
4. `urlBase64ToUint8Array(base64String)` - Helper for VAPID key

**Environment Variables:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public VAPID key
- `VAPID_PRIVATE_KEY` - Private VAPID key (server-side only)

**Usage Pattern:**
```typescript
// On community page load
useEffect(() => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    requestPermission()
      .then(() => subscribeToPush())
      .catch(console.error)
  }
}, [])
```

### Notification Flow

1. User visits community page
2. Prompt for notification permission (if not already granted)
3. User accepts → create push subscription
4. POST subscription to `/api/notifications/subscribe`
5. Admin creates/activates community alert
6. Server sends push to all community subscribers via `/api/notifications/send`
7. Browser shows notification (even if tab closed)
8. User clicks notification → opens community alerts page

### Trigger Points

- Admin creates new `community_alert` with `is_active: true`
- Admin activates existing alert (updates `is_active` to true)
- Sent only to users subscribed to that specific community

### Dependencies

```json
{
  "dependencies": {
    "web-push": "^3.6.7"
  }
}
```

## Logout Fix

### Issue

`supabase.auth.signOut()` doesn't immediately update local state in UserMenu component, causing UI to briefly show logged-in state.

### Solution

**File:** `components/layout/user-menu.tsx`

**Change:**
```typescript
async function handleSignOut() {
  setUserState(null)  // Clear local state BEFORE signOut
  await supabase.auth.signOut()
  router.push('/')
  router.refresh()
}
```

**Explanation:**
1. Set local state to null immediately (updates UI instantly)
2. Call signOut to clear Supabase session
3. Navigate to homepage
4. Refresh to reset server state

## Testing Strategy

### Manual Testing Checklist

#### User Profile
- [ ] View profile shows correct user data
- [ ] Edit mode toggles correctly
- [ ] Avatar upload works (file picker, preview, save)
- [ ] Avatar deletion removes old file from storage
- [ ] Phone validation enforces Colombian format
- [ ] Profile updates persist after save
- [ ] Profile accessible from UserMenu and Dashboard
- [ ] Unauthorized users cannot access /profile (redirect to login)

#### Community Post Images
- [ ] Image upload works in announcement/event/job forms
- [ ] Image preview shows after upload
- [ ] Image deletion removes file from storage
- [ ] Max 5MB validation shows error for large files
- [ ] Only JPEG/PNG/WebP accepted
- [ ] Uploaded images display correctly on detail pages

#### Edit/Delete Posts
- [ ] Edit button only visible to post author/admin
- [ ] Delete button only visible to post author/admin
- [ ] Edit page pre-fills with existing data
- [ ] Save updates post correctly
- [ ] Delete shows confirmation dialog
- [ ] Delete removes post and redirects to list
- [ ] Non-authors cannot access edit pages (403 error)

#### Logout Fix
- [ ] UserMenu immediately shows logged-out state
- [ ] Redirects to homepage
- [ ] Cannot access protected routes after logout
- [ ] Auth state cleared on server

#### Push Notifications
- [ ] Permission prompt appears on community page visit
- [ ] Subscription saves to database after accepting
- [ ] Notification appears when alert created (even with tab closed)
- [ ] Click notification opens correct page
- [ ] Notifications only sent to community subscribers
- [ ] Admin can trigger test notification
- [ ] Service worker registers correctly

#### Cross-Browser
- [ ] Chrome (desktop + Android)
- [ ] Firefox (desktop)
- [ ] Safari (desktop + iOS)
- [ ] Edge (desktop)

## Error Handling

### Upload Failures

**Scenarios:**
- File too large
- Wrong file type
- Network error
- Storage quota exceeded

**Handling:**
- Show toast error with specific message
- Don't clear form data
- Allow retry without data loss
- Log errors to console for debugging

### API Failures

**401 Unauthorized:**
- Redirect to /auth/login
- Toast: "Sesión expirada. Por favor inicia sesión nuevamente."

**403 Forbidden:**
- Show error message: "No tienes permisos para realizar esta acción"
- Don't clear form
- Provide "Volver" button

**500 Server Error:**
- Show generic error: "Algo salió mal. Por favor intenta nuevamente."
- Log full error to console
- Provide "Reintentar" button

### Push Notification Failures

**Permission Denied:**
- Show in-app banner fallback for alerts
- Don't block app usage
- Show message: "Activa las notificaciones en la configuración de tu navegador para recibir alertas importantes"

**Subscription Failed:**
- Log error to console
- Don't show intrusive error to user
- Allow retry on next page visit

**Send Failed (Admin):**
- Show error in admin panel
- Log failed subscriptions
- Provide "Reintentar" button for individual notifications

## Implementation Timeline

**Estimated:** 3-4 days

**Day 1:**
- Database changes (push_subscriptions table, storage buckets)
- Upload API routes (community, profile)
- Profile API route
- Avatar upload component

**Day 2:**
- Profile page (view/edit)
- Profile form component
- Update UserMenu and Dashboard links
- Logout fix

**Day 3:**
- Image upload field component
- Update PostForm to use file upload
- Post edit actions component
- Post edit form component
- Edit pages (announcements, events, jobs)

**Day 4:**
- Push notification utilities
- Service worker
- Notification API routes
- Admin integration for sending alerts
- Testing and bug fixes

## Security Considerations

1. **Authorization:**
   - All protected routes check auth status
   - Edit/delete operations verify ownership or admin role
   - API routes validate user permissions before mutations

2. **File Upload:**
   - Validate file types on both client and server
   - Enforce size limits to prevent abuse
   - Store files in user-specific folders (user_id prefix)
   - RLS policies prevent unauthorized deletion

3. **Push Notifications:**
   - VAPID keys stored securely (env variables)
   - Admin-only route for sending notifications
   - Subscriptions tied to authenticated users
   - No sensitive data in notification payload

4. **Data Validation:**
   - All inputs validated with Zod schemas
   - SQL injection prevented by Supabase parameterized queries
   - XSS prevented by React auto-escaping

## Dependencies

**New NPM Packages:**
```json
{
  "dependencies": {
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "@types/web-push": "^3.6.3"
  }
}
```

**Existing Dependencies (No Changes):**
- react-hook-form
- zod
- @hookform/resolvers
- sonner (toast)
- lucide-react (icons)
- uuid (file naming)

## Rollout Strategy

1. **Development:**
   - Implement features in feature branch
   - Test locally with Supabase dev project

2. **Staging:**
   - Deploy to staging environment
   - Generate and configure VAPID keys
   - Create storage buckets
   - Run database migrations
   - Manual QA testing

3. **Production:**
   - Run database migration (push_subscriptions table)
   - Create storage buckets via Supabase dashboard
   - Configure VAPID environment variables
   - Deploy application
   - Monitor error logs
   - Gradual rollout (feature flag optional)

## Success Metrics

**User Profile:**
- 80%+ of active users complete their profile within first week
- <2% error rate on profile updates

**Community Post Images:**
- 60%+ of new posts include images
- Average upload time <5 seconds

**Edit/Delete Posts:**
- Authors edit/delete own posts successfully 95%+ of time
- Zero unauthorized access attempts succeeding

**Push Notifications:**
- 40%+ of users grant notification permission
- Notification click-through rate >20%
- Zero failed notifications due to server errors

## Future Enhancements

**Phase 2 Potential Additions:**
- Multiple images per community post (like businesses)
- Image cropping/editing before upload
- WhatsApp notifications (via Business API)
- Email notifications for alerts
- Notification preferences (per alert type)
- Profile visibility settings (public/private)
- Profile badges (verified, moderator, etc.)

---

**Document End**
