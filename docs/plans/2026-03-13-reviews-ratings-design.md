# Business Reviews & Ratings System - Design Document

**Date:** 2026-03-13
**Phase:** Phase 2 - Monetization
**Status:** Approved Design

## Overview

This document defines the design for the business reviews and ratings system for BarrioRed. This feature allows community members to rate and review local businesses, helping neighbors make informed decisions while providing valuable feedback to merchants.

## Requirements Summary

### Functional Requirements

**User Capabilities (Registered Users):**
- Submit a review for any approved business (1-5 star rating required, written text optional)
- Edit own reviews anytime
- Delete own reviews anytime
- View own review history
- One review per user per business (edit to update)

**Anonymous Visitor Capabilities:**
- View all reviews and ratings for approved businesses
- See average rating scores on business cards and profiles
- See premium/featured badges on businesses

**Business Owner Capabilities:**
- Post one public response per review on their business
- Edit/delete own responses
- Cannot review their own business

**Admin/Moderator Capabilities:**
- Delete any review (post-moderation)
- View flagged reviews
- Moderate inappropriate content

### Non-Functional Requirements

- **Security:** Multi-tenant RLS isolation, user authentication required to review
- **Performance:** Real-time rating aggregation acceptable for <500 businesses
- **Moderation:** Auto-approve with post-moderation (flagging system)
- **Attribution:** Reviews show full name + avatar (community accountability)
- **Design:** Neo-brutalist tropical style (bold stars, thick borders, hard shadows)

## Architecture Decision: Approach 1 - Single Table with Real-Time Aggregation

**Selected Approach:** Single reviews table + separate responses table with real-time rating aggregation.

**Rationale:**
- Simple, single source of truth
- Always accurate (no stale cached data)
- Easy to maintain and debug
- Follows YAGNI principle
- Adequate performance for pilot phase (0-500 businesses, ~5-20 reviews each)
- Can optimize later with cached aggregates if metrics show it's needed

**Trade-offs Accepted:**
- Slightly slower directory page loads (aggregation on every request)
- Acceptable: Performance won't be noticeable until thousands of reviews per business

## Database Schema

### **business_reviews** Table

```sql
CREATE TABLE business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one review per user per business
  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX idx_business_reviews_user ON business_reviews(user_id);
CREATE INDEX idx_business_reviews_created ON business_reviews(created_at DESC);
```

**Key Design Decisions:**
- `UNIQUE(business_id, user_id)` enforces one review per user per business at database level
- `ON DELETE CASCADE` ensures reviews are deleted if business or user is deleted
- `rating CHECK constraint` ensures only valid 1-5 star ratings
- `review_text` is nullable since written reviews are optional
- Indexes on `business_id` (for listing reviews), `user_id` (for user history), `created_at` (for sorting)

### **business_review_responses** Table

```sql
CREATE TABLE business_review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one response per review
  UNIQUE(review_id)
);

CREATE INDEX idx_review_responses_review ON business_review_responses(review_id);
```

**Key Design Decisions:**
- Separate table for business owner responses (normalized)
- One-to-one relationship with reviews
- `ON DELETE CASCADE` ensures responses are deleted when review is deleted
- Tracks `created_at` and `updated_at` for response metadata

## Row Level Security (RLS) Policies

### **business_reviews** Table Policies

```sql
-- Enable RLS
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews for approved businesses
CREATE POLICY "Anyone can view reviews for approved businesses"
  ON business_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_reviews.business_id
      AND businesses.status = 'approved'
    )
  );

-- Authenticated users can create reviews for approved businesses
CREATE POLICY "Authenticated users can create reviews"
  ON business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.status = 'approved'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON business_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON business_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews in their community
CREATE POLICY "Community staff can manage reviews"
  ON business_reviews FOR ALL
  USING (
    is_community_staff((
      SELECT community_id FROM businesses
      WHERE businesses.id = business_reviews.business_id
    )::text)
  );
```

### **business_review_responses** Table Policies

```sql
-- Enable RLS
ALTER TABLE business_review_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can view responses for visible reviews
CREATE POLICY "Anyone can view responses"
  ON business_review_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.status = 'approved'
    )
  );

-- Business owners can create/update responses for their business reviews
CREATE POLICY "Business owners can manage responses"
  ON business_review_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Community staff can manage all responses
CREATE POLICY "Community staff can manage all responses"
  ON business_review_responses FOR ALL
  USING (
    is_community_staff((
      SELECT b.community_id
      FROM business_reviews br
      JOIN businesses b ON b.id = br.business_id
      WHERE br.id = business_review_responses.review_id
    )::text)
  );
```

