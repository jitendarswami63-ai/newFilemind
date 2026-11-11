import 'server-only'
import { getAdminClient } from './data'

export interface AdminAuditEntry {
  adminId: string
  adminEmail: string
  actionType: string
  targetId?: string | null
  targetEmail?: string | null
  details?: Record<string, any>
  reason?: string | null
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<boolean> {
  try {
    const admin = getAdminClient()
    const { error } = await admin.from('admin_audit_logs').insert({
      admin_id: entry.adminId || null,
      admin_email: entry.adminEmail,
      action_type: entry.actionType,
      target_id: entry.targetId || null,
      target_email: entry.targetEmail || null,
      details: entry.details || {},
      reason: entry.reason || null,
    })

    if (error) {
      console.warn('[logAdminAction] Table insert failed (table may need migration):', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[logAdminAction] Error writing audit log:', err)
    return false
  }
}

export interface AuditLogsFilter {
  page?: number
  limit?: number
  actionType?: string
  search?: string
}

export async function listAdminAuditLogs(filter: AuditLogsFilter = {}) {
  const page = Math.max(1, filter.page || 1)
  const limit = Math.min(100, Math.max(1, filter.limit || 25))
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const admin = getAdminClient()
    let query = admin
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter.actionType) {
      query = query.eq('action_type', filter.actionType)
    }

    if (filter.search) {
      const s = filter.search.trim()
      query = query.or(`admin_email.ilike.%${s}%,target_email.ilike.%${s}%,action_type.ilike.%${s}%,reason.ilike.%${s}%`)
    }

    const { data, error, count } = await query

    if (error) {
      return {
        logs: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }
    }

    const total = count || 0
    return {
      logs: data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (err) {
    console.error('[listAdminAuditLogs] Error listing logs:', err)
    return {
      logs: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }
}
