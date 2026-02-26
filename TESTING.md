# Phase 1 & 3 Features - Testing Checklist

## Testing Date
February 24, 2026

## Testing Environment
- **Environment:** Local development (http://localhost:3000)
- **Database:** Supabase local instance
- **Browser:** Chrome/Firefox (latest)
- **Device:** Desktop + Mobile (responsive testing)

---

## User Profile System

### View Profile
- [ ] Navigate to `/profile` while logged in
- [ ] Verify profile data displays correctly (name, email, phone, community, role)
- [ ] Verify avatar displays (if set) or placeholder shows
- [ ] Verify "Editar Perfil" button is visible
- [ ] Verify unauthorized users redirect to `/auth/login`

### Edit Profile
- [ ] Click "Editar Perfil" button
- [ ] Verify form pre-fills with existing data
- [ ] Verify email field is disabled (cannot be changed)
- [ ] Change name → verify validation (min 2 chars)
- [ ] Change phone → verify format validation (+57XXXXXXXXXX)
- [ ] Select community from dropdown → verify options load
- [ ] Click "Cancelar" → verify returns to view mode without saving
- [ ] Click "Guardar Cambios" → verify success toast appears
- [ ] Verify changes persist after page refresh
- [ ] Verify form validation shows errors for invalid inputs

### Avatar Upload
- [ ] Click "Cambiar Foto" in edit mode
- [ ] Select image file (JPG/PNG/WebP)
- [ ] Verify file size validation (max 2MB)
- [ ] Verify file type validation (only images)
- [ ] Verify upload progress shows (loading state)
- [ ] Verify preview updates after upload
- [ ] Verify old avatar is deleted (check Supabase Storage)
- [ ] Verify avatar URL saved to profile

### Profile Access
- [ ] Profile accessible from UserMenu dropdown
- [ ] Profile accessible from Dashboard "Mi Perfil" link
- [ ] Profile link shows "Mi Perfil" text with User icon

---

## Community Post Image Upload

### Upload Images in Posts
- [ ] Navigate to create announcement page
- [ ] Click "Subir Imagen" area in post form
- [ ] Select image file (JPG/PNG/WebP)
- [ ] Verify file size validation (max 5MB)
- [ ] Verify file type validation (only images)
- [ ] Verify upload progress shows
- [ ] Verify preview displays after upload
- [ ] Hover over uploaded image → verify delete button appears
- [ ] Click delete (X) button → verify image removed
- [ ] Submit post with image → verify image URL saved
- [ ] Repeat for event and job post types

### Image Display
- [ ] View post detail page with image
- [ ] Verify image displays correctly
- [ ] Verify image is responsive (mobile/desktop)
- [ ] Verify image loads from Supabase Storage public URL

---

## Edit/Delete Community Posts

### Announcement Edit/Delete
- [ ] Create test announcement as regular user
- [ ] View announcement detail page
- [ ] Verify "Editar" and "Eliminar" buttons visible (author only)
- [ ] Login as different user → verify buttons hidden
- [ ] Login as admin → verify buttons visible (admin access)
- [ ] Click "Editar" → verify redirects to edit page
- [ ] Verify form pre-fills with existing data (title, content, image)
- [ ] Make changes → save → verify redirects to detail page
- [ ] Verify updated data displays correctly
- [ ] Click "Eliminar" → verify confirmation dialog appears
- [ ] Click "Cancelar" in dialog → verify nothing deleted
- [ ] Click "Sí, Eliminar" → verify post deleted
- [ ] Verify redirect to announcements list page
- [ ] Verify post no longer appears in list

### Event Edit/Delete
- [ ] Repeat all announcement tests for events
- [ ] Verify event metadata fields (organizer, date, location) pre-fill
- [ ] Verify metadata updates correctly on save

### Job Edit/Delete
- [ ] Repeat all announcement tests for jobs
- [ ] Verify job metadata fields (category, salary, contact) pre-fill
- [ ] Verify contact method selector works
- [ ] Verify phone input appears for WhatsApp/Phone contact
- [ ] Verify email input appears for Email contact
- [ ] Verify metadata updates correctly on save

### Authorization
- [ ] Attempt to edit another user's post → verify redirect (403)
- [ ] Attempt to delete another user's post → verify blocked
- [ ] Verify admin can edit/delete any post
- [ ] Verify non-logged-in users don't see buttons

---

## Logout State Fix

### Logout Flow
- [ ] Login to application
- [ ] Verify UserMenu shows logged-in state (avatar/name)
- [ ] Click logout in UserMenu
- [ ] Verify UI immediately updates to logged-out state (no flash)
- [ ] Verify redirect to homepage
- [ ] Verify auth session cleared (check dev tools)
- [ ] Attempt to access protected route → verify redirect to login
- [ ] Login again → verify works correctly

---

## Push Notifications

### Permission Prompt
- [ ] Navigate to community page (first time, fresh browser)
- [ ] Wait 3 seconds
- [ ] Verify notification prompt appears (bottom-right on desktop, bottom on mobile)
- [ ] Verify prompt has neo-brutalist styling (black border, hard shadow)
- [ ] Verify prompt shows correct text in Spanish
- [ ] Click "Ahora No" → verify prompt dismisses
- [ ] Refresh page → verify prompt doesn't reappear (dismissed state saved)
- [ ] Clear browser data → verify prompt reappears

### Enable Notifications
- [ ] Click "Activar" in prompt
- [ ] Verify browser permission dialog appears
- [ ] Click "Allow" in browser dialog
- [ ] Verify subscription saved to `push_subscriptions` table (check Supabase)
- [ ] Verify prompt dismisses after activation
- [ ] Verify subscription contains: endpoint, p256dh, auth keys

### Service Worker
- [ ] Open browser dev tools → Application → Service Workers
- [ ] Verify service worker registered (`/service-worker.js`)
- [ ] Verify status shows "activated and is running"
- [ ] Check console logs → verify "Service Worker registered" message

### Receive Notifications
- [ ] Login as admin user
- [ ] Create a community alert (security, water cut, etc.)
- [ ] Verify notification appears in browser (even if tab not focused)
- [ ] Verify notification shows correct title and body text
- [ ] Verify notification icon displays (BarrioRed icon)
- [ ] Click notification → verify opens correct URL
- [ ] Verify notification brings browser window to focus

### Send Notifications (Admin)
- [ ] Use API or admin panel to send test notification
- [ ] POST to `/api/notifications/send` with:
  ```json
  {
    "community_id": "...",
    "title": "Test Alert",
    "body": "This is a test notification",
    "url": "/parqueindustrial/community"
  }
  ```
- [ ] Verify notification received by subscribed users
- [ ] Verify admin-only access (non-admins get 403)
- [ ] Verify count of sent notifications returned
- [ ] Test with no subscribers → verify graceful handling

### Invalid Subscriptions
- [ ] Manually corrupt a subscription in database
- [ ] Trigger send notification
- [ ] Verify invalid subscription auto-deleted (410 status)
- [ ] Verify other subscriptions still receive notification

### Admin Push Notifications Dispatch

**Auto-Send Testing:**
- [ ] Create active alert → notification sent automatically
- [ ] Create inactive alert → no notification sent
- [ ] Toast shows correct message for active alert
- [ ] Toast shows correct message for inactive alert
- [ ] Notification send failure doesn't block alert creation

**Manual Send Testing:**
- [ ] Click "Notificar" on any alert → notification sent
- [ ] Button shows loading spinner during send
- [ ] Toast shows recipient count
- [ ] Button works on both active and inactive alerts

**Edge Cases:**
- [ ] 0 subscribers → graceful handling with info message
- [ ] Multiple alerts → only clicked alert shows loading
- [ ] Network error → error toast, alert still exists
- [ ] Rapid clicking → button disabled, no duplicate sends

**End-to-End:**
- [ ] Notification appears on subscribed device
- [ ] Clicking notification opens correct page

---

## Cross-Feature Integration

### Complete User Journey
- [ ] New user signs up
- [ ] Completes profile (name, phone, avatar, community)
- [ ] Navigates to community page
- [ ] Enables push notifications
- [ ] Creates announcement with image
- [ ] Edits announcement
- [ ] Views own announcement in list
- [ ] Receives notification when admin creates alert
- [ ] Logs out → UI updates immediately
- [ ] Logs back in → profile data persists

---

## Performance & Edge Cases

### Performance
- [ ] Image upload completes in < 5 seconds
- [ ] Profile update completes in < 2 seconds
- [ ] Push notification appears within 5 seconds of send
- [ ] Edit page loads in < 2 seconds

### Edge Cases
- [ ] Upload image > 5MB → verify error message
- [ ] Upload non-image file → verify error message
- [ ] Submit profile with invalid phone → verify validation error
- [ ] Edit post without being logged in → verify redirect
- [ ] Delete post that doesn't exist → verify graceful error
- [ ] Enable notifications in unsupported browser → verify graceful degradation
- [ ] Network error during upload → verify error handling

---

## Browser Compatibility

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile
- [ ] Test responsive layouts (320px, 768px, 1024px)

---

## Test Results Summary

**Total Tests:** TBD
**Passed:** TBD
**Failed:** TBD
**Blocked:** TBD

**Critical Issues:** None identified
**Minor Issues:** TBD

**Tested By:** [Name]
**Date:** [Date]
**Sign-off:** [ ] Ready for Production

---

## Notes

- All tests should be run in both logged-in and logged-out states where applicable
- Profile and notification features require authentication
- Admin-specific features require admin role
- Push notifications require HTTPS in production (works on localhost for dev)
- Service worker requires HTTPS (or localhost) to register