**Security Features:**
- Multi-tenant isolation: Reviews only visible for approved businesses
- User ownership: Users can only edit/delete their own reviews
- Business owner rights: Can respond to reviews on their business only
- Admin oversight: Community staff can moderate all reviews in their community
- Cascading visibility: Responses inherit visibility from parent review

## API Routes

### Review Management

#### `POST /api/reviews` - Create review
**Request:**
```json
{
  "business_id": "uuid",
  "rating": 1-5,
  "review_text": "string | null"
}
```
**Response:**
```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "business_id": "uuid",
    "user_id": "uuid",
    "rating": 5,
    "review_text": "Great service!",
    "created_at": "2026-03-13T10:00:00Z"
  }
}
```
**Errors:**
- 401: Not authenticated
- 400: Invalid rating (not 1-5)
- 400: Business not found or not approved
- 409: User already reviewed this business
- 403: RLS policy violation (e.g., user owns business)

#### `PATCH /api/reviews/[reviewId]` - Update review
**Request:**
```json
{
  "rating": 4,
  "review_text": "Updated review text"
}
```
**Response:**
```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "rating": 4,
    "review_text": "Updated review text",
    "updated_at": "2026-03-13T11:00:00Z"
  }
}
```
**Errors:**
- 401: Not authenticated
- 403: Not review owner
- 404: Review not found
- 400: Invalid rating

#### `DELETE /api/reviews/[reviewId]` - Delete review
**Response:**
```json
{
  "success": true
}
```
**Errors:**
- 401: Not authenticated
- 403: Not review owner
- 404: Review not found

#### `GET /api/reviews?business_id=[id]` - List reviews
**Query Parameters:**
- `business_id`: UUID (required)
- `limit`: number (default: 10, max: 50)
- `offset`: number (default: 0)
- `sort`: "newest" | "highest" | "lowest" (default: "newest")

