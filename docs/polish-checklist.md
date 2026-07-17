# UI/UX Polish Checklist

## Overview
Systematic review checklist for ensuring all monetization features meet BarrioRed's neo-brutalist tropical design standards and provide excellent user experience.

---

## Brand Consistency Checklist

### ✅ Neo-Brutalist Tropical Design

#### Borders
- [ ] All cards have 2-4px black borders
- [ ] Border color is pure black `oklch(0 0 0)`
- [ ] No rounded corners (border-radius = 0)
- [ ] Consistent border width across components

#### Shadows
- [ ] Hard offset shadows (no blur)
- [ ] Default: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- [ ] Hover: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- [ ] No soft/blurred shadows

#### Typography
- [ ] Headings use Outfit font (font-heading, font-black, italic)
- [ ] Body text uses Inter font
- [ ] Labels are UPPERCASE with tracking-widest
- [ ] Consistent font weights (regular, bold, black)

#### Colors
- [ ] Primary Red: `oklch(0.57 0.23 18)` for CTAs
- [ ] Secondary Yellow: `oklch(0.85 0.17 85)` for badges/accents
- [ ] Accent Blue: `oklch(0.5 0.2 260)` for info
- [ ] No off-brand colors introduced

#### Utility Classes
- [ ] `.brutalist-card` used for all card components
- [ ] `.brutalist-button` used for all buttons
- [ ] `.brutalist-input` used for all form inputs
- [ ] Consistent application across new features

---

## Component-by-Component Review

### Merchant Dashboard Widgets

#### BusinessAnalytics Widget
- [ ] ✅ Title with BarChart3 icon
- [ ] ✅ Brutalist card styling
- [ ] ✅ Chart uses Recharts with proper colors
- [ ] ✅ Loading state (Loader2 spinner)
- [ ] ❓ Empty state if no data (verify)
- [ ] ✅ Stats displayed clearly (total views, total clicks)
- [ ] ❓ Mobile responsive (verify on small screen)

