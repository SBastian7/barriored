# PWA & Service Worker Reimplementation - Design Document

**Date:** February 25, 2026
**Status:** Approved
**Estimated Implementation:** 4-5 hours
**Approach:** Hybrid (next-pwa + custom push notifications)

---

## Executive Summary

Complete reimplementation of BarrioRed's PWA and service worker infrastructure to add offline support, proper caching strategies, and maintain existing push notification functionality. This addresses current issues with aggressive SW cleanup, lack of caching, and improves the overall PWA experience while preserving all existing push notification features.

---

## Current State Analysis

### What's Working
- ✅ Push notifications implemented and functional
- ✅ Service worker registers successfully
- ✅ Admin can send notifications to community
- ✅ Notifications appear and are clickable
- ✅ Basic PWA manifest exists

### Problems to Solve
- ❌ **No caching strategy** - Service worker doesn't cache resources for offline use
- ❌ **Aggressive SW cleanup** - Unregisters ALL service workers on every page load (causes instability)
- ❌ **No offline support** - App doesn't work without network connection
- ❌ **Manual implementation** - No modern PWA framework (no Workbox)
- ❌ **Excessive update checks** - Checks for SW updates every 60 seconds
- ❌ **Theme color mismatch** - Manifest uses blue (#1E40AF) instead of brand red
- ❌ **Missing icon sizes** - Not all required PWA icon sizes present

---

## Solution Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Next.js Application                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  app/layout.tsx                                  │   │
│  │    └─ ServiceWorkerRegister (simplified)        │   │
│  │    └─ PushNotificationPrompt                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓ (registers)
┌─────────────────────────────────────────────────────────┐
│         Service Worker (sw-final.js)                     │
│  ┌──────────────────────┬──────────────────────────┐   │
│  │  Workbox Runtime     │  Custom Push Logic       │   │
│  │  (auto-generated)    │  (sw-custom.ts)          │   │
│  ├──────────────────────┼──────────────────────────┤   │
│  │ • Precache assets    │ • push event handler     │   │
│  │ • Runtime caching    │ • notificationclick      │   │
│  │ • Cache strategies   │ • background sync        │   │
│  │ • Update management  │ • VAPID subscription     │   │
│  └──────────────────────┴──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓ (stores)
┌─────────────────────────────────────────────────────────┐
│              Supabase Database                           │
│  • push_subscriptions table                             │
│  • RLS policies (user-owned, admin-readable)            │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**New Dependencies:**
- `@ducanh2912/next-pwa` - Modern fork with Next.js 15+ support
- `workbox-webpack-plugin` - Peer dependency for Workbox
- `workbox-window` - Client-side SW helpers for clean updates

**Configuration Files:**
- `next.config.ts` - Add PWA plugin configuration
- `public/sw-custom.ts` - Custom service worker source (TypeScript)
- `public/manifest.json` - Update colors, add missing icon sizes
- `public/offline.html` - Fallback page for offline state

---

## Approach Comparison

### Option 1: next-pwa Plugin (Easiest)
- ✅ Fast setup (2-3 hours)
- ✅ Industry standard
- ✅ Automatic caching
- ❌ Less control
- ❌ May need workarounds for push notifications

### Option 2: Custom SW with Workbox (Most Control)
- ✅ Maximum flexibility
- ✅ Smaller bundle
- ✅ Deep understanding
- ❌ More complex (5-7 hours)
- ❌ More maintenance
- ❌ Manual update handling

### **Option 3: Hybrid - next-pwa + Custom Injections (CHOSEN)**
- ✅ Leverages next-pwa automation for caching
- ✅ Full control over push notification logic
- ✅ TypeScript support
- ✅ Well-documented pattern (official Workbox approach)
- ✅ Easier to test push notifications separately
- ⚠️ Medium complexity (4-5 hours)
- ✅ Best balance of automation and customization

**Why Hybrid?**
1. Proven pattern - Google's recommended approach for custom SW code
2. Supabase MCP compatibility - Clean database management
3. Maintainability - Offload caching to next-pwa, focus on features
4. TypeScript - Type-safe service worker code
5. Future-proof - Easy to extend with more custom features

---

## File Structure

### New Files

```
📁 public/
  ├── sw-custom.ts              [NEW] Custom SW source (TypeScript)
  ├── offline.html              [NEW] Fallback page for offline
  └── icons/                    [NEW] Missing PWA icon sizes
      ├── icon-72x72.png
      ├── icon-96x96.png
      ├── icon-128x128.png
      ├── icon-144x144.png
      ├── icon-152x152.png
      ├── icon-384x384.png
      └── (192x192 and 512x512 already exist)

📁 lib/
  └── sw-update.ts              [NEW] Client-side SW update logic
```

### Modified Files

```
components/service-worker-register.tsx  [MODIFIED] Simplify registration
public/manifest.json                    [MODIFIED] Update colors, icons
next.config.ts                          [MODIFIED] Add PWA plugin config
package.json                            [MODIFIED] Add next-pwa dependency
```

### Unchanged Files

```
lib/push-notifications.ts               [KEEP] No changes needed
components/community/push-notification-prompt.tsx [KEEP]
app/api/notifications/subscribe/route.ts [KEEP]
app/api/notifications/send/route.ts     [KEEP]
public/clear-sw.html                    [KEEP] Dev utility
```

---

## Component Design

### 1. `service-worker-register.tsx` (Simplified)

**Before:** 62 lines, manual registration, aggressive cleanup
**After:** ~30 lines, use `workbox-window` for clean registration

**New Behavior:**
- Register SW on page load (no cleanup)
- Listen for SW updates and prompt user
- Handle "waiting" state gracefully
- Show toast notification when update available

### 2. `lib/sw-update.ts` (New Helper)

Encapsulates Workbox Window API:
- `registerServiceWorker()` - Clean registration
- `checkForUpdates()` - Manual update check
- `skipWaiting()` - Activate new SW immediately
- Event listeners for SW lifecycle

### 3. `public/sw-custom.ts` (New Service Worker)

**Structure:**
```typescript
// Import Workbox modules
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// Workbox precaching (injected by next-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// Custom caching strategies
registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({cacheName: 'images'})
)

// Push notification handlers (existing logic from public/service-worker.js)
self.addEventListener('push', handlePushEvent)
self.addEventListener('notificationclick', handleNotificationClick)
```

### 4. `public/offline.html` (New Fallback)

Simple offline page with neo-brutalist styling:
- "Sin Conexión" heading (uppercase, tracking-widest)
- "Verifica tu conexión a internet" message
- "Reintentar" button (brutalist-button class)
- Matches BarrioRed brand (red, black borders, hard shadows)

---

## Caching Strategies

### Precaching (Build-time)

Workbox automatically precaches:
- Next.js static pages (`/_next/static/**`)
- JavaScript bundles
- CSS files
- Manifest and icons

**Strategy:** Cache First (instant load from cache)

### Runtime Caching (Request-time)

| Resource Type | Strategy | Cache Name | Max Entries | Max Age |
|--------------|----------|------------|-------------|---------|
| **HTML Pages** | Network First | `pages` | 50 | 7 days |
| **API Responses** | Network First | `api` | 100 | 1 hour |
| **Images** | Cache First | `images` | 200 | 30 days |
| **Supabase Storage** | Cache First | `supabase-storage` | 100 | 30 days |
| **External Images** | Cache First | `external-images` | 50 | 7 days |

**Network First:** Try network, fallback to cache if offline
**Cache First:** Use cache immediately, update cache in background

### Offline Fallback

When Network First fails and no cache exists:
- HTML requests → Serve `/offline.html`
- API requests → Return `{offline: true}` JSON response

---

## Data Flow

### Push Notification Flow (Unchanged)

```
1. User visits community page
   └─ PushNotificationPrompt shows after 3s

2. User clicks "Activar"
   └─ Browser shows native permission dialog

3. Permission granted
   └─ registration.pushManager.subscribe()
   └─ Use VAPID public key from env

4. Subscription object returned
   └─ POST /api/notifications/subscribe
   └─ Insert into push_subscriptions table

[Later: Admin creates alert]

5. Admin dispatches notification
   └─ POST /api/notifications/send
   └─ Fetch all subscriptions for community
   └─ Use web-push to send to each subscription

6. Service worker receives push event
   └─ Parse JSON payload
   └─ Show notification with title, body, icon

7. User clicks notification
   └─ Close notification
   └─ Focus/open browser window
   └─ Navigate to notification URL
```

### Service Worker Update Flow (New)

```
1. New deployment (SW file changed)
   └─ Browser detects new SW

2. Browser downloads and installs new SW
   └─ New SW enters "waiting" state

3. workbox-window detects waiting SW
   └─ Show toast: "Nueva versión disponible"
   └─ Button: "Actualizar Ahora"

4. User clicks update button
   └─ wb.messageSkipWaiting()
   └─ New SW activates
   └─ Page reloads with new SW active
```

---

## Error Handling

### 1. Service Worker Registration Fails

**Causes:** Browser doesn't support SW, HTTPS requirement, storage disabled

**Handling:**
- Catch error silently
- App continues without PWA features
- No error shown to user (graceful degradation)

### 2. Push Permission Denied

**Handling:**
- Hide prompt permanently
- Store denial in localStorage
- Show help text about browser settings

### 3. VAPID Key Missing

**Handling:**
- Log error to console
- Don't attempt subscription
- Prompt doesn't show

### 4. Invalid Subscription (410 Gone)

**Handling:**
- Auto-delete invalid subscription from database
- Continue sending to other subscriptions

### 5. Network Offline During Operations

| Operation | Strategy | User Feedback |
|-----------|----------|---------------|
| **Page load** | Serve cache or offline.html | "Sin Conexión" page |
| **API call** | Return cached data | Show stale indicator |
| **Image load** | Serve cached or placeholder | Transparent |
| **Push subscription** | Queue with Background Sync | "Se guardará cuando vuelvas online" |
| **Send notification** | N/A (admin only, needs network) | Error toast |

### 6. Service Worker Update Fails

**Handling:**
- Old SW continues running
- Retry on next page load
- No user disruption

### 7. Push Payload Malformed

**Handling:**
- Use default notification data
- Log error to console
- Show generic notification

### 8. Cache Storage Quota Exceeded

**Handling:**
- Workbox auto-evicts oldest entries
- Max entries per cache enforced
- Max age for expiration

### 9. Multiple Tabs During Update

**Handling:**
- Show update toast in ALL tabs
- Only reload after user confirms in ANY tab
- Use `clients.claim()` to control all tabs

---

## Development Considerations

### Hot Reload Conflicts

**Issue:** Service worker caching conflicts with Next.js hot reload

**Solution:**
```typescript
// next.config.ts
const isProd = process.env.NODE_ENV === 'production'

const withPWA = nextPWA({
  dest: 'public',
  disable: !isProd, // Disable PWA in development
})
```

**Effect:** PWA only active in production builds

### Clear Service Worker Tool

**Keep:** `public/clear-sw.html` for development debugging

**Usage:** Visit `/clear-sw.html` to manually unregister SW and clear caches

---

## Testing Strategy

### Service Worker Registration
- [ ] SW registers successfully on first visit
- [ ] SW activates and takes control
- [ ] SW survives page refreshes
- [ ] SW disabled in dev mode
- [ ] SW enabled in production build

### Caching Behavior
- [ ] Static assets cache on first load
- [ ] Pages load instantly on repeat visits
- [ ] Images cache after first load
- [ ] Network First falls back to cache offline
- [ ] Offline page shows when no cache exists

### Push Notifications (Regression Testing)
- [ ] Permission prompt appears
- [ ] Subscription saves to database
- [ ] Admin sends notifications successfully
- [ ] Notifications appear correctly
- [ ] Click opens correct URL

### Service Worker Updates
- [ ] New SW installs in "waiting" state
- [ ] Update toast appears
- [ ] Update activates after user confirms
- [ ] Multiple tabs update together

### Manifest & Install
- [ ] Manifest has correct theme color (red)
- [ ] All icon sizes present
- [ ] Browser shows install prompt
- [ ] Installed app opens standalone

### Browser Compatibility
- [ ] Chrome/Edge - Full support
- [ ] Firefox - Full support
- [ ] Safari 16.4+ - Full support
- [ ] Chrome Android - Full support
- [ ] Safari iOS 16.4+ - Full support

### Performance
- [ ] Lighthouse PWA score ≥ 90
- [ ] First load < 3 seconds
- [ ] Cached load < 1 second
- [ ] SW boot < 100ms

---

## Success Criteria

### Must Have ✅
1. Service worker registers and activates successfully
2. Pages load from cache when offline
3. Push notifications work exactly as before (no regressions)
4. Lighthouse PWA score ≥ 90
5. No console errors in any browser
6. App installable on mobile devices

### Nice to Have 🎯
7. Update prompt works smoothly
8. Offline page displays correctly
9. Multiple tabs update together
10. Cache eviction handles quota gracefully

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking push notifications** | High | Extensive regression testing, keep existing API unchanged |
| **Cache conflicts in dev** | Medium | Disable PWA in dev mode |
| **SW update loops** | Medium | Use workbox-window for proper update handling |
| **Browser incompatibility** | Low | Graceful degradation for unsupported browsers |
| **Storage quota issues** | Low | Set max entries and expiration on all caches |

---

## Implementation Timeline

**Estimated Total:** 4-5 hours

1. **Setup & Dependencies** (30 min)
   - Install next-pwa and dependencies
   - Configure next.config.ts

2. **Service Worker Implementation** (2 hours)
   - Create sw-custom.ts with caching strategies
   - Migrate push notification logic
   - Configure Workbox routing

3. **Client-side Updates** (1 hour)
   - Simplify service-worker-register.tsx
   - Create sw-update.ts helper
   - Add update toast UI

4. **Assets & Manifest** (30 min)
   - Generate missing icon sizes
   - Update manifest.json
   - Create offline.html

5. **Testing & Validation** (1 hour)
   - Test offline functionality
   - Verify push notifications still work
   - Run Lighthouse audit
   - Test update flow

---

## Next Steps

1. **Write Implementation Plan** - Use writing-plans skill to create detailed step-by-step implementation plan
2. **Execute Implementation** - Follow plan with checkpoint reviews
3. **Testing** - Comprehensive testing using checklist above
4. **Documentation Update** - Update CLAUDE.md and TESTING.md with new PWA details

---

## References

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [next-pwa GitHub](https://github.com/DuCanhGH/next-pwa)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [PWA Checklist](https://web.dev/pwa-checklist/)
