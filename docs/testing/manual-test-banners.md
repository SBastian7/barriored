# End-to-End Testing: Banner Ads Flow

## Overview
This guide tests the complete banner advertising workflow from upload through admin approval, rotation display, and management (pause/resume/expire).

## Prerequisites
- Local development environment running
- Business owner and admin test accounts
- Test banner image (1200x400px recommended, PNG/JPG)
- Access to Supabase dashboard and Storage

## Test Procedure

### Test 1: Business Owner Uploads Banner

#### Step 1: Login as Business Owner
1. Navigate to `/auth/login`
2. Login with business owner credentials
3. Navigate to `/dashboard`
4. Ensure business is approved (status='approved')

#### Step 2: Locate Banner Ads Manager
**Expected:**
- Widget titled "Publicidad con Banners" with ImageIcon icon
- Upload form visible if no banners exist
- Form fields:
  - Title input
  - Image upload (drag-and-drop or click)
  - Link URL input (optional)
  - Placement radio buttons (Homepage / Directory)

#### Step 3: Fill Banner Upload Form
1. **Title:** "Promoción Especial Marzo"
2. **Image:** Upload test banner (1200x400px)
   - Preview should appear immediately
   - File size limit: check validation
3. **Link URL:** "https://example.com/promo" (optional)
4. **Placement:** Select "Homepage"

#### Step 4: Submit Banner Request
1. Click "Solicitar Banner" button
2. Loading state: "Subiendo..."
3. Success toast: "Banner solicitado exitosamente"
4. Form clears or hides
5. Banner list displays showing new banner with "Solicitado" status

#### Step 5: Verify Supabase Storage Upload
1. Open Supabase dashboard
2. Navigate to Storage → banner-ads bucket
3. Verify image uploaded with correct naming pattern
4. Image should be publicly accessible

#### Step 6: Verify Database - Banner Record
```sql
SELECT
  id,
  business_id,
  title,
  image_url,
  link_url,
  placement,
  status,
  requested_at,
  starts_at,
  ends_at
FROM banner_ads
WHERE business_id = '[test-business-id]'
ORDER BY requested_at DESC
LIMIT 1;
```
**Expected:**
- `status` = 'requested'
- `image_url` points to Supabase Storage
- `link_url` = provided URL or NULL
- `placement` = 'homepage'
- `starts_at` = NULL (admin sets this)
- `ends_at` = NULL

---

### Test 2: Admin Reviews and Approves Banner

#### Step 1: Login as Admin
1. Logout from business owner
2. Login as admin user
3. Navigate to `/admin/banners`

#### Step 2: Verify Admin Banners Page
**Check for:**
- Page title: "Banners"
- Stats strip showing:
  - Requested banners count
  - Active banners count
  - Paused banners count
  - Expired banners count
- Filters: Status, Search
- Table/cards showing banner requests with image thumbnails

#### Step 3: Locate Test Banner
1. Filter by Status = "Requested" if needed
2. Find test banner "Promoción Especial Marzo"
3. Card should show:
   - Thumbnail image preview
   - Title
   - Business name
   - Placement badge
   - "Solicitado" status badge
   - "Ver Detalle" button

#### Step 4: Navigate to Banner Detail
1. Click "Ver Detalle"
2. Navigate to `/admin/banners/[banner-id]`

#### Step 5: Review Banner Details
**Page should display:**
- Full-size banner image preview
- Banner information (title, business, placement, link URL)
- Status: "Solicitado"
- Request date
- Approval form (visible for requested banners)

#### Step 6: Approve Banner
1. In approval form, fill:
   - **Duration:** Select "30 Días"
   - **Amount:** Enter "100000" (100,000 COP)
   - **Payment Method:** Select "Transferencia Bancaria"
   - **Payment Proof:** Optional - upload receipt
   - **Notes:** "Banner aprobado - campaña marzo"

2. Click "Aprobar Banner"
3. Success toast appears
4. Page refreshes showing "Activo" status
5. Start and end dates now displayed

