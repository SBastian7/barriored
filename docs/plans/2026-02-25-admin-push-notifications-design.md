# Admin Push Notification Dispatch - Design Document

**Date:** 2026-02-25
**Status:** Approved
**Implementation Approach:** Client-Side Integration

## Overview

Enable admin users to dispatch push notifications for community alerts. Notifications should be sent automatically when creating new active alerts, and manually via a button for any existing alert.

## Requirements

### User Story
As an admin, I want to:
1. Automatically send push notifications when creating a new active alert
2. Manually send/resend notifications for any alert (active or inactive) via a button
3. See clear feedback on how many users received the notification

### Success Criteria
- Push notifications sent automatically only for NEW alerts created with `is_active: true`
- Manual "Notificar" button available on every alert card in the admin panel
- Clear toast messages showing notification send status and recipient count
- Notification failures don't block alert creation (alerts still saved)
- Loading states during notification sends

## Architecture & Flow

### Auto-Send Flow (New Alerts)

1. Admin fills out alert creation form in `/admin/alerts`
2. Form submits → insert alert into `community_alerts` table
3. **IF** alert created successfully **AND** `is_active: true`:
   - Immediately call `/api/notifications/send` with alert data
   - Show loading state during send
   - Display success toast: "Alerta creada y notificación enviada a X vecinos"
4. **IF** `is_active: false`:
   - Show toast: "Alerta creada (inactiva, sin notificación)"
   - No notification sent
5. **IF** notification send fails:
   - Alert still exists in database
   - Show warning toast: "Alerta creada pero falló el envío de notificación"
   - Admin can retry with manual button

### Manual Send Flow (Existing Alerts)

1. Admin clicks "📣 Notificar" button on any alert card
2. Button shows loading state (spinner replaces bell icon)
3. Call `/api/notifications/send` with:
   - `community_id`: alert's community
   - `title`: alert's title
   - `body`: alert's description
   - `url`: `/{community-slug}/community` (community alerts page)
4. Show toast with result:
   - Success: "📣 Notificación enviada a X vecinos"
   - Error: "Error al enviar notificación"
5. Button returns to normal state

### Key Design Decisions

- **Non-blocking:** Notification sending doesn't block alert creation. If send fails, alert still exists and can be resent.
- **Always available:** Manual button visible for all alerts (active or inactive) so admins can resend any alert.
- **No toggle behavior:** Toggling an alert's `is_active` status does NOT trigger notifications (avoids spam).
- **No tracking:** Don't track "last sent" timestamp (keeps it simple for MVP).
- **URL destination:** All notifications link to `/{community-slug}/community` page.

## UI Design

### Modified File: `app/admin/alerts/page.tsx`

#### Alert Card Action Buttons

**Current layout:**
```
[Icon] [Alert Info]                    [Actions]
                                       ├─ Activa/Inactiva
                                       └─ Eliminar
```

**New layout:**
```
[Icon] [Alert Info]                    [Actions]
                                       ├─ Activa/Inactiva (green/red)
                                       ├─ 📣 Notificar (accent blue)
                                       └─ Eliminar (red)
```

#### New "Notificar" Button Styling

- Background: `bg-accent` (Street Art Blue)
- Text: White, uppercase, tracking-widest
- Icon: `Bell` from lucide-react
- Loading state: `Loader2` spinner replaces bell icon
- Height: Same as other action buttons
- Border: Same 2px divide borders
- Hover: `hover:bg-accent/80` transition
- Disabled: `opacity-50` when sending

#### Enhanced Toast Messages

**Alert creation with auto-send:**
- Success: "✅ Alerta creada y notificación enviada a X vecinos"
- Success (inactive): "✅ Alerta creada (inactiva, sin notificación)"
- Warning: "⚠️ Alerta creada pero falló el envío de notificación"

**Manual send:**
- Success: "📣 Notificación enviada a X vecinos"
- Info (no subscribers): "✅ Notificación enviada a 0 vecinos (nadie suscrito aún)"
- Error: "⚠️ Error al enviar notificación"
- Error (config): "⚠️ Error al enviar notificación (configuración)"
- Error (network): "⚠️ Error de conexión al enviar notificación"

#### Loading States

- **Form submit button:** Disabled during alert creation + notification send
- **Manual send button:** Shows spinner, disabled during send
- **State variable:** `sendingNotification` tracks which alert ID is sending (for per-card loading)

## Implementation Details

### Code Changes in `app/admin/alerts/page.tsx`

#### 1. New State Variable

```typescript
const [sendingNotification, setSendingNotification] = useState<string | null>(null)
```

Tracks which alert ID is currently sending a notification (for button loading state).

#### 2. New Helper Function: `sendNotification`

