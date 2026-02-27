import { Database } from '@/lib/types/database'

export type UserRole = 'user' | 'moderator' | 'admin'

export interface UserPermissions {
  // Admin panel access
  canViewAdminPanel: boolean

  // Business management
  canApproveBusinesses: boolean
  canRejectBusinesses: boolean
  canEditAnyBusiness: boolean
  canDeleteBusinesses: boolean

  // Category management
  canManageCategories: boolean

  // User management
  canViewUsers: boolean
  canManageRoles: boolean
  canSuspendUsers: boolean
  canDeleteUsers: boolean

  // Analytics & reporting
  canViewStatistics: boolean
  canExportData: boolean

  // Community content
  canManageCommunityContent: boolean
  canManageAlerts: boolean
  canManageServices: boolean
}

/**
 * Get permissions for a given role and super admin status
 * @param role - User role (user/moderator/admin)
 * @param isSuperAdmin - Whether user is a super admin
 * @returns Object with boolean permissions
 */
export function getPermissions(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): UserPermissions {
  // Super admin has all permissions across all communities
  if (isSuperAdmin === true) {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: true,
      canManageCategories: true,
      canViewUsers: true,
      canManageRoles: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canViewStatistics: true,
      canExportData: true,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: true,
    }
  }

  // Admin role (community-level full access)
  if (role === 'admin') {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: true,
      canManageCategories: true,
      canViewUsers: true,
      canManageRoles: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canViewStatistics: true,
      canExportData: true,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: true,
    }
  }

  // Moderator role (content moderation, no user/category management)
  if (role === 'moderator') {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: false,
      canManageCategories: false,
      canViewUsers: true,
      canManageRoles: false,
      canSuspendUsers: false,
      canDeleteUsers: false,
      canViewStatistics: true,
      canExportData: false,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: false,
    }
  }

  // Default user (no admin permissions)
  return {
    canViewAdminPanel: false,
    canApproveBusinesses: false,
    canRejectBusinesses: false,
    canEditAnyBusiness: false,
    canDeleteBusinesses: false,
    canManageCategories: false,
    canViewUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    canDeleteUsers: false,
    canViewStatistics: false,
    canExportData: false,
    canManageCommunityContent: false,
    canManageAlerts: false,
    canManageServices: false,
  }
}

/**
 * Helper to check if user has staff access (moderator or admin)
 */
export function isStaff(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): boolean {
  return isSuperAdmin === true || role === 'admin' || role === 'moderator'
}

/**
 * Helper to check if user is admin (for backward compatibility)
 */
export function isAdmin(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): boolean {
  return isSuperAdmin === true || role === 'admin'
}