#### Step 7: Verify Database - Approval
```sql
SELECT
  id,
  status,
  starts_at,
  ends_at,
  approved_at,
  approved_by
FROM banner_ads
WHERE id = '[banner-id]';
```
**Expected:**
- `status` = 'active'
- `starts_at` = current timestamp
- `ends_at` = current timestamp + 30 days
- `approved_at` = current timestamp
- `approved_by` = admin user ID

#### Step 8: Verify Payment Record
```sql
SELECT
  id,
  banner_id,
  amount,
  payment_method,
  recorded_by
FROM banner_payments
WHERE banner_id = '[banner-id]';
```
**Expected:**
- Payment record exists
- `amount` = 100000.00
- `payment_method` matches selection

---

### Test 3: Verify Banner Display and Rotation

#### Step 1: Check Homepage Banner
1. Navigate to `/parqueindustrial` (community homepage)
2. Scroll down - banner should appear between hero and quick nav sections
3. Verify:
   - Full-width image displays correctly
   - Responsive sizing (1200x400 aspect ratio)
   - Brutalist styling (4px border, hard shadow)
   - Clickable if link_url is set

#### Step 2: Test Banner Click (if link_url set)
1. Click the banner
2. Should open link in new tab
3. Target: "_blank", rel: "noopener noreferrer"

#### Step 3: Test Random Rotation (if multiple banners exist)
1. Create a second approved banner (repeat Test 1-2)
2. Refresh homepage multiple times (20+ times)
3. Observe that banners rotate randomly
4. Both banners should appear at different times
5. Expected: Approximately equal distribution over many refreshes

#### Step 4: Check Directory Placement
1. Create another banner with `placement = 'directory'`
2. Admin approves it
3. Navigate to `/parqueindustrial/directory`
4. Verify banner appears above business grid
5. Homepage banner should NOT appear on directory and vice versa

#### Step 5: Verify Banner API Endpoint
```bash
# Test active banners API
curl http://localhost:3000/api/banners/active?communityId=[community-id]&placement=homepage
```

**Expected response:**
```json
{
  "banners": [
    {
      "id": "...",
      "title": "Promoción Especial Marzo",
      "image_url": "https://...",
      "link_url": "https://example.com/promo",
      "placement": "homepage"
    }
  ]
}
```

---

### Test 4: Admin Pauses and Resumes Banner

#### Step 1: Pause Active Banner
1. As admin, navigate to `/admin/banners/[banner-id]`
2. Banner status shows "Activo"
3. "Pausar Banner" button visible
4. Click "Pausar Banner"
5. Success toast: "Banner pausado"
6. Status updates to "Pausado"

#### Step 2: Verify Database - Paused Status
```sql
SELECT id, status
FROM banner_ads
WHERE id = '[banner-id]';
```
**Expected:**
- `status` = 'paused'

#### Step 3: Verify Banner Hidden from Frontend
1. Navigate to homepage (placement page)
2. Refresh multiple times
3. Paused banner should NOT appear
4. Only active banners should display

#### Step 4: Resume Banner
1. Navigate back to `/admin/banners/[banner-id]`
2. "Reanudar Banner" button now visible
3. Click "Reanudar Banner"
4. Success toast: "Banner reanudado"
5. Status back to "Activo"

#### Step 5: Verify Banner Reappears
1. Navigate to homepage
2. Refresh page
3. Banner should reappear in rotation

---

### Test 5: Banner Expiration (Cron Job)

#### Step 1: Create Expired Banner (for testing)
```sql
-- Set banner to expired date
UPDATE banner_ads
SET
  ends_at = NOW() - INTERVAL '1 day',
  status = 'active'
WHERE id = '[banner-id]';
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
  "expiredSubscriptions": 0,
  "expiredBanners": 1,
  "timestamp": "..."
}
```

#### Step 3: Verify Auto-Expiration
```sql
SELECT id, status
FROM banner_ads
WHERE id = '[banner-id]';
```
**Expected:**
- `status` = 'expired'

#### Step 4: Verify Expired Banner Hidden
1. Navigate to placement page (homepage/directory)
2. Expired banner should NOT display
3. Only active banners show

