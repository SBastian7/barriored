# End-to-End Testing: Review Flagging Flow

## Overview
This guide tests the complete review flagging workflow where business owners can report inappropriate reviews for admin moderation.

## Prerequisites
- Local development environment running
- Three test accounts:
  - Business Owner
  - Regular User (reviewer)
  - Admin
- Business with at least one review from another user
- Access to Supabase dashboard

## Test Procedure

### Test 1: Regular User Writes Review

#### Step 1: Login as Regular User (Not Business Owner)
1. Navigate to `/auth/login`
2. Login with regular user credentials
3. Navigate to test business profile page

#### Step 2: Write a Review
1. Click "Escribir Reseña" button
2. Modal/form opens
3. Fill in:
   - **Rating:** 2 stars (intentionally low for testing)
   - **Comment:** "Servicio lento, atención deficiente"
4. Click "Enviar Reseña"
5. Success toast appears
6. Review appears in reviews list

#### Step 3: Verify Review in Database
```sql
SELECT
  id,
  business_id,
  user_id,
  rating,
  comment,
  created_at
FROM business_reviews
WHERE business_id = '[test-business-id]'
ORDER BY created_at DESC
LIMIT 1;
```
**Expected:**
- Review record created
- `user_id` = regular user (not business owner)
- No response yet

---

### Test 2: Business Owner Flags Review

#### Step 1: Logout and Login as Business Owner
1. Logout from regular user
2. Login as business owner who owns the test business
3. Navigate to own business profile

#### Step 2: Locate Flag Button
1. Scroll to Reviews section
2. Find the review written by regular user
3. **Verify button visibility logic:**
   - Flag button (🚩 "Reportar") should appear ONLY on other users' reviews
   - Business owner's own reviews should show Edit/Delete buttons instead
   - Flag button should NOT appear on business owner's own reviews

#### Step 3: Open Flag Modal
1. Click "Reportar" button on the test review
2. Modal opens with title "Reportar Reseña"
3. Form contains:
   - **Razón:** Dropdown select (required)
   - **Descripción:** Textarea (optional, 500 char max)
   - Submit and Cancel buttons

#### Step 4: Fill and Submit Flag Form
1. **Razón:** Select "fake" (Falso)
2. **Descripción:** "Esta reseña parece falsa, nunca vino al negocio"
3. Character counter shows: X/500
4. Click "Enviar Reporte"

#### Step 5: Verify Success State
- Loading state: "Enviando..."
- Success message appears: "✅ Reseña reportada. Un administrador la revisará."
- Modal auto-closes after 2 seconds
- Flag button disappears (or becomes disabled)

#### Step 6: Verify Database - Flag Record
```sql
SELECT
  id,
  review_id,
  flagger_id,
  reason,
  description,
  status,
  flagged_at
FROM review_flags
WHERE review_id = '[review-id]'
ORDER BY flagged_at DESC
LIMIT 1;
```
**Expected:**
- `flagger_id` = business owner user ID
- `reason` = 'fake'
- `description` = provided text
- `status` = 'pending'
- `flagged_at` = current timestamp

#### Step 7: Test Duplicate Flag Prevention
1. Try to flag the same review again (refresh if needed)
2. Expected: Flag button hidden or disabled
3. Database constraint prevents duplicate: `UNIQUE(review_id, flagger_id)`

---

### Test 3: Admin Reviews Flagged Review

#### Step 1: Login as Admin
1. Logout from business owner
2. Login as admin user
3. Navigate to `/admin/review-flags`

#### Step 2: Verify Admin Review Flags Page
**Check for:**
- Page title: "Reseñas Reportadas"
- Stats strip showing:
  - Pendientes count
  - Desestimados count
  - Eliminados count
- Filters: Status (all/pending/dismissed/removed), Search
- Table/cards showing flagged reviews