**Response:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "review_text": "Excellent!",
      "created_at": "2026-03-13T10:00:00Z",
      "updated_at": "2026-03-13T10:00:00Z",
      "user": {
        "id": "uuid",
        "full_name": "Juan Rodriguez",
        "avatar_url": "https://..."
      },
      "response": {
        "response_text": "Thank you!",
        "created_at": "2026-03-13T12:00:00Z"
      }
    }
  ],
  "total_count": 24,
  "average_rating": 4.2
}
```

### Response Management

#### `POST /api/reviews/[reviewId]/response` - Create/update response
**Request:**
```json
{
  "response_text": "Thank you for your feedback!"
}
```
**Response:**
```json
{
  "success": true,
  "response": {
    "id": "uuid",
    "review_id": "uuid",
    "response_text": "Thank you for your feedback!",
    "created_at": "2026-03-13T12:00:00Z"
  }
}
```
**Errors:**
- 401: Not authenticated
- 403: Not business owner
- 404: Review not found
- 400: Empty response text

#### `DELETE /api/reviews/[reviewId]/response` - Delete response
**Response:**
```json
{
  "success": true
}
```
**Errors:**
- 401: Not authenticated
- 403: Not business owner
- 404: Response not found

### Admin APIs

#### `DELETE /api/admin/reviews/[reviewId]` - Admin delete review
**Response:**
```json
{
  "success": true
}
```
**Errors:**
- 401: Not authenticated
- 403: Not community staff
- 404: Review not found

## UI Components

### Display Components (Read-only)

#### `<BusinessRating>` - Compact rating display
**Usage:** Directory cards, featured businesses
**Props:**
```typescript
{
  averageRating: number
  reviewCount: number
  size: "sm" | "md" | "lg"
}
```
**Renders:** ★★★★☆ 4.2 (24)

#### `<ReviewList>` - Review list on business profile
**Props:**
```typescript
{
  businessId: string
  currentUserId: string | null
}
```
**Features:**
- Fetches reviews via API
- Shows user avatar, name, rating, text, date
- Shows business owner response if exists
- Edit/delete buttons for own review
- "Respond" button for business owner
- Pagination (10 per page)
- Sort dropdown (Newest, Highest, Lowest)

#### `<ReviewCard>` - Individual review item
**Props:**
```typescript
{
  review: Review
  isOwner: boolean
  canRespond: boolean
  onEdit: () => void
  onDelete: () => void
  onRespond: () => void
}
```
**Features:**
- User info (avatar, name, date)
- Star rating display
- Review text (if provided)
- Owner response (if exists)
- Action buttons based on permissions

### Interactive Components

#### `<ReviewForm>` - Create/edit review modal
**Props:**
```typescript
{
  businessId: string
  businessName: string
  existingReview: Review | null
  onSuccess: () => void
  onCancel: () => void
}
```
**Features:**
- Star rating selector (1-5, required)
- Textarea for review text (optional, max 1000 chars)
- Character counter
- Submit/Cancel buttons
- Loading state
- Error handling

#### `<StarRating>` - Interactive star selector
**Props:**
```typescript
{
  value: number | null
  onChange: (rating: number) => void
  required: boolean
  readonly: boolean
}
```
**Features:**
- 5 clickable stars
- Hover preview
- Neo-brutalist style (bold, black borders)
- Accessible (keyboard navigation)

#### `<ResponseForm>` - Business owner response
**Props:**
```typescript
{
  reviewId: string
  existingResponse: string | null
  onSuccess: () => void
  onCancel: () => void
}
```
**Features:**
- Textarea (required, max 500 chars)
- Character counter
- Submit/Cancel buttons

#### `<WriteReviewButton>` - CTA button
**Props:**
```typescript
{
  businessId: string
  businessName: string
  userReview: Review | null
}
```
**Features:**
- "Escribir Reseña" or "Editar Reseña" text
- Neo-brutalist button style
- Opens ReviewForm modal
- Only shown to authenticated users
- Disabled if user owns the business

### Business Profile Page Layout

```
Business Profile Page Structure:
├─ Breadcrumbs
├─ BusinessHero (photos, name, category, verified badge)
├─ Action Buttons Row
│  ├─ ShareButton
│  ├─ ReportButton
│  └─ WriteReviewButton ← NEW
├─ BusinessRating Summary ← NEW
│  └─ ★★★★☆ 4.2 (24 reseñas)
├─ BusinessInfo (address, hours, etc.)
├─ LocationMap
├─ ReviewList ← NEW
│  ├─ Sort dropdown
│  ├─ ReviewCard (x10)
│  └─ Pagination
├─ Linked Events
├─ Linked Jobs
└─ WhatsAppButton
```

### Premium Business Badge

**Visual Treatment:**
- Badge text: "DESTACADO"
- Position: Top-right corner of business card
- Style: `rotate-[-2deg]`
- Colors: Secondary yellow (`oklch(0.85 0.17 85)`) background, black border (2px)
- Typography: Uppercase, tracking-widest, font-bold
- Shadow: Hard offset shadow `shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`

## Data Flows

### Flow 1: User Creates Review
1. User clicks "Escribir Reseña" button
2. ReviewForm modal opens
3. User selects star rating (1-5) [REQUIRED]
4. User types review text [OPTIONAL]
5. User clicks "Publicar Reseña"
6. POST /api/reviews
   - Validate: authenticated
   - Validate: rating 1-5
   - Validate: business approved
   - Validate: user hasn't reviewed before (UNIQUE constraint)
   - Validate: user doesn't own the business
   - Insert into business_reviews
7. Success response
8. Close modal, refresh ReviewList, update BusinessRating summary
9. Show success toast: "¡Reseña publicada!"

### Flow 2: User Edits Own Review
1. User sees "Editar" button on their review card
2. Clicks "Editar"
3. ReviewForm modal opens (pre-filled with existing data)
4. User changes rating and/or review text
5. User clicks "Actualizar Reseña"
6. PATCH /api/reviews/[reviewId]
   - Validate: authenticated
   - Validate: user is review owner (RLS)
   - Validate: rating 1-5 (if changed)
   - Update business_reviews (updated_at = NOW())
7. Success response
8. Close modal, update review in list, update rating summary if changed
9. Show success toast: "Reseña actualizada"

### Flow 3: User Deletes Own Review
1. User clicks "Eliminar" button on their review card
2. Confirmation dialog: "¿Seguro que quieres eliminar tu reseña?"
3. User confirms
4. DELETE /api/reviews/[reviewId]
   - Validate: authenticated
   - Validate: user is review owner (RLS)
   - Delete from business_reviews (CASCADE deletes response too)
5. Success response
6. Remove review from list, update rating summary
7. Show success toast: "Reseña eliminada"

### Flow 4: Business Owner Responds to Review
1. Business owner sees "Responder" button on review
2. Clicks "Responder"
3. ResponseForm appears (inline or modal)
4. Owner types response (max 500 chars)
5. Owner clicks "Publicar Respuesta"
6. POST /api/reviews/[reviewId]/response
   - Validate: authenticated
   - Validate: user owns the business (RLS)
   - Validate: response_text not empty
   - Insert/upsert into business_review_responses
7. Success response
8. Close form, update ReviewCard to show response
9. Show success toast: "Respuesta publicada"

### Flow 5: Anonymous Visitor Views Reviews
1. Visitor lands on business profile page
2. Server component fetches:
   - Business data
   - Average rating & count (aggregate query)
   - Initial reviews (first 10, newest first)
3. Page renders with BusinessRating summary and ReviewList
4. Visitor can read all reviews, sort, paginate
5. See "Iniciar sesión para dejar reseña" prompt

### Flow 6: Admin Moderates Review
1. User flags review as inappropriate
2. Flag appears in admin moderation panel
3. Admin reviews flagged content
4. Admin decides to delete review
5. DELETE /api/admin/reviews/[reviewId]
   - Validate: authenticated
   - Validate: is_community_staff (RLS)
   - Delete from business_reviews
6. Success response
7. Review removed from business profile
8. BusinessRating summary recalculated
9. Audit log entry created

## Error Handling & Edge Cases

### Error Scenarios

**Review Creation:**
- 409 Conflict → "Ya dejaste una reseña para este negocio. Puedes editarla."
- 403 Forbidden (own business) → "No puedes dejar reseñas en tu propio negocio."
- 404 Not Found → "Este negocio ya no está disponible."
- 401 Unauthorized → "Inicia sesión para dejar una reseña."
- 400 Bad Request (invalid rating) → "Selecciona una calificación de 1 a 5 estrellas."
- 500 Server Error → "Error al publicar reseña. Intenta de nuevo."

**Review Update:**
- 404 Not Found → "Esta reseña ya no existe."
- 403 Forbidden → "No tienes permiso para editar esta reseña."
- 409 Conflict → "Esta reseña fue modificada recientemente. Recarga la página."

**Business Response:**
- 403 Forbidden → "Solo el dueño del negocio puede responder."
- 404 Not Found → "La reseña ya no existe."
- 400 Bad Request → "La respuesta debe tener al menos 10 caracteres."

### Edge Cases

**Business Ownership Transfer:**
- New owner can create new responses
- Old owner loses response access
- RLS policies check current `owner_id` on businesses table

**User Account Deletion:**
- Reviews are deleted via CASCADE
- If profile missing, display "Usuario eliminado"
- Implementation: LEFT JOIN profiles, handle null gracefully

**Business Deletion:**
- All reviews auto-delete via CASCADE
- ON DELETE CASCADE in foreign key

**Zero Reviews:**
- Display: "Sé el primero en dejar una reseña" CTA
- Rating: Hide star rating, show "Sin reseñas aún"

**Review Text Edge Cases:**
- Empty review text: Allowed (rating-only review)
- Very long text: Max 1000 characters (enforced in form)
- Special characters: Allowed, sanitized for XSS
- URLs in reviews: Allowed but not clickable (plaintext)

**Rating Aggregation:**
- 1 review: Show "4.0 (1)" not "4.0 (1 reviews)"
- Exact .0 ratings: Show "5.0" not "5"
- New business: "Sin reseñas" instead of "0.0 (0)"

### User Experience Safeguards

**Prevent Accidental Deletion:**
- Show confirmation dialog: "¿Estás seguro?"
- No undo needed (user can recreate)

**Prevent Data Loss:**
- Save draft to localStorage on input change
- Restore draft if modal reopens
- Clear draft on successful submit

**Prevent Duplicate Submissions:**
- Disable submit button during API call
- Show loading spinner
- Prevent double-click with debouncing

**Handle Slow Connections:**
- Show skeleton loaders while fetching reviews
- Timeout after 10s, show retry button
- Cache reviews in client (SWR/React Query)

## Testing Strategy

### Database Tests
- ✓ UNIQUE constraint (one review per user per business)
- ✓ Rating CHECK constraint (1-5)
- ✓ CASCADE delete (business → reviews)
- ✓ RLS policies (approved businesses only, owner permissions)

### API Tests
- ✓ Authenticated user can create review
- ✓ Cannot review same business twice (409)
- ✓ Cannot review own business (403)
- ✓ Cannot review unapproved business (403)
- ✓ Rating must be 1-5 (400)
- ✓ Review text is optional
- ✓ Owner can update/delete own review
- ✓ Non-owner cannot update/delete (403)
- ✓ Business owner can respond
- ✓ Non-owner cannot respond (403)

### Component Tests
- ✓ StarRating renders 5 stars, clicking updates value
- ✓ ReviewForm validates required rating, optional text
- ✓ ReviewCard displays user info, rating, text, response
- ✓ BusinessRating shows average + count, handles zero state

### Integration Tests
- ✓ Full review flow (create → appears, edit → updates, delete → removes)
- ✓ Business owner response flow
- ✓ Admin moderation flow
- ✓ Edge cases (user deleted, business deleted, ownership transfer)

### Manual Testing Checklist
- □ Neo-brutalist styling consistent
- □ Forms accessible (keyboard, screen readers)
- □ Loading states visible
- □ Error messages clear
- □ Mobile responsive
- □ Cannot submit without rating
- □ Character counters work
- □ Confirmation dialogs prevent accidents

### Performance Testing
- Business with 100+ reviews loads in <2s
- Directory with 50 businesses loads in <3s
- Creating/updating review completes in <500ms

## Neo-Brutalist Styling Guidelines

**Stars:**
- Bold, black outlined stars (★)
- Filled stars: Primary red (`oklch(0.57 0.23 18)`)
- Empty stars: White fill, black outline

**Review Cards:**
- 2px black border
- 4px hard shadow `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Hover: Lift effect (translate-x-[-1px] translate-y-[-1px])

