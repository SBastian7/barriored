# Reviews & Ratings - Manual Testing Checklist

## Anonymous Visitor
- [ ] View business reviews on profile page
- [ ] See average rating on business cards in directory
- [ ] See premium "DESTACADO" badge on featured businesses
- [ ] Cannot submit review (no button shown)

## Registered User
- [ ] See "Escribir Reseña" button on business profile
- [ ] Can submit review with star rating (required)
- [ ] Can optionally add review text (max 1000 chars)
- [ ] See "Editar Reseña" button if already reviewed
- [ ] Can edit own review (rating and/or text)
- [ ] Can delete own review with confirmation
- [ ] Cannot review own business (button hidden)
- [ ] Cannot submit duplicate review (409 error)

## Business Owner
- [ ] See "Responder" button on reviews for own business
- [ ] Can post response (min 10 chars, max 500 chars)
- [ ] Can edit response
- [ ] Can delete response
- [ ] Response appears under review in highlighted box

## Admin/Moderator
- [ ] Can delete any review via admin API
- [ ] Audit log entry created on deletion

## Visual/UX
- [ ] Neo-brutalist styling consistent (black borders, hard shadows)
- [ ] Stars render correctly (filled red, empty white outline)
- [ ] Forms are keyboard accessible
- [ ] Character counters update in real-time
- [ ] Loading states show during API calls
- [ ] Error messages are clear and actionable
- [ ] Mobile responsive (especially on business profile)
- [ ] Confirmation dialog prevents accidental deletion

## Performance
- [ ] Business profile page loads in <2s
- [ ] Directory with 50 businesses loads in <3s
- [ ] Creating review completes in <500ms
- [ ] Average rating calculates correctly

## Edge Cases
- [ ] Handle user account deletion (show "Usuario eliminado")
- [ ] Handle business deletion (reviews cascade delete)
- [ ] Handle zero reviews (show empty state)
- [ ] Rating-only review (no text) saves correctly
- [ ] Long review text (1000 chars) displays properly
