# Admin Panel Testing Checklist

## Pre-Testing Setup

- [ ] Database has migration applied (suspension, rejection tracking, sort_order)
- [ ] Test users created: super_admin, admin, moderator, regular user
- [ ] Test data: 10+ businesses in various states (pending, approved, rejected)
- [ ] Test data: 5+ users with different roles
- [ ] Test data: 5+ categories with different sort orders

## Phase 1: Business Management

### Filtering & Search
- [ ] Filter by category shows correct businesses
- [ ] Search by name/description works
- [ ] Combine category filter + search works
- [ ] Clear filters resets to all businesses

### Business Approval/Rejection
- [ ] Approve business updates status to 'approved'
- [ ] Rejection dialog shows predefined reasons
- [ ] Rejection with custom note saves correctly
- [ ] Rejected business shows reason in admin list
- [ ] Cannot approve already approved business

### Business CRUD
- [ ] Edit business page loads with current data
- [ ] Update business name/description persists
- [ ] Update business hours persists
- [ ] Update business location (map) persists
- [ ] Upload new business photos works
- [ ] Delete business with confirmation works
- [ ] Delete removes business from database
- [ ] Cannot delete business owned by another community (if super_admin)

### Authorization
- [ ] Regular user cannot access /admin routes
- [ ] Moderator can approve/reject businesses
- [ ] Moderator cannot delete businesses
- [ ] Admin can delete businesses
- [ ] Super admin can access all communities
- [ ] Non-super-admin can only see their community businesses

## Phase 2: User Management

### User List
- [ ] All users display with correct roles
- [ ] Filter by role (admin/moderator/user) works
- [ ] Search by name/email works
- [ ] Pagination works for 50+ users

### Role Assignment
- [ ] Assign admin role to user works
- [ ] Assign moderator role to user works
- [ ] Demote admin to user works
- [ ] Permission preview shows correct permissions
- [ ] Cannot change own role
- [ ] Moderator cannot assign roles (only admin/super_admin)

### User Suspension
- [ ] Suspend user with reason works
- [ ] Suspended user cannot login
- [ ] Suspended user redirected to /suspended page
- [ ] Unsuspend user restores access
- [ ] Suspension reason displays in user detail
- [ ] Cannot suspend own account

### User Deletion
- [ ] Delete user with confirmation works
- [ ] Cascade warning shows related data (businesses, etc.)
- [ ] Deleted user removed from database
- [ ] Cannot delete own account
- [ ] Cannot delete super_admin accounts (unless you are super_admin)

### User Detail Page
- [ ] Profile tab shows user info
- [ ] Businesses tab shows user's businesses
- [ ] Activity tab shows recent actions
- [ ] Edit profile button works (for user's own profile)

## Phase 3: Analytics & Reporting

### Statistics Dashboard
- [ ] Business metrics display correctly
- [ ] User metrics display correctly
- [ ] Community metrics display correctly
- [ ] Moderation metrics display correctly
- [ ] Toggle 7d/30d period updates charts
- [ ] Stats refresh on navigation back

### CSV Export
- [ ] Export all businesses generates CSV
- [ ] CSV has correct headers
- [ ] CSV data matches database
- [ ] CSV opens correctly in Excel (UTF-8 BOM)
- [ ] Special characters (tildes, ñ) display correctly
- [ ] Commas in descriptions are escaped

## Phase 4: UX Enhancements

### Category Drag-and-Drop
- [ ] Drag category updates sort order
- [ ] Visual feedback during drag (opacity, shadow, rotation)
- [ ] Drop persists new order to database
- [ ] Keyboard navigation works (arrow keys + space)
- [ ] Focus ring visible for accessibility
- [ ] Optimistic update reverts on API error

### Admin Navigation
- [ ] Sidebar shows all admin sections
- [ ] Active route highlighted
- [ ] Mobile: sidebar hidden, menu button works
- [ ] All nav links lead to correct pages

## Cross-Cutting Concerns

### Security
- [ ] All API routes check permissions
- [ ] RLS policies enforce community scoping
- [ ] Suspended users blocked at middleware
- [ ] CSRF protection enabled
- [ ] SQL injection prevented (parameterized queries)

### Performance
- [ ] Business list pagination (20 per page)
- [ ] User list pagination (50 per page)
- [ ] Image upload max 5MB enforced
- [ ] Debounced search input (300ms)
- [ ] Optimistic UI updates feel instant

### Accessibility
- [ ] All buttons have accessible labels
- [ ] Form inputs have proper labels
- [ ] Focus states visible
- [ ] Keyboard navigation works throughout
- [ ] Screen reader friendly

### Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network errors have retry mechanism
- [ ] Form validation errors display inline
- [ ] Toast notifications for success/error
- [ ] Loading states prevent double-clicks

## Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Regression Testing

- [ ] Existing directory pages still work
- [ ] Business profiles still display
- [ ] User registration still works
- [ ] Merchant dashboard still works
- [ ] Community pages still work
