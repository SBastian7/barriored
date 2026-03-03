import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'approve_business'
  | 'reject_business'
  | 'delete_business'
  | 'approve_post'
  | 'reject_post'
  | 'delete_post'
  | 'pin_post'
  | 'unpin_post'
  | 'create_alert'
  | 'update_alert'
  | 'delete_alert'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'delete_user'
  | 'assign_role'
  | 'create_community'
  | 'update_community'
  | 'archive_community'

export type EntityType =
  | 'business'
  | 'post'
  | 'alert'
  | 'user'
  | 'community'
  | 'service'
  | 'report'

interface LogAuditParams {
  action: AuditAction
  entityType: EntityType
  entityId: string
  oldData?: any
  newData?: any
  communityId?: string
}

export async function logAuditAction(params: LogAuditParams) {
  const { action, entityType, entityId, oldData, newData, communityId } = params

  try {
    const response = await fetch('/api/admin/logs/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        community_id: communityId,
      }),
    })

    if (!response.ok) {
      console.error('Failed to log audit action:', await response.text())
    }
  } catch (error) {
    console.error('Error logging audit action:', error)
    // Don't throw - audit logging should not break the main operation
  }
}