#### Step 5: Check Admin View of Expired Banner
1. Navigate to `/admin/banners`
2. Filter by Status = "Expired"
3. See expired banner in list
4. View detail page - shows "Expirado" status
5. No action buttons (expired is final state)

---

### Test 6: Admin Deletes Banner

#### Step 1: Create Test Banner for Deletion
1. Upload and approve a new banner (repeat Test 1-2)
2. Navigate to banner detail as admin

#### Step 2: Delete Banner
1. "Eliminar Banner" button visible (usually for rejected/expired)
2. Click button
3. Confirmation dialog appears
4. Confirm deletion
5. Redirect to `/admin/banners`
6. Banner removed from list

#### Step 3: Verify Database Deletion
```sql
SELECT id, status
FROM banner_ads
WHERE id = '[deleted-banner-id]';
```
**Expected:**
- Record deleted (no results) OR status = 'deleted'

#### Step 4: Verify Storage Image
- Supabase Storage image may remain (cleanup separately)
- Or implement cascade delete to remove image

---

### Test 7: Business Owner Manages Banners

#### Step 1: Login as Business Owner with Multiple Banners
1. Create 3 banners with different statuses:
   - Requested
   - Active
   - Expired

#### Step 2: View Banner List in Dashboard
1. Navigate to `/dashboard`
2. Scroll to Banner Ads Manager widget
3. Verify all banners listed:
   - Each shows thumbnail
   - Title
   - Status badge (color-coded)
   - Dates (if approved)

#### Step 3: Verify Status Badge Colors
- **Solicitado:** Secondary/yellow
- **Activo:** Primary/red
- **Pausado:** Gray
- **Expirado:** Red/destructive

#### Step 4: Test Pause Button (if active)
1. Active banner shows "Pausar" button in dashboard
2. Click it
3. Confirmation or direct action
4. Status updates to "Pausado"

---

## Expected Results Summary

✅ **Upload Flow:**
- Business owner can upload banner with image preview
- Image uploaded to Supabase Storage
- Banner record created with status='requested'
- Form validation prevents invalid submissions

✅ **Admin Approval:**
- Admin sees all requested banners with previews
- Can approve with payment and duration
- Payment record created
- Banner status='active' with dates set

✅ **Display & Rotation:**
- Active banners display on correct placements
- Homepage vs Directory placement respected
- Multiple banners rotate randomly
- Link URLs work correctly
- Brutalist styling applied

✅ **Management:**
- Admin can pause/resume active banners
- Paused banners hidden from public
- Banner actions reflected immediately

✅ **Expiration:**
- Cron job auto-expires past end_date
- Expired banners hidden from public
- Admin can view expired banner history

✅ **Deletion:**
- Admin can delete banners
- Deletion removes from database
- Storage cleanup (if implemented)

---

## Troubleshooting

**Issue:** Image upload fails
- Check file size (max 5MB usually)
- Verify Supabase Storage bucket permissions
- Check RLS policies on banner-ads bucket
- Verify correct bucket name in code

**Issue:** Banner not displaying
- Check status='active'
- Verify dates: starts_at <= NOW <= ends_at
- Check placement matches page (homepage/directory)
- Verify community_id matches
- Clear browser cache

**Issue:** Rotation not working
- Create multiple active banners (need 2+)
- Check random selection logic in BannerRotator
- Verify `/api/banners/active` returns multiple

**Issue:** Cron job not expiring
- Check ends_at date is in past
- Verify CRON_SECRET correct
- Check banner status was 'active'
- Review cron job logs

---

## Test Data Cleanup

```sql
-- Delete test banner payments
DELETE FROM banner_payments
WHERE banner_id IN (SELECT id FROM banner_ads WHERE title LIKE '%Prueba%');

-- Delete test banners
DELETE FROM banner_ads
WHERE title LIKE '%Prueba%' OR title LIKE '%Test%';

-- Manually delete images from Supabase Storage if needed
```

---

## Performance Notes

- Banner images should be optimized (1200x400px, compressed)
- Consider lazy loading for banners below fold
- Cache `/api/banners/active` response (5-minute TTL recommended)
- Limit active banners per community (10-20 max for reasonable rotation)
