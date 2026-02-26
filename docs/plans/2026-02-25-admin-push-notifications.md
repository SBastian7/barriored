# Admin Push Notification Dispatch - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable admins to send push notifications automatically when creating active alerts, and manually via button for any alert.

**Architecture:** Client-side integration approach. Modify admin alerts page to call existing `/api/notifications/send` API route after alert creation (if active) and on manual button click. No backend changes needed.

**Tech Stack:** React 19, Next.js 16, TypeScript, Supabase, web-push, sonner (toasts), lucide-react (icons)

---

## Task 1: Add State and Helper Function

**Files:**
- Modify: `app/admin/alerts/page.tsx:1-230`

**Step 1: Add new state variable for tracking notification sends**

Add after line 21 (after `const [submitting, setSubmitting] = useState(false)`):

```typescript
const [sendingNotification, setSendingNotification] = useState<string | null>(null)
```

**Step 2: Add Bell icon to imports**

Modify line 13 to add `Bell` and `Loader2`:

```typescript
import { AlertTriangle, Plus, Trash2, Power, Droplets, Shield, Construction, Info, Loader2, Bell } from 'lucide-react'
```

**Step 3: Add helper function to send notifications**

Add before the `fetchData` function (after line 35):

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

**Step 4: Verify code compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit**

```bash
git add app/admin/alerts/page.tsx
git commit -m "feat: add notification state and helper function

- Add sendingNotification state to track button loading
- Add sendNotification helper to call push API
- Import Bell and Loader2 icons for UI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Enhance Form Submission with Auto-Send

**Files:**
- Modify: `app/admin/alerts/page.tsx:49-73`

**Step 1: Modify handleSubmit to fetch community slug**

Change line 63 from:

```typescript
const { error } = await supabase.from('community_alerts').insert([{ ...formData, author_id: user.id }])
```

To:

```typescript
const { data: newAlert, error } = await supabase
    .from('community_alerts')
    .insert([{ ...formData, author_id: user.id }])
    .select('*, communities(name, slug)')
    .single()
```

**Step 2: Add auto-send logic after successful insert**

Replace lines 64-72 with:

```typescript
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
```

**Step 3: Test locally - create active alert**

1. Start dev server: `npm run dev`
2. Navigate to `/admin/alerts`
3. Create new alert with `is_active: true`
4. Expected: Toast shows "Alerta creada y notificación enviada a X vecinos"

**Step 4: Test locally - create inactive alert**

1. Create new alert with `is_active: false`
2. Expected: Toast shows "Alerta creada (inactiva, sin notificación)"

**Step 5: Commit**

```bash
git add app/admin/alerts/page.tsx
git commit -m "feat: auto-send notification on active alert creation

- Fetch community slug with alert insert
- Send push notification if is_active is true
- Show enhanced toast messages with send status
- Handle 0 subscribers gracefully

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Manual Send Handler

**Files:**
- Modify: `app/admin/alerts/page.tsx:86-95`

**Step 1: Add handleManualSend function**

Add after the `deleteAlert` function (after line 86):

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

**Step 2: Verify code compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/admin/alerts/page.tsx
git commit -m "feat: add manual notification send handler

- Add handleManualSend to dispatch notifications on demand
- Track loading state per alert ID
- Show success/error toasts with recipient count

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Manual Send Button to Alert Cards

**Files:**
- Modify: `app/admin/alerts/page.tsx:205-218`

**Step 1: Add notification button to action buttons**

Find the actions column div (around line 205), which currently has 2 buttons. Add a third button between the toggle button and delete button:

After the "Activa/Inactiva" button (around line 211) and before the "Eliminar" button (around line 212), add:

```typescript
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

**Step 2: Test locally - manual send button appears**

1. Start dev server: `npm run dev`
2. Navigate to `/admin/alerts`
3. Expected: Each alert card shows 3 buttons (Activa/Inactiva, Notificar, Eliminar)
4. Notificar button should have blue background

**Step 3: Test locally - manual send functionality**

1. Click "Notificar" button on any alert
2. Expected:
   - Button shows spinner during send
   - Toast appears with result
   - Button returns to normal state

**Step 4: Test locally - loading state isolation**

1. Click "Notificar" on first alert
2. While loading, check other alert cards
3. Expected: Only the clicked alert's button shows spinner

**Step 5: Commit**

```bash
git add app/admin/alerts/page.tsx
git commit -m "feat: add manual notification send button to alert cards

