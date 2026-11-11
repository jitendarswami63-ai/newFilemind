import 'server-only'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { PLAN_CONFIGS, PlanTier, formatBytes } from '@/lib/subscription/plans'

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).')
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface AdminOverviewStats {
  totalUsers: number
  newUsersToday: number
  newUsersThisMonth: number
  freeUsers: number
  proUsers: number
  eliteUsers: number
  totalDocuments: number
  totalStorageBytes: number
  totalStorageFormatted: string
  totalAiQueries: number
  processingSuccessCount: number
  processingFailedCount: number
  successRate: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const admin = getAdminClient()

  let totalUsers = 0
  let newUsersToday = 0
  let newUsersThisMonth = 0
  let freeUsers = 0
  let proUsers = 0
  let eliteUsers = 0
  let totalAiQueries = 0

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  try {
    const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (!usersErr && usersData?.users) {
      const users = usersData.users
      totalUsers = users.length

      for (const u of users) {
        const createdAt = new Date(u.created_at).getTime()
        if (createdAt >= startOfToday) newUsersToday++
        if (createdAt >= startOfMonth) newUsersThisMonth++

        const meta = u.user_metadata || {}
        const tier = (meta.tier || meta.plan_tier || meta.plan || 'free').toLowerCase()
        if (tier === 'elite') eliteUsers++
        else if (tier === 'pro' || meta.is_pro === true) proUsers++
        else freeUsers++

        if (meta.ai_usage && typeof meta.ai_usage.count === 'number') {
          totalAiQueries += meta.ai_usage.count
        }
      }
    }
  } catch (err) {
    console.error('[getAdminOverviewStats] Error counting users:', err)
  }

  let totalDocuments = 0
  let totalStorageBytes = 0
  let processingSuccessCount = 0
  let processingFailedCount = 0

  try {
    const { data: docs, error: docsErr } = await admin
      .from('documents')
      .select('id, file_size, processing_status')

    if (!docsErr && Array.isArray(docs)) {
      totalDocuments = docs.length
      for (const doc of docs) {
        totalStorageBytes += Number(doc.file_size) || 0
        const status = doc.processing_status
        if (status === 'completed' || status === 'indexed' || status === 'ready') {
          processingSuccessCount++
        } else if (status === 'failed' || status === 'error') {
          processingFailedCount++
        } else {
          processingSuccessCount++
        }
      }
    }
  } catch (err) {
    console.error('[getAdminOverviewStats] Error calculating documents/storage:', err)
  }

  const evaluatedJobs = processingSuccessCount + processingFailedCount
  const successRate = evaluatedJobs > 0 ? Math.round((processingSuccessCount / evaluatedJobs) * 100) : 100

  return {
    totalUsers,
    newUsersToday,
    newUsersThisMonth,
    freeUsers,
    proUsers,
    eliteUsers,
    totalDocuments,
    totalStorageBytes,
    totalStorageFormatted: formatBytes(totalStorageBytes),
    totalAiQueries,
    processingSuccessCount,
    processingFailedCount,
    successRate,
  }
}

export interface AdminUserListItem {
  id: string
  email: string
  fullName: string
  tier: PlanTier
  planName: string
  isManualGrant: boolean
  isSuspended: boolean
  emailConfirmed: boolean
  createdAt: string
  lastSignInAt: string | null
  totalDocuments: number
  totalStorageBytes: number
  totalStorageFormatted: string
  aiQueriesCount: number
}

export interface AdminUsersFilter {
  page?: number
  limit?: number
  search?: string
  tier?: 'all' | 'free' | 'pro' | 'elite'
  status?: 'all' | 'active' | 'suspended'
}