#### Step 3: Locate Test Flag
1. Use filter: Status = "Pendientes"
2. Find the flagged review
3. Card should display:
   - Flag icon (red)
   - Business name
   - "Reportado por: [Business Owner Name]"
   - Reason badge (e.g., "fake")
   - Flag date
   - "Pendiente" status badge (secondary color)
   - Review preview (rating stars + excerpt)
   - "Ver Detalle" button

#### Step 4: Navigate to Flag Detail
1. Click "Ver Detalle" or card
2. Navigate to `/admin/review-flags/[flag-id]`

#### Step 5: Review Complete Context
**Page should display:**

**Flag Information Section:**
- Flagger name and email
- Flag date and time
- Reason badge
- Optional description text

**Full Review Context Section:**
- Business name
- Reviewer name and email
- Review date
- Full star rating (1-5 stars displayed)
- Complete review comment text
- Any business response (if exists)

**Resolution Actions (for pending flags):**
- Two cards side-by-side:
  1. **Dismiss:** "Desestimar Reporte" - review stays visible
  2. **Remove:** "Eliminar Reseña" - review deleted permanently

---

### Test 4: Admin Dismisses Flag

#### Step 1: Choose to Dismiss
1. On flag detail page, locate "Desestimar Reporte" card
2. Read description: "La reseña permanecerá visible"
3. Click "Desestimar" button

#### Step 2: Verify Action
- Success toast: "Reporte desestimado"
- Page refreshes
- Status badge changes to "Desestimado"
- Resolution actions disappear
- Message: "Este reporte ya ha sido resuelto - El reporte fue desestimado y la reseña permanece visible"

#### Step 3: Verify Database - Dismissed Status
```sql
SELECT
  id,
  status,
  resolved_at
FROM review_flags
WHERE id = '[flag-id]';
```
**Expected:**
- `status` = 'dismissed'
- `resolved_at` = current timestamp

#### Step 4: Verify Review Still Exists
```sql
SELECT id, comment
FROM business_reviews
WHERE id = '[review-id]';
```
**Expected:**
- Review record still exists
- Still visible on business profile

#### Step 5: Check Business Profile
1. Navigate to business profile as visitor
2. Review is still visible in reviews list
3. No indication of flag (internal admin info only)

---

### Test 5: Admin Removes Review

#### Step 1: Create Second Flagged Review
1. As regular user, write another negative review
2. As business owner, flag it with reason "offensive"
3. As admin, navigate to this new flag detail

#### Step 2: Choose to Remove Review
1. Locate "Eliminar Reseña" card (red border)
2. Read description: "La reseña será eliminada permanentemente"
3. Click "Eliminar Reseña" button
4. Confirmation dialog appears: "¿Estás seguro de eliminar esta reseña? Esta acción no se puede deshacer."
5. Click "Confirmar"

#### Step 3: Verify Removal
- Success toast: "Reseña eliminada"
- Redirected to `/admin/review-flags` list page
- Flag removed from list (or marked as removed)

#### Step 4: Verify Database - Review Deleted
```sql
SELECT id, comment
FROM business_reviews
WHERE id = '[review-id]';
```
**Expected:**
- No results (review deleted)

#### Step 5: Verify Database - Flag Status
```sql
SELECT id, status, resolved_at
FROM review_flags
WHERE id = '[flag-id]';
```
**Expected:**
- `status` = 'removed'
- `resolved_at` = current timestamp

#### Step 6: Check Business Profile
1. Navigate to business profile
2. Review no longer appears in reviews list
3. Review count decremented
4. Average rating recalculated (if applicable)

---

### Test 6: Edge Cases and Permissions

#### Test 6A: Regular User Cannot Flag
1. Login as regular user (not business owner)
2. Navigate to any business profile (not owned by this user)
3. View reviews section
4. **Expected:** No flag buttons visible
5. Only review owners see edit/delete on their own reviews

#### Test 6B: Business Owner Cannot Flag Own Review
1. Business owner writes a review on their own business (edge case)
2. View the review
3. **Expected:** Edit/Delete buttons, NOT flag button
4. Owner cannot flag their own content