- Add Notificar button with Bell icon
- Show Loader2 spinner during send
- Style with accent blue background
- Disable button during send
- Position between toggle and delete buttons

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Manual Testing & Verification

**Files:**
- No file changes (testing only)

**Step 1: Test auto-send with active alert**

1. Start dev server: `npm run dev`
2. Navigate to `/admin/alerts`
3. Create new alert:
   - Community: Select any
   - Type: General
   - Severity: Info
   - Title: "Test Auto-Send Active"
   - Description: "Testing automatic notification"
   - (is_active defaults to true)
4. Click "Crear Alerta"
5. Expected: Toast shows "✅ Alerta creada y notificación enviada a X vecinos"
6. Check console for any errors

**Step 2: Test auto-send with inactive alert**

1. Change `is_active` in form state to false (temporarily edit code or use React DevTools)
2. Create new alert with same fields
3. Expected: Toast shows "✅ Alerta creada (inactiva, sin notificación)"
4. No notification API call should be made

**Step 3: Test manual send button**

1. Find an existing alert in the list
2. Click "📣 Notificar" button
3. Expected:
   - Button shows spinner immediately
   - Toast appears with "📣 Notificación enviada a X vecinos"
   - Button returns to normal after ~1-2 seconds

**Step 4: Test with no subscribers (edge case)**

1. Verify no users have push subscriptions:
   - Open Supabase dashboard
   - Check `push_subscriptions` table (should be empty)
2. Create active alert or click manual send
3. Expected: Toast shows "...0 vecinos (nadie suscrito aún)"
4. No errors in console

**Step 5: Test loading states**