export async function getAdminUsersList(filter: AdminUsersFilter = {}) {
  const admin = getAdminClient()
  const page = Math.max(1, filter.page || 1)
  const limit = Math.min(100, Math.max(1, filter.limit || 20))

  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (usersErr || !usersData?.users) {
    return { users: [], total: 0, page, limit, totalPages: 0 }
  }

  let users = usersData.users

  const search = (filter.search || '').trim().toLowerCase()
  if (search) {
    users = users.filter((u) => {
      const email = (u.email || '').toLowerCase()
      const fullName = (u.user_metadata?.full_name || u.user_metadata?.name || '').toLowerCase()
      const id = u.id.toLowerCase()
      return email.includes(search) || fullName.includes(search) || id.includes(search)
    })
  }

  if (filter.tier && filter.tier !== 'all') {
    users = users.filter((u) => {
      const meta = u.user_metadata || {}
      const tier = (meta.tier || meta.plan_tier || meta.plan || 'free').toLowerCase()
      if (filter.tier === 'elite') return tier === 'elite'
      if (filter.tier === 'pro') return tier === 'pro' || meta.is_pro === true
      return tier === 'free' && !meta.is_pro
    })
  }

  if (filter.status && filter.status !== 'all') {
    users = users.filter((u) => {
      const isSuspended = Boolean(u.user_metadata?.is_suspended)
      if (filter.status === 'suspended') return isSuspended
      return !isSuspended
    })
  }

  const total = users.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const paginatedUsers = users.slice(offset, offset + limit)

  const items: AdminUserListItem[] = paginatedUsers.map((u) => {
    const meta = u.user_metadata || {}
    let tier: PlanTier = 'free'
    const rawTier = (meta.tier || meta.plan_tier || meta.plan || '').toLowerCase()
    if (rawTier === 'elite') tier = 'elite'
    else if (rawTier === 'pro' || meta.is_pro === true) tier = 'pro'

    return {
      id: u.id,
      email: u.email || 'No Email',
      fullName: meta.full_name || meta.name || 'Anonymous User',
      tier,
      planName: PLAN_CONFIGS[tier]?.name || 'Free Tier',
      isManualGrant: Boolean(meta.manual_grant),
      isSuspended: Boolean(meta.is_suspended),
      emailConfirmed: Boolean(u.email_confirmed_at),
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
      totalDocuments: 0,
      totalStorageBytes: 0,
      totalStorageFormatted: '0 B',
      aiQueriesCount: Number(meta.ai_usage?.count) || 0,
    }
  })

  return {
    users: items,
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getAdminUserDetail(userId: string) {
  const admin = getAdminClient()

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr || !userData?.user) {
    return null
  }

  const u = userData.user
  const meta = u.user_metadata || {}

  let tier: PlanTier = 'free'
  const rawTier = (meta.tier || meta.plan_tier || meta.plan || '').toLowerCase()
  if (rawTier === 'elite') tier = 'elite'
  else if (rawTier === 'pro' || meta.is_pro === true) tier = 'pro'

  let totalDocs = 0
  let totalStorageBytes = 0
  let recentDocuments: any[] = []

  try {
    const { data: docs } = await admin
      .from('documents')
      .select('id, file_name, file_size, processing_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (docs) {
      totalDocs = docs.length
      totalStorageBytes = docs.reduce((acc, d) => acc + (Number(d.file_size) || 0), 0)
      recentDocuments = docs.slice(0, 10)
    }
  } catch {}

  let grantHistory: any[] = []
  try {
    const { data: grants } = await admin
      .from('admin_subscription_grants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (grants) grantHistory = grants
  } catch {}

  return {
    id: u.id,
    email: u.email || 'No email',
    fullName: meta.full_name || meta.name || 'Anonymous User',
    emailConfirmed: Boolean(u.email_confirmed_at),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at || null,
    isSuspended: Boolean(meta.is_suspended),
    suspensionReason: meta.suspension_reason || null,
    tier,
    plan: PLAN_CONFIGS[tier],
    manualGrant: meta.manual_grant || null,
    billingHistory: meta.billing_history || [],
    aiQueriesCount: Number(meta.ai_usage?.count) || 0,
    totalDocuments: totalDocs,
    totalStorageBytes,
    totalStorageFormatted: formatBytes(totalStorageBytes),
    recentDocuments,
    grantHistory,
    userMetadata: meta,
  }
}

export async function updateUserAccountStatus(params: {
  targetUserId: string
  targetUserEmail: string
  action: 'suspend' | 'reactivate'
  reason?: string
  adminId: string
  adminEmail: string
}) {
  const admin = getAdminClient()
  const { targetUserId, targetUserEmail, action, reason, adminId, adminEmail } = params

  const { data: userData, error: userLookupErr } = await admin.auth.admin.getUserById(targetUserId)
  if (userLookupErr || !userData?.user) {
    throw new Error('Target user not found.')
  }

  const currentMeta = userData.user.user_metadata || {}
  const isSuspended = action === 'suspend'

  const updatedMeta = {
    ...currentMeta,
    is_suspended: isSuspended,
    suspension_reason: isSuspended ? (reason || 'Administrative suspension') : null,
    suspension_updated_at: new Date().toISOString(),
    suspension_updated_by: adminEmail,
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
    user_metadata: updatedMeta,
  })

  if (updateErr) {
    throw new Error(`Failed to update account status: ${updateErr.message}`)
  }

  const { logAdminAction } = await import('./audit')
  await logAdminAction({
    adminId,
    adminEmail,
    actionType: isSuspended ? 'suspend_user' : 'reactivate_user',
    targetId: targetUserId,
    targetEmail: targetUserEmail,
    reason: reason || (isSuspended ? 'Account suspended' : 'Account reactivated'),
    details: {
      action,
    },
  })

  return { success: true, isSuspended }
}

