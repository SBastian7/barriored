# Marketplace Admin Guide

## Overview

The marketplace admin panel allows community admins to moderate classified listings posted by users in BarrioRed's multi-tenant platform.

## Access

Navigate to `/admin/marketplace` (admin or super admin role required).

## Features

### Stats Dashboard
- **Active**: Current active listings in the community
- **Sold (7 days)**: Listings marked as sold in the last week
- **Flagged**: Listings marked as inappropriate
- **Banned Users**: Users currently banned from posting in marketplace

### Filters
- **Category**: Vendo, Compro, Arriendo, Servicios, Trabajo
- **Status**: Active, Sold, Archived, Flagged, Removed
- **Clear Filters**: Reset all filters to "all"

### Classified Cards (List View)
Each classified card shows:
- Thumbnail image
- Category badge
- Status badge (color-coded)
- User name and post date
- Title and price
- Description preview (2 lines)
- Quick actions: Ver Detalle, Marcar Vendido, Archivar, Eliminar

**Flagged classifieds** appear with a red border for visibility.

### Actions on List Page

**Mark as Sold** (active classifieds only)
- Changes status to 'sold'
- Sets `sold_at` timestamp
- Updates stats in real-time

**Archive** (active classifieds only)
- Changes status to 'archived'
- Sets `archived_at` timestamp
- Removes from active listings

**Delete** (any status)
- Soft delete: sets status to 'removed'
- Requires confirmation
- Logged to audit trail

### Classified Detail Page

Access by clicking "Ver Detalle" on any classified card.

**View Mode:**
- Full image gallery (all uploaded images)
- Complete title, description, price
- Category and status badges
- User information (name, link to profile)
- Post date and last activity
- WhatsApp contact
- Community information
- Flagged reason (if applicable)

**Edit Mode:**
- Click "Editar" to enable inline editing
- Editable fields: title, description, price, WhatsApp
- Save/Cancel buttons
- Changes logged to audit trail

**Status Change:**
- Dropdown with options: Activo, Vendido, Archivado, Eliminado
- Immediate update on selection
- Auto-sets timestamps (sold_at, archived_at)

**Admin Actions:**

1. **Flag as Inappropriate**
   - Opens prompt for reason
   - Changes status to 'flagged'
   - Creates entry in content_reports table
   - Logs action to audit trail
   - Button changes to "Remover Marca" when flagged

2. **Remove Flag** (flagged classifieds only)
   - Reverts status to 'active'
   - Clears flag fields
   - Logs action to audit trail

3. **Ban User**
   - Opens prompt for reason
   - Asks: Permanent or temporary (30 days)?
   - Creates ban record in marketplace_user_bans
   - **Automatically removes ALL user's active classifieds**
   - Shows count: "Usuario suspendido. X clasificados eliminados."
   - Prevents user from creating new listings
   - Logs all actions to audit trail
   - Redirects to marketplace list

4. **Delete Classified**
   - Requires confirmation dialog
   - Soft delete (status = 'removed')
   - Logs to audit trail
   - Redirects to marketplace list

### Metadata Sidebar

Displays on detail page:
- Community name
- WhatsApp contact
- Last activity date
- Sold date (if applicable)
- Archived date (if applicable)

## Database Tables

### marketplace_categories
5 predefined categories:
- Vendo (ShoppingCart icon)
- Compro (ShoppingBag icon)
- Arriendo (Home icon)
- Servicios (Wrench icon)
- Trabajo (Briefcase icon)

### classifieds
Main table for marketplace listings with fields:
- Basic: title, description, price, images[], whatsapp
- Status: active | sold | archived | flagged | removed
- Timestamps: created_at, updated_at, sold_at, archived_at, flagged_at, last_activity_at
- Featured: is_featured, featured_until (for future monetization)
- Flagging: flagged_by, flagged_reason
- Relations: community_id, user_id, category_id

### marketplace_user_bans
Tracks banned users:
- community_id: Scoped to community
- user_id: The banned user
- banned_by: Admin who issued the ban
- reason: Text explanation
- banned_at: Timestamp
- expires_at: NULL = permanent, otherwise date when ban expires
- is_active: Boolean flag

