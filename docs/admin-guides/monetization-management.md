# Admin Guide: Monetization Management

## Overview
This guide explains how community administrators manage premium subscriptions, banner ads, review flags, and payments for the BarrioRed platform.

**Target Audience:** Community Administrators
**Access Required:** Admin role with community assignment

---

## Table of Contents
1. [Premium Subscriptions](#premium-subscriptions)
2. [Banner Advertisements](#banner-advertisements)
3. [Review Flags](#review-flags)
4. [Payments Dashboard](#payments-dashboard)
5. [Monthly Billing Workflow](#monthly-billing-workflow)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Premium Subscriptions

### What Are Premium Subscriptions?

Premium subscriptions give businesses:
- **Premium Badge:** Yellow crown badge with "Premium" text
- **Priority Placement:** Featured at top of directory listings
- **Enhanced Visibility:** Stands out from regular businesses

Pricing: Typically 30,000-100,000 COP/month (set per community)

### Accessing Subscriptions

1. Login to admin panel
2. Navigate to sidebar → **Suscripciones** (under Monetización section)
3. Page shows:
   - Stats: Pending / Active / Cancelled counts
   - Filters: Status, Search by business name
   - List of all subscriptions

### Reviewing Subscription Requests

#### Step 1: Identify Pending Requests
- Filter by Status = "Solicitado"
- Pending requests show "Solicitado" badge (yellow)
- Card displays:
  - Business name
  - Owner name and contact
  - Request date

#### Step 2: Review Business Eligibility
Before approving, verify:
- [ ] Business has complete profile (photos, description, hours)
- [ ] Business is active and legitimate
- [ ] Owner is responsive (test contact)
- [ ] No previous payment issues

#### Step 3: Open Subscription Detail
- Click "Ver Detalle" on the subscription card
- Detail page shows:
  - Full business information
  - Owner contact details
  - Request date
  - Activation form (for pending requests)

### Activating a Subscription

#### Step 1: Complete Activation Form
Fill in the following fields:

**Duration:** Select subscription length
- 30 Días (1 month) - standard
- 60 Días (2 months) - occasional
- 90 Días (3 months) - rare

**Amount:** Enter payment amount in COP
- Standard: 50,000 COP/month
- Custom pricing allowed

**Payment Method:** Select how business paid
- Transferencia Bancaria (most common)
- Nequi
- Daviplata
- Efectivo (cash)

**Payment Proof (Optional):** Upload receipt/screenshot
- Click "Choose File" or drag image
- Supported: JPG, PNG, PDF
- Keep for records

**Notes (Optional):** Add internal notes
- Example: "Primera suscripción - descuento 10%"
- Visible only to admins

#### Step 2: Submit Activation
1. Review all details carefully
2. Click "Activar Suscripción" button
3. Button shows "Activando..." (loading state)
4. Success toast: "Suscripción activada"
5. Page refreshes showing "Activo" status

#### Step 3: Verify Activation
After activation, confirm:
- [ ] Status badge shows "Premium Activo" (red)
- [ ] Expiration date displayed (Today + duration)
- [ ] Payment record appears in history table
- [ ] Business now shows premium badge in directory
- [ ] Business appears at top of listings

### Recording Renewal Payments

When a business renews their subscription:

#### Step 1: Navigate to Active Subscription
1. Go to Suscripciones page
2. Filter by Status = "Activo"
3. Find the renewing business
4. Click "Ver Detalle"

#### Step 2: Use Payment Recording Form
Below the subscription details, find "Registrar Pago" form:

**Amount:** Enter renewal payment (usually same as original)

**Payment Method:** Select method used

**Period Start:** Select the date payment covers FROM
- Usually today's date or expiration date

**Period End:** Select the date payment covers UNTIL
- Usually period_start + 30 days

**Payment Proof (Optional):** Upload receipt

**Notes (Optional):** Add notes
- Example: "Renovación mensual - segundo mes"

#### Step 3: Submit Payment
1. Click "Registrar Pago"
2. Success toast appears
3. Payment appears in history table
4. Subscription expiration date extended

### Handling Cancellations

Business owners can cancel their own subscriptions. When they do:

**What Happens:**
- Status changes to "Cancelado"
- Premium badge removed immediately
- Business returns to regular position in listings
- Expiration date remains (for records)

**Admin Actions:**
- No action required (automatic)
- Review cancellation reason (if provided)
- Consider follow-up to understand why

**Viewing Cancelled Subscriptions:**
1. Filter by Status = "Cancelado"
2. View detail to see cancellation reason
3. Can't reactivate - business must request again

---

## Banner Advertisements

### What Are Banner Ads?

Banner ads are image advertisements displayed on:
- **Homepage:** Between hero section and quick nav
- **Directory:** Above business listings

**Specs:**
- Size: 1200x400px recommended
- Format: JPG or PNG
- Max file size: 5MB (recommend < 200KB)
- Rotation: Multiple active banners rotate randomly

Pricing: Typically 100,000-300,000 COP per 30 days

### Accessing Banners

1. Navigate to sidebar → **Banners** (under Monetización)
2. Page shows:
   - Stats: Requested / Active / Paused / Expired counts
   - Filters: Status, Search
   - List with image thumbnails

### Reviewing Banner Requests

#### Step 1: Identify Pending Banners
- Filter by Status = "Solicitado"
- Cards show image thumbnail, business name, placement

#### Step 2: Review Banner Content
Click "Ver Detalle" to see:
- Full-size image preview
- Banner title
- Business name
- Link URL (if provided)
- Placement (Homepage or Directory)
- Request date

**Content Review Checklist:**
- [ ] Image is appropriate (no offensive content)
- [ ] Image quality is good (not blurry/pixelated)
- [ ] Text is readable
- [ ] Brand logos don't violate trademarks
- [ ] Link URL is safe (if provided)
- [ ] Dimensions appropriate (not stretched/distorted)

#### Step 3: Approve or Reject

### Approving a Banner

#### Fill Approval Form:

**Duration:** Select how long banner runs
- 7 Días (test run)
- 15 Días
- 30 Días (standard)
- 60 Días
- 90 Días (max)

**Amount:** Enter payment in COP
- Standard: 100,000 COP/month
- Pro-rate for shorter periods

**Payment Method:** How business paid

**Payment Proof:** Upload receipt

**Notes:** Add context
- Example: "Campaña marzo - 20% descuento"

#### Click "Aprobar Banner"
- Status changes to "Activo"
- Start and end dates set automatically
- Banner begins displaying immediately

### Rejecting a Banner

If banner violates guidelines:

1. Click "Rechazar Banner" button
2. Modal opens asking for rejection reason
3. Enter reason:
   - "Imagen inapropiada"
   - "Calidad insuficiente"
   - "Contenido engañoso"
   - Custom reason
4. Click "Confirmar Rechazo"
5. Business owner notified (if system supports)

### Managing Active Banners

#### Pause a Banner
Use when business requests temporary pause or issue arises:
1. Go to active banner detail
2. Click "Pausar Banner"
3. Confirmation
4. Status = "Pausado"
5. Banner stops displaying immediately
6. Can resume later

#### Resume a Banner
1. Go to paused banner detail
2. Click "Reanudar Banner"
3. Status back to "Activo"
4. Banner displays again

#### Delete a Banner
Permanent removal (use cautiously):
1. Go to banner detail (any status)
2. Click "Eliminar Banner"
3. Confirm deletion
4. Banner removed from database
5. Cannot undo

### Banner Expiration

Banners automatically expire:
- Daily cron job checks `ends_at` dates
- If `ends_at < today`, status changes to "Expirado"
- Expired banners stop displaying
- Admin can view expired banners for records

---

## Review Flags

### What Are Review Flags?

Business owners can flag reviews they believe are:
- Spam
- Offensive
- Fake/fraudulent
- Irrelevant
- Other reasons

Admin decides: **Dismiss** (review stays) or **Remove** (review deleted)

### Accessing Review Flags

1. Navigate to sidebar → **Reseñas Reportadas** (under Monetización)
2. Page shows:
   - Stats: Pending / Dismissed / Removed counts
   - Filters: Status, Search
   - List of flagged reviews

### Reviewing a Flag

#### Step 1: Identify Pending Flags
- Filter by Status = "Pendiente"
- Cards show:
  - Business name
  - Flagger (business owner) name
  - Reason badge
  - Flag date
  - Review preview (rating + excerpt)

#### Step 2: Open Flag Detail
Click "Ver Detalle" to see complete context:

**Flag Information:**
- Who flagged it (business owner)
- When
- Reason (spam/offensive/fake/irrelevant/other)
- Optional description from flagger

**Full Review Context:**
- Business name
- Reviewer name
- Review date
- Complete star rating
- Full review text
- Any business response

### Moderating a Flag

#### Option 1: Dismiss the Flag
Choose this when:
- Review is legitimate opinion
- No policy violations
- Minor complaint not warranting removal

**Action:**
1. Scroll to "Desestimar Reporte" card
2. Read description: "La reseña permanecerá visible"
3. Click "Desestimar"
4. Flag status → "Desestimado"
5. Review remains on business profile

#### Option 2: Remove the Review
Choose this when:
- Review violates guidelines
- Clearly spam or fake
- Offensive content
- Factually incorrect and harmful

**Action:**
1. Scroll to "Eliminar Reseña" card
2. Read description: "La reseña será eliminada permanentemente"
3. Click "Eliminar Reseña"
4. Confirmation dialog: "¿Estás seguro?"
5. Confirm
6. Flag status → "Eliminado"
7. Review deleted from database and profile

### Guidelines for Moderation

**Dismiss (Review Stays) When:**
- Negative but honest opinion
- Personal preference (taste, style)
- Minor service issues
- Subjective criticism
- Emotional but not abusive

**Remove (Review Deleted) When:**
- Spam or promotional content
- Profanity or hate speech
- Personal attacks on staff
- Clearly fake (never visited)
- Competitor sabotage
- Violates community guidelines

**When Unsure:**
- Err on side of free speech
- Dismiss rather than remove
- Consider business response option
- Consult other admins if available

---

## Payments Dashboard

### Accessing Payments

1. Navigate to sidebar → **Pagos** (under Monetización)
2. Combined view of ALL payments (subscriptions + banners)

### Dashboard Sections

#### Revenue Stats (Top)
- **Total Revenue:** All-time total
- **Monthly Revenue:** Current month total
- **Subscription Revenue:** All-time subscriptions
- **Banner Revenue:** All-time banners

#### Filters
- **Type:** All / Subscriptions / Banners
- **Payment Method:** All / Transferencia / Nequi / Daviplata / Efectivo
- **Search:** Business name
- **CSV Export:** Download records

#### Payment List
Each entry shows:
- Business name
- Type (Suscripción or Banner)
- Amount (COP)
- Payment method
- Date recorded
- Admin who recorded
- Link to detail page

### Exporting Payment Records

For accounting/reporting:
1. Apply filters (optional) - date range, type, etc.
2. Click "Exportar CSV" button
3. File downloads: `payments-[date].csv`
4. Open in Excel/Google Sheets
5. Contains: Date, Business, Type, Amount, Method, Admin

---

## Monthly Billing Workflow

### Week 1: Monitor Expiring Subscriptions

**Goal:** Identify subscriptions expiring this month

1. Navigate to Suscripciones
2. Filter Status = "Activo"
3. Sort by expiration date
4. Note subscriptions expiring in next 30 days

**Proactive Steps:**
- Create list of expiring subscriptions
- Contact business owners (email/WhatsApp)
- Remind them of expiration date
- Confirm renewal intent
- Provide payment instructions

### Week 2-3: Process Renewals

**Goal:** Record renewal payments as they come in

For each renewal:
1. Receive payment confirmation (transfer/Nequi/etc.)
2. Navigate to subscription detail
3. Use "Registrar Pago" form
4. Enter:
   - Amount received
   - Payment method
   - Period start (usually expiration date)
   - Period end (start + 30 days)
   - Upload payment proof
5. Click "Registrar Pago"
6. Expiration date automatically extends

**Track Progress:**
- Check off renewals as processed
- Follow up on non-renewals
- Understand cancellation reasons

### Week 4: Month-End Reconciliation

**Goal:** Ensure all payments recorded, generate reports

1. Navigate to Pagos dashboard
2. Set filters:
   - Date range: This month
   - Export CSV
3. Review totals:
   - Subscription revenue
   - Banner revenue
   - Total monthly revenue
4. Cross-check with bank statements
5. Document any discrepancies

**Generate Monthly Report:**
- Active subscriptions count
- New subscriptions this month
- Renewals processed
- Cancellations
- Total subscription revenue
- Active banners count
- New banners this month
- Expired banners
- Total banner revenue
- Combined revenue
- Growth metrics

---

## Common Tasks

### Task: Activate First-Time Premium Subscription
1. Filter Suscripciones by "Solicitado"
2. Click "Ver Detalle" on request
3. Review business profile
4. Fill activation form:
   - Duration: 30 Días
   - Amount: 50000
   - Method: Transferencia Bancaria
   - Upload proof
   - Notes: "Primera suscripción - bienvenido a Premium"
5. Click "Activar Suscripción"
6. Verify badge appears in directory

### Task: Approve Standard Banner Ad
1. Filter Banners by "Solicitado"
2. Click "Ver Detalle"
3. Review image quality and content
4. Fill approval form:
   - Duration: 30 Días
   - Amount: 100000
   - Method: Nequi
   - Upload proof
   - Notes: "Banner campaña marzo"
5. Click "Aprobar Banner"
6. Verify banner displays on homepage/directory

### Task: Handle Difficult Review Flag
1. Go to Reseñas Reportadas
2. Filter "Pendiente"
3. Open flag detail
4. Read flagger's reason and description
5. Read full review context
6. Consider:
   - Is review factually accurate?
   - Is tone respectful (even if negative)?
   - Does it violate guidelines?
7. If unclear, research:
   - Check other reviews from same user
   - Check business's response pattern
   - Consult community guidelines
8. Make decision: Dismiss or Remove
9. Document reasoning internally

### Task: Extend Subscription Due to Issue
If business experienced downtime or issue:
1. Go to subscription detail
2. Use "Registrar Pago" form
3. Amount: 0 (credit/goodwill)
4. Period start: Original expiration
5. Period end: Original expiration + extension days
6. Notes: "Extensión por [reason] - cortesía"
7. This extends expiration without charging

---

## Troubleshooting

### Issue: Subscription Activated But Badge Not Showing
**Cause:** Database update didn't complete
**Solution:**
1. Check database directly:
   ```sql
   SELECT is_featured FROM businesses WHERE id = '[business-id]';
   ```
2. If `is_featured = false`, update manually:
   ```sql
   UPDATE businesses SET is_featured = true WHERE id = '[business-id]';
   ```
3. Clear browser cache
4. Refresh directory page

### Issue: Banner Approved But Not Displaying
**Checks:**
1. Verify status = 'active'
2. Check dates: `starts_at <= NOW <= ends_at`
3. Verify placement matches page viewing
4. Check community_id matches
5. Try different browser/incognito
6. Check Supabase Storage - image accessible?

**Solution:** If all checks pass, image might not have uploaded:
- Re-upload image in banner detail
- Or ask business owner to resubmit

### Issue: Payment Proof Upload Fails
**Cause:** File size too large or wrong format
**Solution:**
- Max size: 5MB
- Supported: JPG, PNG, PDF
- Compress image before upload
- Or skip upload (not required)

### Issue: Cron Job Not Expiring Subscriptions/Banners
**Checks:**
1. Verify cron job running (Vercel dashboard → Cron Jobs)
2. Check CRON_SECRET environment variable set
3. Test manually:
   ```bash
   curl -X GET https://your-domain.com/api/cron/daily-expiration \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
4. Check response for errors
5. Review Vercel logs for cron execution

---

## Best Practices

### Communication
- **Respond promptly** to subscription requests (within 24 hours)
- **Be professional** in all interactions
- **Explain decisions** when rejecting content
- **Proactive reminders** for expiring subscriptions

### Record Keeping
- **Always upload payment proof** when available
- **Add detailed notes** for unusual situations
- **Export monthly reports** for accounting
- **Keep receipts** organized

### Moderation
- **Consistent guidelines** for review flags
- **Fair and impartial** decisions
- **Document reasoning** for removals
- **Respect free speech** when possible

### Pricing
- **Clear pricing structure** communicated upfront
- **Discounts documented** in notes
- **Pro-rated refunds** when appropriate
- **Competitive rates** for community

---

## Support Resources

### Internal Documentation
- E2E Testing Guides: `docs/testing/`
- Performance Guide: `docs/performance.md`
- Polish Checklist: `docs/polish-checklist.md`

### Supabase Admin
- [Supabase Dashboard](https://app.supabase.com)
- Storage: Check uploaded images
- Database: Run manual queries if needed

### Contact
- Developer: [Your contact]
- Community Lead: [Community admin contact]
- Technical Issues: [Support email]

---

**Document Version:** 1.0
**Last Updated:** March 20, 2026
**Next Review:** April 20, 2026
