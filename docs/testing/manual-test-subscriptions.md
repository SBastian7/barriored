# End-to-End Testing: Premium Subscription Flow

## Overview
This guide tests the complete premium subscription workflow from business owner request through admin activation, payment recording, and cancellation.

## Prerequisites
- Local development environment running
- Two user accounts: Business Owner and Admin
- At least one approved business owned by test business owner
- Access to Supabase dashboard

## Test Procedure

### Test 1: Request Premium Subscription

#### Step 1: Login as Business Owner
1. Navigate to `/auth/login`
2. Login with business owner credentials
3. Navigate to `/dashboard`

#### Step 2: Locate Premium Status Widget
**Expected:**
- Widget titled "Hazte Premium" with Crown icon
- Yellow/secondary color scheme
- Button: "Solicitar Premium"
- Description mentions badge premium, priority placement

#### Step 3: Request Subscription
1. Click "Solicitar Premium" button
2. Button should show "Solicitando..." (loading state)
3. Success toast: "Solicitud enviada"
4. Widget should refresh showing "Solicitud Pendiente" state

#### Step 4: Verify Database - Subscription Request
```sql
SELECT
  id,
  business_id,
  status,
  requested_at,
  activated_at,
  expires_at
FROM business_subscriptions
WHERE business_id = '[test-business-id]'
ORDER BY requested_at DESC
LIMIT 1;
```
**Expected:**
- `status` = 'requested'
- `requested_at` = current timestamp
- `activated_at` = NULL
- `expires_at` = NULL

#### Step 5: Verify Widget State Change
**Expected widget display:**
- Clock icon
- "Solicitud Pendiente" badge
- Message: "Tu solicitud está siendo revisada por el equipo de BarrioRed"
- Request date displayed

#### Step 6: Test Duplicate Request Prevention
1. Try clicking "Solicitar Premium" again
2. Expected: Button disabled or error message
3. Only one pending request allowed per business

---

### Test 2: Admin Reviews and Activates Subscription

#### Step 1: Logout and Login as Admin
1. Logout from business owner account
2. Login as admin user
3. Navigate to `/admin/subscriptions`

#### Step 2: Verify Admin Subscriptions Page
**Check for:**
- Page title: "Suscripciones"
- Stats strip showing:
  - Pending subscriptions count
  - Active subscriptions count
  - Cancelled subscriptions count
- Filters: Status (all/requested/active/cancelled), Search by business
- Table/cards showing subscription requests

#### Step 3: Locate Test Subscription
1. Use filters if needed: Status = "Requested"
2. Find the test business subscription
3. Card should show:
   - Business name
   - Owner name
   - Request date
   - "Solicitado" badge
   - "Ver Detalle" button

#### Step 4: Navigate to Subscription Detail
1. Click "Ver Detalle" or the subscription card
2. Navigate to `/admin/subscriptions/[subscription-id]`

#### Step 5: Review Subscription Details
**Page should display:**
- Subscription ID
- Business information (name, owner, community)
- Status badge: "Solicitado"
- Request date
- Activation form (visible for requested subscriptions)

#### Step 6: Activate Subscription
1. In activation form, fill in:
   - **Duration:** Select "30 Días" (or other option)
   - **Amount:** Enter "50000" (50,000 COP)
   - **Payment Method:** Select "Transferencia Bancaria"
   - **Payment Proof:** Optional - upload receipt image
   - **Notes:** Optional - "Primera suscripción de prueba"

2. Click "Activar Suscripción"
3. Expect loading state, then success toast
4. Page should refresh showing updated state

#### Step 7: Verify Database - Activation
```sql
SELECT
  id,
  business_id,
  status,
  requested_at,
  activated_at,
  expires_at
FROM business_subscriptions
WHERE id = '[subscription-id]';
```
**Expected:**
- `status` = 'active'
- `activated_at` = current timestamp
- `expires_at` = current timestamp + 30 days

#### Step 8: Verify Payment Record
```sql
SELECT
  id,
  subscription_id,
  amount,
  payment_method,
  recorded_by,
  recorded_at,
  period_start,
  period_end
FROM subscription_payments
WHERE subscription_id = '[subscription-id]'
ORDER BY recorded_at DESC
LIMIT 1;
```
**Expected:**
- Payment record created
- `amount` = 50000.00
- `payment_method` = "Transferencia Bancaria"
- `recorded_by` = admin user ID
- Period dates match subscription activation/expiration

#### Step 9: Verify Business Featured Status
```sql
SELECT id, name, is_featured
FROM businesses
WHERE id = '[test-business-id]';
```
**Expected:**
- `is_featured` = true

---

### Test 3: Verify Premium Badge Visibility

#### Step 1: Check Directory Listing
1. Navigate to `/parqueindustrial/directory`
2. Look for test business in the list

**Expected:**
- Test business appears at TOP of list (premium businesses sorted first)
- Premium badge visible on business card (Crown icon + "Premium" text)
- Yellow/secondary color badge with rotation

#### Step 2: Check Business Profile
1. Navigate to test business profile page
2. Check business name area

**Expected:**
- Premium badge displayed next to business name
- Badge styled with Crown icon, secondary color, rotated

#### Step 3: Check Category Directory
1. Navigate to business's category page
2. Verify premium business shows first in category too

---

### Test 4: Record Renewal Payment

#### Step 1: Navigate Back to Subscription Detail (as Admin)
1. Go to `/admin/subscriptions/[subscription-id]`
2. Page now shows "Premium Activo" status
3. Payment recording form visible
4. Payment history table shows initial activation payment