### content_reports
Extended to support 'classified' entity type:
- reported_entity_type: 'business' | 'post' | 'classified'
- Used when flagging classifieds
- Links to admin reports panel

## Row Level Security (RLS)

**Users:**
- View only active/sold classifieds in their community
- Create classifieds if not banned
- Update/delete only their own classifieds

**Moderators:**
- View all classifieds in their community (any status)
- **Cannot** edit, delete, or ban users

**Admins:**
- View all classifieds in their community
- Edit/delete any classified in their community
- Flag classifieds
- Ban users from marketplace

**Super Admins:**
- Full access to all classifieds across all communities
- Can manage cross-community

## Audit Trail

All admin actions are logged to `audit_logs` table:
- Action types: update_classified, delete_classified, flag_classified, unflag_classified, ban_marketplace_user, remove_classified_on_ban
- Includes: who, what, when, metadata (reason, count of affected items)
- Viewable in `/admin/logs`

## Best Practices

1. **Flag before delete**: Flag classifieds first to track patterns and repeat offenders
2. **Document reasons**: Always provide clear reasons when flagging or banning
3. **Check reports**: Review user reports in `/admin/reports` for classified reports
4. **Monitor stats**: Keep flagged count low by addressing reports quickly
5. **Temporary bans first**: Try 30-day bans before permanent for first offenses
6. **Community isolation**: Remember admins can only moderate their own community

## Common Workflows

### Handling User Report
1. User reports inappropriate classified via frontend (future feature)
2. Report appears in `/admin/reports`
3. Admin clicks through to classified detail
4. Admin reviews content
5. Decision:
   - **Minor issue**: Edit classified to fix
   - **Inappropriate content**: Flag with reason
   - **Serious violation**: Ban user (removes all their classifieds)
   - **False report**: Dismiss and unflag if needed

### Managing Sold Items
- Users mark their own as sold (future feature)
- Admins can manually mark as sold if user requests help
- Sold items remain visible for reference
- Consider archiving old sold items periodically

### Handling Expired Listings
- Auto-archive after 60 days inactive (future feature)
- Manual archive option available
- Users can reactivate archived listings (future feature)

## API Endpoints (for reference)

**List classifieds:**
```
GET /api/admin/marketplace?category=vendo&status=active&limit=20&offset=0
```

**Get single classified:**
```
GET /api/admin/marketplace/[id]
```

**Update classified:**
```
PATCH /api/admin/marketplace/[id]
Body: { title, description, price, whatsapp, status }
```

**Delete classified:**
```
DELETE /api/admin/marketplace/[id]
```

**Flag classified:**
```
POST /api/admin/marketplace/[id]/flag
Body: { reason }
```

**Unflag classified:**
```
DELETE /api/admin/marketplace/[id]/flag
```

**Ban user:**
```
POST /api/admin/marketplace/[id]/ban-user
Body: { reason, expires_at }
```

## Future Enhancements

**Planned for user-facing marketplace:**
- Public browse page: `/{community}/marketplace`
- User create listing form
- User edit/delete own listings
- Auto-archive after 60 days
- Reactivate archived listings

**Planned for monetization:**
- Featured listings (paid promotion)
- Premium placement in search results
- Analytics for listing performance

## Troubleshooting

**"No autenticado" error:**
- User is not logged in
- Session expired, refresh page

**"No tienes permisos" error:**
- User is not admin or super admin
- Community admins can only access their own community

**Ban not preventing new listings:**
- Check `is_active = true` and `expires_at > NOW()` in marketplace_user_bans
- Verify RLS policy on classifieds INSERT

**Classifieds not showing:**
- Check RLS policies are enabled
- Verify status filter (show only active/sold to regular users)
- Community isolation: admin can only see their community

## Support

For issues or questions:
- Check `/admin/logs` for audit trail
- Review Supabase logs for errors
- Consult CLAUDE.md for architecture details