1. Click "Notificar" button
2. Immediately check:
   - Button shows Loader2 spinner (not Bell icon)
   - Button is disabled (can't click again)
   - Other alert buttons still work normally
3. After send completes:
   - Button returns to Bell icon
   - Button is enabled again

**Step 6: Test notification end-to-end (if subscriptions exist)**

1. In a separate browser/device:
   - Navigate to community page
   - Accept notification permission when prompted
   - Subscribe to push notifications
2. In admin panel:
   - Create active alert or click manual send
3. Expected:
   - Push notification appears on other device
   - Notification shows alert title and description
   - Clicking notification opens community alerts page

**Step 7: Verify no regressions**

Test existing admin alerts functionality:
- [ ] Create alert form still works
- [ ] Toggle active/inactive still works
- [ ] Delete alert still works
- [ ] Alert list refreshes after operations
- [ ] Filter/search (if exists) still works

**Step 8: Cross-browser testing**

Test on:
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Chrome Android (if available)

**Step 9: Document any issues found**

If issues found:
1. Note the issue
2. Create follow-up task/commit to fix
3. Re-test after fix

---

## Task 6: Update Documentation

**Files:**
- Modify: `CLAUDE.md:1-763`

**Step 1: Update Phase 3 status**

Find the Phase 3 section (around line 75-90) and update:

Change:
```markdown
### Phase 3: Community (Red Vecinal - COMPLETE)
```

To:
```markdown
### Phase 3: Community (Red Vecinal - COMPLETE)
- [x] Push notifications for community alerts (automatic + manual dispatch)
```

**Step 2: Add to Key Files section**

Find "Key Files" section and add:
```markdown
- `app/admin/alerts/page.tsx` - Admin alerts management with push notification dispatch
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update Phase 3 completion status

- Mark push notification dispatch as complete
- Add admin alerts page to key files list

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Testing Documentation

**Files:**
- Modify: `TESTING.md` (if exists, otherwise create it)

**Step 1: Add admin notification testing section**

Add or update the admin testing section:

```markdown
### Admin Push Notifications

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
```

**Step 2: Commit**

```bash
git add TESTING.md
git commit -m "docs: add admin push notification testing checklist

- Add auto-send and manual send test cases
- Document edge cases and end-to-end testing
- Include cross-browser testing requirements

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Final Review & Cleanup

**Files:**
- Review: All modified files

**Step 1: Code review checklist**

Review `app/admin/alerts/page.tsx`:
- [ ] No console.log statements left in code
- [ ] All imports used (no unused imports)
- [ ] TypeScript types are correct (no `any` abuse)
- [ ] Error handling is comprehensive
- [ ] Loading states work correctly
- [ ] Toast messages are user-friendly
- [ ] Button styling matches design system
- [ ] Code follows existing patterns in file

**Step 2: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors or warnings

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 4: Check for linting issues**

```bash
npm run lint
```

Expected: No linting errors (or only pre-existing ones)

**Step 5: Git status check**

```bash
git status
```

Expected: Working tree clean (all changes committed)

**Step 6: Review commit history**

```bash
git log --oneline -7
```

Expected:
- 7 commits (or adjust number)
- All commit messages follow convention
- All have Co-Authored-By line

---

## Task 9: Prepare for Testing with Real Users

**Files:**
- Verify environment configuration

**Step 1: Verify VAPID keys configured**

Check `.env.local`:
```bash
cat .env.local | grep VAPID
```

Expected:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

If missing, generate keys:
```bash
npx web-push generate-vapid-keys
```

Then add to `.env.local`

**Step 2: Verify Supabase push_subscriptions table exists**

1. Open Supabase dashboard
2. Navigate to Table Editor
3. Check for `push_subscriptions` table
4. Expected: Table exists with columns: id, user_id, endpoint, p256dh, auth, created_at, updated_at

**Step 3: Test subscription flow (if not already done)**

1. In browser, navigate to community page
2. Accept notification permission
3. Check Supabase `push_subscriptions` table
4. Expected: New row inserted with your subscription data

**Step 4: Create staging environment checklist**

Document what needs to be done for staging/production:
```markdown
## Deployment Checklist

- [ ] VAPID keys configured in hosting environment
- [ ] push_subscriptions table exists in production DB
- [ ] Service worker registered and working
- [ ] HTTPS enabled (required for push notifications)
- [ ] Test notification on production domain
- [ ] Admin user has admin role in profiles table
```

**Step 5: Create admin user guide**

Create brief guide for admins:
```markdown
## Admin Guide: Push Notifications

### Automatic Notifications
When you create a new alert with "Activa" status, a push notification is automatically sent to all subscribed users in that community.

### Manual Notifications
Use the "📣 Notificar" button on any alert card to send/resend a notification to subscribers.

### Interpreting Messages
- "X vecinos" = number of users who received the notification
- "0 vecinos (nadie suscrito aún)" = no users subscribed yet (normal in early phase)
- Error message = notification failed, try again or check with tech team
```

---

## Post-Implementation Notes

### Known Limitations (Acceptable for MVP)
- No rate limiting on notification sends
- No tracking of "last sent" timestamp
- No scheduling of future notifications
- No per-user notification preferences
- Notifications always go to entire community (no targeting)

### Future Enhancements (Phase 2+)
- Notification scheduling (send at specific time)
- Notification templates for common alert types
- Analytics dashboard (delivery rate, click-through rate)
- A/B testing for notification content
- WhatsApp integration for multi-channel alerts
- User preferences (opt-out of specific alert types)
- Notification history per alert (track sends)

### Debugging Tips
- Check browser console for push subscription errors
- Check server logs for web-push send failures
- Verify VAPID keys are correct (public key in client, private key in server)
- Test on HTTPS domain (localhost:3000 works for development)
- Check Supabase logs for database errors
- Use Chrome DevTools > Application > Service Workers to debug worker

---

## Success Criteria

Implementation is complete when:
1. ✅ Auto-send works for new active alerts
2. ✅ Manual send button appears on all alert cards
3. ✅ Loading states work correctly
4. ✅ Toast messages are clear and informative
5. ✅ No TypeScript errors
6. ✅ No breaking changes to existing functionality
7. ✅ Documentation updated
8. ✅ All manual tests pass

**Estimated Time:** 1-2 hours for implementation + 30 minutes for testing

---

**Plan Complete**
