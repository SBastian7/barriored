import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  | 'delete_community'
  | 'update_platform_config'
  | 'update_platform_policy'
  | 'update_payment_gateway'
  | 'revoke_subscription'

export type EntityType =
  | 'business'
  | 'post'
  | 'alert'
  | 'user'
  | 'community'
  | 'service'
  | 'report'
  | 'platform_config'
  | 'platform_policies'
  | 'platform_payment_config'
  | 'business_subscription'

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
    // Get current user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('No authenticated user for audit log')
      return
    }

    // Use admin client to bypass RLS for audit log insert
    const supabaseAdmin = createAdminClient()

    const { error } = await (supabaseAdmin.from('audit_logs') as any).insert({
      community_id: communityId,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    })

    if (error) {
      console.error('Failed to insert audit log:', error)
    }
  } catch (error) {
    console.error('Error logging audit action:', error)
    // Don't throw - audit logging should not break the main operation
  }
}
