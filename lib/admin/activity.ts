import 'server-only'
import { getAdminClient } from './data'

export interface UserActivityEntry {
  userId: string
  userEmail?: string | null
  eventType: string
  authMethod?: string | null
  sessionStatus?: string
  details?: Record<string, any>
}

export async function recordUserActivity(entry: UserActivityEntry): Promise<boolean> {
  try {
    const admin = getAdminClient()
    const { error } = await admin.from('admin_user_activity').insert({
      user_id: entry.userId,
      user_email: entry.userEmail || null,
      event_type: entry.eventType,
      auth_method: entry.authMethod || 'password',
      session_status: entry.sessionStatus || 'success',
      details: entry.details || {},
    })

    if (error) {
      console.warn('[recordUserActivity] Activity insert warning:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[recordUserActivity] Error logging user activity:', err)
    return false
  }
}

export async function listUserActivities(filter: { userId?: string; limit?: number } = {}) {
  const limit = Math.min(100, Math.max(1, filter.limit || 20))

  try {
    const admin = getAdminClient()
    let query = admin
      .from('admin_user_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filter.userId) {
      query = query.eq('user_id', filter.userId)
    }

    const { data, error } = await query
    if (error) return []
    return data || []
  } catch (err) {
    console.error('[listUserActivities] Error reading activities:', err)
    return []
  }
}