```typescript
async function sendNotification(alert: any) {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        community_id: alert.community_id,
        title: alert.title,
        body: alert.description || alert.title,
        url: `/${alert.communities?.slug || 'parqueindustrial'}/community`
      })
    })

    if (!response.ok) {
      throw new Error('API call failed')
    }

    return await response.json()
  } catch (error) {
    console.error('Notification send error:', error)
    return { success: false, sent: 0, error: true }
  }
}
```

**Purpose:** Centralized function to call `/api/notifications/send` API route.

**Parameters:** Alert object with `community_id`, `title`, `description`, `communities.slug`

**Returns:** `{ success: boolean, sent: number, error?: boolean }`

**Error handling:** Catches network errors, returns error flag instead of throwing.

#### 3. Enhanced `handleSubmit` Function

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  if (!formData.community_id || !formData.title) {
    toast.error('Completa los campos obligatorios')
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    toast.error('No autenticado')
    return
  }

  setSubmitting(true)

  // Insert alert
  const { data: newAlert, error } = await supabase
    .from('community_alerts')
    .insert([{ ...formData, author_id: user.id }])
    .select('*, communities(name, slug)')
    .single()

  if (error) {
    toast.error('Error al crear alerta: ' + error.message)
    setSubmitting(false)
    return
  }

  // Auto-send notification if alert is active
  if (formData.is_active && newAlert) {
    const notifResult = await sendNotification(newAlert)

    if (notifResult.success && notifResult.sent > 0) {
      toast.success(`✅ Alerta creada y notificación enviada a ${notifResult.sent} vecinos`)
    } else if (notifResult.success && notifResult.sent === 0) {
      toast.success('✅ Alerta creada y notificación enviada a 0 vecinos (nadie suscrito aún)')
    } else {
      toast.warning('⚠️ Alerta creada pero falló el envío de notificación')
    }
  } else {
    toast.success('✅ Alerta creada (inactiva, sin notificación)')
  }

  setSubmitting(false)
  setFormData({ ...formData, title: '', description: '' })
  fetchData()
}
```

**Changes:**
1. Use `.select('*, communities(name, slug)')` to get community slug for URL
2. After successful insert, check if `is_active === true`
3. If active, call `sendNotification()` and show appropriate toast
4. If inactive or send fails, show appropriate message

#### 4. New Handler: `handleManualSend`

```typescript
async function handleManualSend(alert: any) {
  setSendingNotification(alert.id)

  const result = await sendNotification(alert)

  setSendingNotification(null)

  if (result.success && result.sent > 0) {
    toast.success(`📣 Notificación enviada a ${result.sent} vecinos`)
  } else if (result.success && result.sent === 0) {
    toast.success('✅ Notificación enviada a 0 vecinos (nadie suscrito aún)')
  } else {
    toast.error('⚠️ Error al enviar notificación')
  }
}
```

**Purpose:** Handle manual notification send button clicks.

**Flow:**
1. Set loading state for this specific alert
2. Send notification
3. Clear loading state
4. Show toast with result

#### 5. Alert Card Button Addition

**Location:** Inside the actions column `<div>`, between the "Activa/Inactiva" button and "Eliminar" button.

```tsx
<button
  onClick={() => handleManualSend(alert)}
  disabled={sendingNotification === alert.id}
  className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
>
  {sendingNotification === alert.id ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Bell className="h-3 w-3" />
  )}
  Notificar