**Buttons:**
- `.brutalist-button` class
- Uppercase text, tracking-widest
- 2px black border, hard offset shadow

**Forms:**
- `.brutalist-input` for textareas
- Thick 2px borders, hard shadow on focus

**Rating Display:**
- Large, bold numbers
- High contrast
- Uppercase labels

## Implementation Notes

### TypeScript Types

Add to `lib/types/database.ts`:
```typescript
export type Review = Database['public']['Tables']['business_reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['business_reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['business_reviews']['Update']

export type ReviewResponse = Database['public']['Tables']['business_review_responses']['Row']

export type ReviewWithRelations = Review & {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  response: ReviewResponse | null
}
```

### Migration File Naming

- Migration: `supabase/migrations/YYYYMMDDHHMMSS_create_reviews_tables.sql`
- Include both table creation and RLS policies in single migration

### Deployment Considerations

1. Run database migration on production
2. Deploy API routes
3. Deploy UI components
4. Update TypeScript types from Supabase CLI
5. Test on staging environment first
6. Monitor error logs for RLS issues

## Future Enhancements (Out of Scope)

- Photo uploads with reviews
- "Helpful" votes on reviews
- Review sorting by helpfulness
- Business owner analytics (review trends over time)
- Email notifications for new reviews
- Review templates/quick responses
- Cached aggregates for scale (when >1000 businesses)
- Anti-spam ML filtering

## Success Metrics

**Phase 2 Goals:**
- 30% of businesses have at least 1 review within 60 days
- 50% of users leave at least 1 review within 90 days
- Average rating distribution: 70% 4-5 stars, 20% 3 stars, 10% 1-2 stars
- <5% review deletion rate
- <1% flagged reviews
- Business owner response rate: >40%

## Conclusion

This design provides a complete, production-ready reviews and ratings system aligned with BarrioRed's community-first values. The architecture is simple, secure, and scalable for the pilot phase, with clear paths for optimization as the platform grows.

**Next Steps:**
1. Create implementation plan (writing-plans skill)
2. Set up database migrations
3. Build API routes
4. Implement UI components
5. Write tests
6. Deploy to staging
7. User acceptance testing
8. Production deployment