#### Step 2: Record Renewal Payment
1. In payment recording form, fill:
   - **Amount:** 50000
   - **Payment Method:** "Nequi"
   - **Period Start:** Today
   - **Period End:** Today + 30 days
   - **Notes:** "Renovación mensual"

2. Click "Registrar Pago"
3. Success toast appears
4. Payment history table refreshes

#### Step 3: Verify Second Payment
```sql
SELECT
  id,
  amount,
  payment_method,
  period_start,
  period_end,
  recorded_at
FROM subscription_payments
WHERE subscription_id = '[subscription-id]'
ORDER BY recorded_at DESC;
```
**Expected:**
- Two payment records
- Most recent is renewal payment
- Total revenue shown correctly in admin panel

---

### Test 5: Business Owner Cancels Subscription

#### Step 1: Login as Business Owner
1. Logout from admin
2. Login as business owner
3. Navigate to `/dashboard`

#### Step 2: Locate Premium Status Widget (Active State)
**Expected display:**
- Crown icon with primary color
- "Premium Activo" badge
- Expiration date displayed
- "Cancelar Suscripción" button

#### Step 3: Cancel Subscription
1. Click "Cancelar Suscripción"
2. Confirmation modal appears:
   - Warning message
   - Mentions losing badge and featured placement
   - Confirm and Cancel buttons

3. Click "Confirmar Cancelación"
4. Loading state
5. Success toast: "Suscripción cancelada"
6. Widget refreshes to "Cancelled" state

#### Step 4: Verify Database - Cancellation
```sql
SELECT
  id,
  status,
  cancelled_at,
  cancellation_reason
FROM business_subscriptions
WHERE id = '[subscription-id]';
```
**Expected:**
- `status` = 'cancelled'
- `cancelled_at` = current timestamp
- `cancellation_reason` = user-provided or default

#### Step 5: Verify Business Featured Status Removed
```sql
SELECT id, name, is_featured
FROM businesses
WHERE id = '[test-business-id]';
```
**Expected:**
- `is_featured` = false

#### Step 6: Verify Badge Removed from Frontend
1. Visit directory page
2. Test business no longer at top
3. No premium badge visible
4. Visit business profile - no premium badge

---

### Test 6: Subscription Expiration (Cron Job)

#### Step 1: Create Expired Subscription
```sql
-- Update subscription to be expired (for testing)
UPDATE business_subscriptions
SET
  expires_at = NOW() - INTERVAL '1 day',
  status = 'active'
WHERE id = '[subscription-id]';

-- Ensure business is featured
UPDATE businesses
SET is_featured = true
WHERE id = '[test-business-id]';
```

#### Step 2: Run Cron Job Manually
```bash
curl -X GET http://localhost:3000/api/cron/daily-expiration \
  -H "Authorization: Bearer your_secure_random_cron_secret_here_change_in_production"
```

**Expected response:**
```json
{
  "success": true,
  "expiredSubscriptions": 1,
  "expiredBanners": 0,
  "timestamp": "2026-03-20T..."
}
```

#### Step 3: Verify Auto-Cancellation
```sql
SELECT
  id,
  status,
  cancelled_at,
  cancellation_reason
FROM business_subscriptions
WHERE id = '[subscription-id]';
```
**Expected:**
- `status` = 'cancelled'
- `cancellation_reason` = 'Expirado por falta de pago'

#### Step 4: Verify Auto-Downgrade
```sql
SELECT id, is_featured
FROM businesses
WHERE id = '[test-business-id]';
```
**Expected:**
- `is_featured` = false

---

## Expected Results Summary

✅ **Request Flow:**
- Business owner can request subscription
- Widget shows pending state
- Duplicate requests prevented
- Database record created with status='requested'

✅ **Admin Activation:**
- Admin sees pending requests
- Can activate with payment details
- Payment record created
- Business marked as featured
- Subscription expires_at calculated correctly

✅ **Premium Visibility:**
- Premium badge appears in directory (top position)
- Badge appears on profile
- Sorting prioritizes premium businesses

✅ **Payment Management:**
- Multiple payments can be recorded
- Payment history tracked
- Revenue totals calculated correctly

✅ **Cancellation:**
- Owner can cancel active subscription
- Confirmation required
- Featured status removed immediately
- Badge removed from all pages

✅ **Expiration:**
- Cron job auto-cancels expired subscriptions
- Featured status auto-removed
- Reason logged as expiration

---

## Troubleshooting

**Issue:** Request button doesn't work
- Check browser console for errors
- Verify `/api/subscriptions/request` returns 200
- Check user owns the business

**Issue:** Admin can't see subscription
- Verify community_id matches admin's community
- Check RLS policies on business_subscriptions table
- Ensure admin role is set correctly

**Issue:** Featured status not updating
- Check API route updates both subscription AND businesses table
- Verify businesses.is_featured column exists
- Check RLS policies allow update

**Issue:** Premium badge not showing
- Verify business.is_featured = true
- Check PremiumBadge component rendered conditionally
- Clear browser cache

---

## Test Data Cleanup

```sql
-- Delete test subscription and payments
DELETE FROM subscription_payments
WHERE subscription_id = '[test-subscription-id]';

DELETE FROM business_subscriptions
WHERE id = '[test-subscription-id]';

-- Reset business featured status
UPDATE businesses
SET is_featured = false
WHERE id = '[test-business-id]';
```