</button>
```

**Styling notes:**
- Matches existing button pattern (flex-1, same text classes)
- Accent blue background (`bg-accent`)
- White text for contrast
- Shows spinner during send
- Disabled state when sending

#### 6. Import Additions

```typescript
import { Bell, Loader2 } from 'lucide-react' // Add Bell
```

### No Changes Required

The following files already work correctly and need no modifications:

- **`app/api/notifications/send/route.ts`** - Already handles sending push notifications to community subscribers
- **`lib/push-notifications.ts`** - Client-side subscription utilities
- **`public/service-worker.js`** - Handles incoming push notifications
- **Database schema** - No new tables or columns needed

## Error Handling

### Scenario 1: No Subscribers in Community

**What happens:** Admin sends notification but no users have subscribed to push notifications yet.

**Handling:**
- API returns `{ success: true, sent: 0 }`
- Toast shows: "✅ Notificación enviada a 0 vecinos (nadie suscrito aún)"
- Not treated as error (expected in pilot phase)

### Scenario 2: Network Failure During Send

**What happens:** API call to `/api/notifications/send` fails due to network issue.

**Handling:**
- `sendNotification()` catches error and returns `{ success: false, sent: 0, error: true }`
- Toast shows: "⚠️ Error de conexión al enviar notificación"
- Alert still exists in database (not rolled back)
- Admin can retry with manual button

### Scenario 3: VAPID Keys Not Configured

**What happens:** Environment variables `NEXT_PUBLIC_VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` missing or invalid.

**Handling:**
- API route fails with 500 error
- `sendNotification()` returns `{ success: false, sent: 0, error: true }`
- Toast shows: "⚠️ Error al enviar notificación (configuración)"
- Error logged to console for debugging
- Admin should check server logs and environment variables

### Scenario 4: Invalid Subscription Endpoints

**What happens:** User's push subscription expired or browser unsubscribed.

**Handling:**
- Handled automatically by existing API route (lines 82-87 in `app/api/notifications/send/route.ts`)
- Invalid subscriptions (410 status) are deleted from database
- API returns count of only successful sends
- No user-facing error (graceful degradation)

### Scenario 5: Partial Send Failure

**What happens:** Some subscriptions succeed, others fail.

**Handling:**
- API uses `Promise.allSettled()` to attempt all sends
- Returns count of successful sends only
- Toast shows: "📣 Notificación enviada a X vecinos" (where X = successful count)
- Failed subscriptions logged to server console

## Testing Strategy

### Manual Testing Checklist

#### Auto-Send Testing
- [ ] Create new alert with `is_active: true` → verify notification sent automatically
- [ ] Create new alert with `is_active: false` → verify NO notification sent
- [ ] Verify toast shows correct message for active alert creation
- [ ] Verify toast shows correct message for inactive alert creation
- [ ] Verify notification send failure doesn't prevent alert creation

#### Manual Send Testing
- [ ] Click "Notificar" button on active alert → verify notification sent
- [ ] Click "Notificar" button on inactive alert → verify notification sent (allowed)
- [ ] Verify button shows loading spinner during send
- [ ] Verify button returns to normal state after send
- [ ] Verify toast shows recipient count

#### End-to-End Testing
- [ ] Create alert on desktop, verify notification appears on mobile device
- [ ] Click notification on device → verify opens correct community page
- [ ] Test with user who has granted notification permission
- [ ] Test with user who has denied notification permission (no notification sent)

#### Edge Cases
- [ ] Test with 0 subscribers → verify graceful handling
- [ ] Test with multiple alerts → verify only clicked alert shows loading
- [ ] Rapid clicking notification button → verify doesn't duplicate sends (button disabled)
- [ ] Page refresh during notification send → verify no issues
- [ ] Community with no slug → verify falls back to 'parqueindustrial'
- [ ] Very long alert titles/descriptions → verify doesn't break notification display

#### Error Testing
- [ ] Disable internet → verify network error handling
- [ ] Invalid VAPID keys → verify configuration error handling
- [ ] Verify form submit button stays disabled during notification send

### Cross-Browser Testing

- [ ] Chrome desktop (primary target)
- [ ] Firefox desktop
- [ ] Chrome Android (if push subscriptions exist)
- [ ] Safari desktop (may not support push notifications)

## Security Considerations

### Authorization
- `/api/notifications/send` already checks for admin role (lines 20-29)
- No additional authorization needed
- Non-admin users cannot access admin panel (handled by layout)

### Input Validation
- Alert data already validated by form
- API route validates required fields (`community_id`, `title`, `body`)
- No risk of injection (all data from database)

### Rate Limiting
- Not implemented for MVP (admin-only, low volume)
- Consider adding if abuse detected

### VAPID Key Security
- Keys stored in environment variables (secure)
- Private key never exposed to client
- Public key safely exposed in `NEXT_PUBLIC_` var

## Dependencies

### Existing Dependencies (No Changes)
- `web-push` - Already installed for push notification sending
- `sonner` - Toast notifications
- `lucide-react` - Icons (Bell, Loader2)

### Environment Variables (Already Configured)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public VAPID key
- `VAPID_PRIVATE_KEY` - Private VAPID key (server-only)

## Implementation Timeline

**Estimated:** 1-2 hours

**Single File Change:**
- Modify `app/admin/alerts/page.tsx` (add button, handlers, auto-send logic)

**Testing:**
- 30 minutes manual testing
- 15 minutes cross-browser testing

## Rollout Strategy

### Development
1. Implement changes in local environment
2. Test with local Supabase dev project
3. Verify VAPID keys configured in `.env.local`

### Staging
1. Deploy to staging environment
2. Verify VAPID environment variables in hosting platform
3. Create test alert and verify notification received
4. Test manual send button on existing alerts

### Production
1. Deploy to production
2. Monitor error logs for notification failures
3. Check Supabase logs for push subscription counts
4. Train admin users on new notification features

## Success Metrics

**Adoption:**
- Admins use manual notification button on 80%+ of critical alerts
- Auto-send works successfully for 95%+ of new active alerts

**Reliability:**
- Notification send success rate >90%
- Zero alert creation failures due to notification errors

**User Engagement:**
- Push notification click-through rate >20%
- Average notification delivery time <5 seconds

## Future Enhancements

**Phase 2 Potential:**
- Schedule notifications for future time (delayed send)
- Notification templates for common alert types
- Track "last sent" timestamp for each alert
- Admin dashboard with notification analytics
- A/B test notification titles/content
- Notification preferences (user can choose alert types)
- WhatsApp notifications (via Business API integration)

---

**Document End**