#### PremiumStatusWidget
- [ ] ✅ Crown icon with secondary color
- [ ] ✅ Different states (Not Subscribed, Pending, Active, Cancelled)
- [ ] ✅ Brutalist card styling with appropriate border colors
- [ ] ✅ Loading states on button clicks
- [ ] ✅ Success toasts on actions
- [ ] ✅ Confirmation modal for cancellation
- [ ] ❓ Mobile layout (verify buttons don't overflow)

#### BannerAdsManager
- [ ] ✅ Upload form with brutalist inputs
- [ ] ✅ Image preview with border
- [ ] ✅ Banner list with thumbnails
- [ ] ✅ Status badges color-coded
- [ ] ✅ Loading state during upload
- [ ] ❓ Error state for upload failures (verify)
- [ ] ❓ Mobile: Image upload responsive (verify)

### Admin Pages

#### Subscriptions Management
- [ ] ✅ Stats strip with brutalist cards
- [ ] ✅ Filters (status, search) with brutalist inputs
- [ ] ✅ Subscription cards with clear status badges
- [ ] ✅ Detail page with full context
- [ ] ✅ Inline forms (activation, payment recording)
- [ ] ❓ Empty state when no subscriptions (verify)
- [ ] ❓ Mobile: Table/cards responsive (verify)

#### Banners Management
- [ ] ✅ Image thumbnails with brutalist borders
- [ ] ✅ Full preview on detail page
- [ ] ✅ Status badges consistent
- [ ] ✅ Approve/reject forms inline
- [ ] ✅ Pause/resume buttons clearly labeled
- [ ] ❓ Image aspect ratio preserved (verify)
- [ ] ❓ Mobile: Image preview responsive (verify)

#### Review Flags Management
- [ ] ✅ Flag icon prominently displayed
- [ ] ✅ Review preview in cards
- [ ] ✅ Status badges (pending, dismissed, removed)
- [ ] ✅ Full review context on detail page
- [ ] ✅ Resolution cards side-by-side
- [ ] ❓ Empty state when no flags (verify)
- [ ] ❓ Mobile: Cards stack vertically (verify)

#### Payments Dashboard
- [ ] ✅ Revenue stats prominently displayed
- [ ] ✅ Combined subscriptions + banners view
- [ ] ✅ CSV export button
- [ ] ✅ Filters work correctly
- [ ] ❓ Large numbers formatted (e.g., 1,000,000) (verify)
- [ ] ❓ Mobile: Stats cards stack (verify)

### Public-Facing Features

#### Premium Badges
- [ ] ✅ Crown icon + "Premium" text
- [ ] ✅ Secondary color (yellow) background
- [ ] ✅ Rotated (-2deg) for playful effect
- [ ] ✅ Black border + hard shadow
- [ ] ✅ Displays in directory listings
- [ ] ✅ Displays on business profile
- [ ] ❓ Responsive sizing on mobile (verify)

#### Banner Rotator
- [ ] ✅ Full-width display
- [ ] ✅ Brutalist border (4px black)
- [ ] ✅ Hard shadow on container
- [ ] ✅ Hover effect (shadow lift)
- [ ] ✅ Link opens in new tab (if set)
- [ ] ❓ Responsive image sizing (verify)
- [ ] ❓ Loading state while fetching (verify)

#### Flag Review Button
- [ ] ✅ Appears only for business owners
- [ ] ✅ Modal with brutalist styling
- [ ] ✅ Reason dropdown with all options
- [ ] ✅ Character counter for description
- [ ] ✅ Loading state "Enviando..."
- [ ] ✅ Success message with auto-close
- [ ] ❓ Mobile: Modal full-screen on small devices (verify)

---

## State Management Checklist

### Loading States
- [ ] ✅ All async operations show loading indicators
- [ ] ✅ Buttons disabled during submission
- [ ] ✅ Button text changes (e.g., "Guardando...")
- [ ] ❓ Global loading bar for page transitions (optional)
- [ ] ❓ Skeleton loaders instead of spinners (recommended)

### Error States
- [ ] ✅ Error toasts for failed operations
- [ ] ✅ Helpful error messages (not technical jargon)
- [ ] ❓ Form validation errors inline (verify all forms)
- [ ] ❓ Network error handling (offline state) (optional)
- [ ] ❓ Retry mechanisms for failed requests (optional)

### Success States
- [ ] ✅ Success toasts after mutations
- [ ] ✅ Visual feedback (status badge updates)
- [ ] ✅ Data refresh after actions
- [ ] ❓ Celebratory animations for premium activation (optional)
- [ ] ❓ Confetti or visual rewards (optional, fun)

### Empty States
- [ ] ❓ No subscriptions: Helpful message + CTA (verify)
- [ ] ❓ No banners: Upload CTA prominent (verify)
- [ ] ❓ No flags: "All clear" message (verify)
- [ ] ❓ No analytics data: "Start promoting" message (verify)
- [ ] ❓ Empty states use illustrations or icons (recommended)

---

## Accessibility Checklist

### Keyboard Navigation
- [ ] ❓ All interactive elements focusable (verify)
- [ ] ❓ Focus indicators visible (blue outline or custom) (verify)
- [ ] ❓ Modal traps focus (can't tab outside) (verify)
- [ ] ❓ Escape key closes modals (verify)
- [ ] ❓ Enter key submits forms (verify)

### Screen Readers
- [ ] ✅ Button titles/aria-labels present
- [ ] ❓ Form labels properly associated (verify)
- [ ] ❓ Status messages announced (aria-live) (optional)
- [ ] ❓ Image alt text descriptive (verify banners)
- [ ] ❓ Semantic HTML (h1-h6, section, nav, etc.) (verify)

### Color Contrast
- [ ] ✅ Text meets WCAG AA standards (4.5:1)
- [ ] ✅ Primary red on white readable
- [ ] ✅ Secondary yellow on white readable
- [ ] ❓ Status badges contrast checked (verify)
- [ ] ❓ Disabled states clearly distinguishable (verify)

---

## Mobile Responsiveness Checklist

### Breakpoints
- [ ] ❓ Mobile (< 640px): Single column layouts (verify)
- [ ] ❓ Tablet (640px-1024px): Adapted layouts (verify)
- [ ] ❓ Desktop (> 1024px): Full layout (verify)

### Touch Targets
- [ ] ❓ All buttons min 44x44px (verify)
- [ ] ❓ Spacing between interactive elements (verify)
- [ ] ❓ No hover-only interactions (mobile friendly) (verify)

### Components
- [ ] ❓ Premium badge scales appropriately (verify)
- [ ] ❓ Banner rotator full-width on mobile (verify)
- [ ] ❓ Admin tables: Horizontal scroll or cards (verify)
- [ ] ❓ Forms: Full-width inputs on mobile (verify)
- [ ] ❓ Modals: Full-screen on small devices (verify)

---

## Spanish Language Checklist

### Text Quality
- [ ] ✅ All UI text in Spanish (Colombia)
- [ ] ✅ Informal "tú" used consistently
- [ ] ✅ Warm, approachable tone
- [ ] ❓ No Spanglish or mixed language (verify)
- [ ] ❓ Technical terms translated or explained (verify)

### Common Phrases
- [ ] ✅ "Solicitar Premium" (not "Request Premium")
- [ ] ✅ "Reportar" (not "Flag")
- [ ] ✅ "Desestimar" (not "Dismiss")
- [ ] ✅ Currency: "50.000 COP" (with period separator)
- [ ] ❓ Dates: Spanish format (verify: "20 de marzo de 2026")

---

## Performance Polish

### Perceived Performance
- [ ] ❓ Optimistic UI updates (instant feedback) (optional)
- [ ] ❓ Skeleton loaders > spinners (recommended)
- [ ] ❓ Lazy load images below fold (verify)
- [ ] ❓ Defer non-critical JS (verify bundle size)

### Visual Performance
- [ ] ❓ No layout shifts (CLS score < 0.1) (verify)
- [ ] ❓ Images have width/height to prevent shifts (verify)
- [ ] ❓ Fonts loaded with font-display: swap (verify)
- [ ] ❓ Animations use transform (GPU-accelerated) (verify)

---

## Final Polish Tasks

### Micro-interactions
- [ ] ❓ Button hover: Shadow lift (verify consistency)
- [ ] ❓ Card hover: Subtle transform (verify)
- [ ] ❓ Form focus: Border color change (verify)
- [ ] ❓ Success: Checkmark animation (optional)
- [ ] ❓ Loading: Smooth spinner rotation (verify)

### Copy Improvements
- [ ] ❓ Button labels action-oriented ("Activar" not "OK")
- [ ] ❓ Error messages helpful, not blaming
- [ ] ❓ Success messages encouraging
- [ ] ❓ Tooltips for complex actions (optional)
- [ ] ❓ Placeholders guide user input

### Visual Hierarchy
- [ ] ✅ Page titles largest, bold, italic
- [ ] ✅ Section headings distinct (uppercase, tracking)
- [ ] ✅ Primary actions prominent (primary color)
- [ ] ✅ Secondary actions subtle (outline buttons)
- [ ] ❓ Whitespace balanced (not too cramped) (verify)

---

## Testing Checklist

### Browser Testing
- [ ] ❓ Chrome (latest)
- [ ] ❓ Firefox (latest)
- [ ] ❓ Safari (latest)
- [ ] ❓ Edge (latest)
- [ ] ❓ Mobile Safari (iOS)
- [ ] ❓ Chrome Mobile (Android)

### Device Testing
- [ ] ❓ iPhone SE (small screen)
- [ ] ❓ iPhone 14 Pro (standard)
- [ ] ❓ iPad (tablet)
- [ ] ❓ Android phone (medium)
- [ ] ❓ Desktop 1920x1080
- [ ] ❓ Desktop 2560x1440

### User Flow Testing
- [ ] ❓ Complete subscription request → activation → payment → cancellation
- [ ] ❓ Complete banner upload → approval → display → pause → expire
- [ ] ❓ Complete flag review → dismiss OR remove
- [ ] ❓ View analytics data over time
- [ ] ❓ All admin actions work smoothly

---

## Priority Actions

### Critical (Fix Before Launch)
1. ❗ Verify all empty states exist and are helpful
2. ❗ Test mobile responsiveness on real devices
3. ❗ Check all forms have validation and error states
4. ❗ Ensure all async operations have loading states
5. ❗ Verify Spanish text quality throughout

### Important (Fix Soon After Launch)
1. Add skeleton loaders for better perceived performance
2. Improve empty state illustrations/icons
3. Add tooltips for complex admin actions
4. Optimize images (compression, lazy loading)
5. Add keyboard shortcuts for power users

### Nice-to-Have (Future Polish)
1. Celebratory animations for premium activation
2. Confetti on first banner approval
3. Advanced filtering with saved searches
4. Bulk actions for admin (approve multiple, etc.)
5. Dark mode support

---

## Review Schedule

### Weekly Review
- [ ] Check new features for brand consistency
- [ ] Verify loading states on all new forms
- [ ] Test on mobile device weekly

### Monthly Review
- [ ] Accessibility audit
- [ ] Performance audit (Lighthouse)
- [ ] User feedback review
- [ ] Update this checklist

---

**Status Legend:**
- ✅ Verified and complete
- ❓ Needs verification
- ❗ Critical issue
- ⚠️ Known issue, acceptable for now

**Last Updated:** March 20, 2026
**Last Reviewed:** March 20, 2026
**Next Review:** April 20, 2026
