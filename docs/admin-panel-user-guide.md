# Admin Panel User Guide

## Overview

The BarrioRed Admin Panel provides comprehensive tools for managing businesses, users, categories, and community content.

## Access Levels

### Super Admin
- Full access to all communities
- Manage all users and roles
- Access all features

### Admin (Community-scoped)
- Manage businesses in their community
- Manage users in their community
- View statistics for their community
- Manage categories

### Moderator (Community-scoped)
- Approve/reject business applications
- View businesses and users (read-only)
- Cannot delete or assign roles

## Features

### Business Management

**Filtering & Search**
1. Navigate to Admin > Negocios
2. Use category dropdown to filter by type
3. Use search box to find by name/description
4. Results update automatically

**Approve Business**
1. Find pending business
2. Click "Aprobar" button
3. Business status changes to approved
4. Business appears in public directory

**Reject Business**
1. Find pending business
2. Click "Rechazar" button
3. Select predefined reason or enter custom note
4. Click "Confirmar Rechazo"
5. Business owner can see rejection reason

**Edit Business**
1. Click business name or "Editar" button
2. Update any field (name, description, hours, photos, location)
3. Click "Guardar Cambios"
4. Changes reflect immediately

**Delete Business**
1. Click "Eliminar" button
2. Confirm deletion in dialog
3. Business permanently removed (cannot be undone)

### User Management

**View Users**
- Navigate to Admin > Usuarios
- See all users with roles and status
- Filter by role (admin/moderator/user)
- Search by name or email

**Assign Roles**
1. Click user's current role badge
2. Select new role from dropdown
3. Review permission preview
4. Click "Asignar Rol"
5. Changes take effect immediately

**Suspend User**
1. Find user in list
2. Click "Suspender" button
3. Enter suspension reason
4. Click "Suspender Usuario"
5. User cannot login until unsuspended

**Unsuspend User**
1. Find suspended user
2. Click "Activar" button
3. User can login again immediately

**Delete User**
1. Click "Eliminar" button on user row
2. Review cascade warning (related businesses, etc.)
3. Confirm deletion
4. User permanently removed

### Category Management

**Reorder Categories**
1. Navigate to Admin > Categorías
2. Click and drag grip icon (⋮⋮) to reorder
3. Release to save new order
4. Order persists automatically
5. Directory reflects new category order

**Add Category** (Coming soon)
- Click "Nueva Categoría"
- Enter name and icon
- Select sort order
- Save

### Statistics & Reporting

**View Statistics**
1. Navigate to Admin > Estadísticas
2. Toggle between 7d/30d periods
3. View metrics:
   - Total businesses (by status)
   - Total users (by role)
   - Community engagement
   - Moderation activity

**Export Data**
1. Navigate to Admin > Negocios
2. Apply filters if needed
3. Click "Exportar CSV" button
4. Download opens in Excel
5. File includes all visible businesses

## Best Practices

### Business Approval
- Review business name, description, photos before approving
- Check location pin is accurate
- Verify WhatsApp number format
- Use rejection reasons to guide business owners

### User Role Assignment
- Assign moderator role to trusted community members
- Reserve admin role for primary community managers
- Document role changes in notes

### Category Management
- Keep most popular categories at top
- Group similar categories together
- Test order on mobile view

### Data Export
- Export regularly for backup
- Filter before export for specific reports
- Use 7d period for weekly reviews, 30d for monthly

## Troubleshooting

**Cannot access admin panel**
- Check if user has admin/moderator role
- Check if account is suspended
- Try logging out and back in

**Changes not saving**
- Check internet connection
- Look for error toast notification
- Refresh page and try again
- Contact super admin if persists

**Drag-and-drop not working**
- Try keyboard navigation (Tab + Arrow keys + Space)
- Clear browser cache
- Try different browser
- Report bug if persists

## Support

For technical issues or feature requests, contact the BarrioRed development team.
