import 'server-only'
import { getAdminClient } from './data'
import { PLAN_CONFIGS, PlanTier } from '@/lib/subscription/plans'
import { logAdminAction } from './audit'

export interface ManualGrantParams {
  targetUserId: string
  targetUserEmail: string
  tier: 'pro' | 'elite'
  durationDays?: number | null
  reason?: string
  adminId: string
  adminEmail: string
}

export async function grantManualSubscription(params: ManualGrantParams) {
  const admin = getAdminClient()
  const { targetUserId, targetUserEmail, tier, durationDays, reason, adminId, adminEmail } = params

  if (tier !== 'pro' && tier !== 'elite') {
    throw new Error('Invalid tier. Only pro or elite can be granted.')
  }

  const { data: userData, error: userLookupErr } = await admin.auth.admin.getUserById(targetUserId)
  if (userLookupErr || !userData?.user) {
    throw new Error('Target user not found.')
  }

  const now = new Date()
  let expiresAt: Date | null = null
  if (typeof durationDays === 'number' && durationDays > 0) {
    expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
  }

  const currentMeta = userData.user.user_metadata || {}

  const manualGrantInfo = {
    is_manual: true,
    tier,
    granted_by_id: adminId,
    granted_by_email: adminEmail,
    granted_at: now.toISOString(),
    duration_days: durationDays || null,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    reason: reason || 'Manual administrative grant',
  }

  const updatedMeta = {
    ...currentMeta,
    tier,
    plan_tier: tier,
    plan: tier,
    is_pro: true,
    plan_name: PLAN_CONFIGS[tier].name,
    plan_activated_at: now.toISOString(),
    plan_renewal_date: expiresAt ? expiresAt.toISOString() : null,
    manual_grant: manualGrantInfo,
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
    user_metadata: updatedMeta,
  })

  if (updateErr) {
    throw new Error(`Failed to update user subscription metadata: ${updateErr.message}`)
  }

  let grantRecordId: string | null = null
  try {
    const { data: grantInsert, error: grantInsertErr } = await admin
      .from('admin_subscription_grants')
      .insert({
        user_id: targetUserId,
        user_email: targetUserEmail,
        granted_by_id: adminId,
        granted_by_email: adminEmail,
        tier,
        duration_days: durationDays || null,
        starts_at: now.toISOString(),
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        reason: reason || 'Administrative access grant',
        status: 'active',
      })
      .select('id')
      .single()

    if (!grantInsertErr && grantInsert) {
      grantRecordId = grantInsert.id
    }
  } catch (err) {
    console.warn('[grantManualSubscription] Table insert warning (skipping if table pending):', err)
  }

  await logAdminAction({
    adminId,
    adminEmail,
    actionType: 'grant_subscription',
    targetId: targetUserId,
    targetEmail: targetUserEmail,
    reason: reason || 'Manual subscription grant',
    details: {
      tier,
      durationDays: durationDays || 'lifetime',
      expiresAt: expiresAt ? expiresAt.toISOString() : 'never',
      grantId: grantRecordId,
    },
  })

  return {
    success: true,
    tier,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    grantId: grantRecordId,
  }
}

export interface RevokeGrantParams {
  targetUserId: string
  targetUserEmail?: string
  grantId?: string
  reason?: string
  adminId: string
  adminEmail: string
}

export async function revokeManualSubscription(params: RevokeGrantParams) {
  const admin = getAdminClient()
  const { targetUserId, targetUserEmail, grantId, reason, adminId, adminEmail } = params

  const { data: userData, error: userLookupErr } = await admin.auth.admin.getUserById(targetUserId)
  if (userLookupErr || !userData?.user) {
    throw new Error('Target user not found.')
  }

  const currentMeta = userData.user.user_metadata || {}

  const updatedMeta = {
    ...currentMeta,
    tier: 'free',
    plan_tier: 'free',
    plan: 'free',
    is_pro: false,
    plan_name: PLAN_CONFIGS.free.name,
    plan_renewal_date: null,
    manual_grant: null,
    manual_grant_revoked_at: new Date().toISOString(),
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
    user_metadata: updatedMeta,
  })

  if (updateErr) {
    throw new Error(`Failed to revoke user subscription: ${updateErr.message}`)
  }

  try {
    if (grantId) {
      await admin
        .from('admin_subscription_grants')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('id', grantId)
    } else {
      await admin
        .from('admin_subscription_grants')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId)
        .eq('status', 'active')
    }
  } catch (err) {
    console.warn('[revokeManualSubscription] Status update warning:', err)
  }

  await logAdminAction({
    adminId,
    adminEmail,
    actionType: 'revoke_subscription',
    targetId: targetUserId,
    targetEmail: targetUserEmail || userData.user.email || 'unknown',
    reason: reason || 'Manual grant revoked',
    details: {
      grantId,
    },
  })

  return {
    success: true,
  }
}

export async function listManualGrants(filter: { page?: number; limit?: number; status?: string } = {}) {
  const page = Math.max(1, filter.page || 1)
  const limit = Math.min(100, Math.max(1, filter.limit || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const admin = getAdminClient()
    let query = admin
      .from('admin_subscription_grants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter.status) {
      query = query.eq('status', filter.status)
    }

    const { data, error, count } = await query
    if (!error && Array.isArray(data) && data.length > 0) {
      const total = count || data.length
      return {
        grants: data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }

    const { data: usersData } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const allGrants: Array<{
      id: string
      user_id: string
      user_email: string
      granted_by_id: string | null
      granted_by_email: string
      tier: string
      duration_days: number | null
      starts_at: string
      expires_at: string | null
      reason: string
      status: string
      created_at: string
    }> = []
    if (usersData?.users) {
      for (const u of usersData.users) {
        const meta = u.user_metadata || {}
        if (meta.manual_grant) {
          const mg = meta.manual_grant
          const expiresAt = mg.expires_at ? new Date(mg.expires_at) : null
          const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false
          const isRevoked = meta.tier === 'free' && !meta.is_pro
          const grantStatus = isRevoked ? 'revoked' : isExpired ? 'expired' : 'active'

          if (filter.status && filter.status !== grantStatus) {
            continue
          }

          allGrants.push({
            id: `grant_${u.id}`,
            user_id: u.id,
            user_email: u.email || 'N/A',
            granted_by_id: mg.granted_by_id || null,
            granted_by_email: mg.granted_by_email || 'Admin',
            tier: mg.tier || meta.tier || 'pro',
            duration_days: typeof mg.duration_days === 'number' ? mg.duration_days : null,
            starts_at: mg.granted_at || u.created_at,
            expires_at: mg.expires_at || null,
            reason: mg.reason || 'Manual grant from Admin Control Center',
            status: grantStatus,
            created_at: mg.granted_at || u.created_at,
          })
        }
      }
    }

    allGrants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const total = allGrants.length
    const paginated = allGrants.slice(from, to + 1)

    return {
      grants: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (err) {
    return { grants: [], total: 0, page, limit, totalPages: 0 }
  }
}