#### Test 6C: API Security - Unauthorized Flag Attempt
```bash
# Try to flag without being business owner
curl -X POST http://localhost:3000/api/reviews/[review-id]/flag \
  -H "Content-Type: application/json" \
  -H "Cookie: [non-owner-session]" \
  -d '{"reason":"spam"}'
```
**Expected:**
- 403 Forbidden OR error message
- API validates user is business owner

#### Test 6D: Already Resolved Flag
1. Navigate to dismissed or removed flag detail
2. **Expected:**
   - No action buttons
   - Status badge shows final state
   - Message: "Este reporte ya ha sido resuelto"
   - Cannot re-resolve

---

### Test 7: Admin Filtering and Search

#### Step 1: Create Multiple Flags (different statuses)
- Create 3+ flags with different statuses:
  - Pending
  - Dismissed
  - Removed

#### Step 2: Test Status Filter
1. Navigate to `/admin/review-flags`
2. Select Status = "Pendientes"
3. Only pending flags shown
4. Change to "Desestimados"
5. Only dismissed flags shown

#### Step 3: Test Search
1. Enter business name in search box
2. Results filter to matching business
3. Enter reviewer name
4. Results filter accordingly
5. Clear search - all results return

#### Step 4: Verify Stats Update
- Stats strip counts update as flags are resolved
- Pendientes count decreases when dismissing/removing
- Desestimados/Eliminados counts increase

---

## Expected Results Summary

✅ **Flag Creation:**
- Business owners can flag reviews on their business
- Flag button only visible for other users' reviews
- Modal form validates reason required
- Database record created with status='pending'
- Duplicate flags prevented

✅ **Admin Moderation:**
- All pending flags visible in admin panel
- Complete context shown (flagger, review, business)
- Can dismiss (review stays) or remove (review deleted)
- Actions are irreversible and logged

✅ **Review Visibility:**
- Dismissed flags: review remains visible
- Removed flags: review deleted from database and frontend
- Average rating recalculated after removal

✅ **Permissions:**
- Regular users cannot flag (not business owners)
- Business owners can only flag reviews on their own business
- Owners cannot flag their own reviews
- API enforces ownership checks

✅ **Admin Panel:**
- Filtering and search work correctly
- Stats update in real-time
- Detail pages show complete context
- Resolved flags cannot be re-resolved

---

## Troubleshooting

**Issue:** Flag button not showing
- Verify logged-in user owns the business
- Check `currentUserId === businessOwnerId`
- Ensure review is not by business owner themselves
- Check `canFlag` prop passed correctly to ReviewCard

**Issue:** Flag submission fails
- Check API route `/api/reviews/[id]/flag` returns 200
- Verify business ownership in database
- Check RLS policies on review_flags table
- Review browser console for errors

**Issue:** Admin cannot see flags
- Verify community_id filtering
- Check admin role and permissions
- Ensure RLS policies allow admin read access
- Check join queries include all necessary relations

**Issue:** Review not deleted after removal
- Verify DELETE query in API route
- Check RLS policies allow delete
- Ensure cascade delete if foreign keys exist
- Check transaction rollback on error

---

## Test Data Cleanup

```sql
-- Delete test flags
DELETE FROM review_flags
WHERE review_id IN (
  SELECT id FROM business_reviews
  WHERE comment LIKE '%prueba%' OR comment LIKE '%test%'
);

-- Delete test reviews (if needed)
DELETE FROM business_reviews
WHERE comment LIKE '%prueba%' OR comment LIKE '%test%';
```

---

## Future Enhancements

- **Email notifications:** Notify admin when flag created
- **Flagger notifications:** Notify business owner when flag resolved
- **Flag history:** Show resolution notes/reasoning
- **Bulk actions:** Dismiss/remove multiple flags at once
- **Automated moderation:** AI pre-filter obvious spam/offensive content
