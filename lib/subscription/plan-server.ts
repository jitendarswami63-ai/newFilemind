import 'server-only'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import {
  PlanTier,
  PLAN_CONFIGS,
  STORAGE_PACKS,
  StoragePack,
  getUserPlanTier,
  calculateUserEntitlements,
  UserEntitlements,
} from './plans'

function getAdminClient() {
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

export async function isServerUserPro(
  user?: { id?: string; user_metadata?: Record<string, any> | null } | null
): Promise<boolean> {
  if (!user) return false
  const tier = await getServerUserTier(user)
  return tier === 'pro' || tier === 'elite'
}

export async function getServerUserTier(
  user?: { id?: string; user_metadata?: Record<string, any> | null } | null
): Promise<PlanTier> {
  if (!user) return 'free'
  const metaTier = getUserPlanTier(user)
  if (metaTier === 'elite') return 'elite'

  if (user.id) {
    try {
      const admin = getAdminClient()
      const { data: activeGrant } = await admin
        .from('admin_subscription_grants')
        .select('tier, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeGrant) {
        const isExpired = activeGrant.expires_at && new Date(activeGrant.expires_at).getTime() < Date.now()
        if (!isExpired) {
          const grantTier = String(activeGrant.tier).toLowerCase()
          if (grantTier === 'elite' || grantTier === 'pro') {
            return grantTier as PlanTier
          }
        }
      }

      if (metaTier === 'free') {
        const { data: freshUser } = await admin.auth.admin.getUserById(user.id)
        if (freshUser?.user) {
          const freshTier = getUserPlanTier(freshUser.user)
          if (freshTier !== 'free') {
            return freshTier
          }
        }
      }
    } catch (err) {
      console.warn('[getServerUserTier] Authoritative lookup warning:', err)
    }
  }

  return metaTier
}

export async function getServerUserEntitlements(
  userId: string,
  userMetadata?: Record<string, any> | null,
  includeStorage: boolean = true
): Promise<UserEntitlements> {
  let totalUsedBytes = 0
  let effectiveMetadata: Record<string, any> = userMetadata ? { ...userMetadata } : {}

  try {
    const admin = getAdminClient()

    const currentTier = getUserPlanTier({ user_metadata: effectiveMetadata })
    if (currentTier !== 'elite') {
      const { data: activeGrant } = await admin
        .from('admin_subscription_grants')
        .select('tier, expires_at, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeGrant) {
        const isExpired = activeGrant.expires_at && new Date(activeGrant.expires_at).getTime() < Date.now()
        if (!isExpired) {
          const grantTier = String(activeGrant.tier).toLowerCase()
          if (grantTier === 'elite' || grantTier === 'pro') {
            effectiveMetadata.tier = grantTier
            effectiveMetadata.plan_tier = grantTier
            effectiveMetadata.plan = grantTier
            effectiveMetadata.is_pro = true
          }
        }
      } else if (currentTier === 'free') {
        const { data: freshUser } = await admin.auth.admin.getUserById(userId)
        if (freshUser?.user?.user_metadata) {
          const freshTier = getUserPlanTier(freshUser.user)
          if (freshTier !== 'free') {
            effectiveMetadata = { ...effectiveMetadata, ...freshUser.user.user_metadata }
          }
        }
      }
    }

    if (includeStorage) {
      const { data, error } = await admin
        .from('documents')
        .select('file_size')
        .eq('user_id', userId)

      if (!error && Array.isArray(data)) {
        totalUsedBytes = data.reduce((acc, row) => acc + (Number(row.file_size) || 0), 0)
      }
    }
  } catch (err) {
    console.error('[getServerUserEntitlements] Error computing used storage:', err)
  }

  return calculateUserEntitlements({ user_metadata: effectiveMetadata }, totalUsedBytes)
}

export async function promoteUserPlan(
  userId: string,
  tier: 'pro' | 'elite',
  metadataExtra: Record<string, any> = {}
): Promise<boolean> {
  try {
    const admin = getAdminClient()
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      console.error('[promoteUserPlan] User lookup failed:', getUserError)
      return false
    }

    const currentMeta = userData.user.user_metadata || {}
    const now = new Date()
    const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const billingHistory = Array.isArray(currentMeta.billing_history)
      ? [...currentMeta.billing_history]
      : []

    if (metadataExtra.razorpay_payment_id) {
      const isDuplicate = billingHistory.some(
        (b) => b.paymentId === metadataExtra.razorpay_payment_id || (metadataExtra.razorpay_order_id && b.orderId === metadataExtra.razorpay_order_id)
      )
      if (!isDuplicate) {
        billingHistory.unshift({
          id: `tx_${Date.now()}`,
          type: 'subscription',
          planTier: tier,
          planName: PLAN_CONFIGS[tier].name,
          amountINR: metadataExtra.amount_paid_inr || PLAN_CONFIGS[tier].priceINR,
          date: now.toISOString(),
          orderId: metadataExtra.razorpay_order_id,
          paymentId: metadataExtra.razorpay_payment_id,
          status: metadataExtra.transaction_status || 'paid',
          customerName: metadataExtra.customer_name || userData.user.user_metadata?.full_name || 'FileMind User',
          customerEmail: metadataExtra.customer_email || userData.user.email || '',
          customerPhone: metadataExtra.customer_phone || userData.user.phone || userData.user.user_metadata?.phone || '',
        })
      }
    }

    const updatedMeta = {
      ...currentMeta,
      tier,
      plan_tier: tier,
      plan: tier,
      is_pro: true,
      plan_name: PLAN_CONFIGS[tier].name,
      plan_activated_at: now.toISOString(),
      plan_renewal_date: renewalDate,
      billing_history: billingHistory.slice(0, 50),
      ...metadataExtra,
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMeta,
    })

    if (updateError) {
      console.error('[promoteUserPlan] Metadata update failed:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[promoteUserPlan] Unexpected error:', error)
    return false
  }
}

export async function promoteUserToPro(userId: string, metadataExtra: Record<string, any> = {}) {
  return promoteUserPlan(userId, 'pro', metadataExtra)
}

export async function downgradeUserToFree(userId: string): Promise<boolean> {
  try {
    const admin = getAdminClient()
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      console.error('[downgradeUserToFree] User lookup failed:', getUserError)
      return false
    }

    const currentMeta = userData.user.user_metadata || {}

    const updatedMeta = {
      ...currentMeta,
      tier: 'free',
      plan_tier: 'free',
      plan: 'free',
      is_pro: false,
      plan_name: PLAN_CONFIGS.free.name,
      plan_downgraded_at: new Date().toISOString(),
      plan_renewal_date: null,
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMeta,
    })

    if (updateError) {
      console.error('[downgradeUserToFree] Update failed:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[downgradeUserToFree] Unexpected error:', error)
    return false
  }
}

export async function addStoragePackToUser(
  userId: string,
  packId: 'pack_1gb' | 'pack_5gb' | 'pack_10gb',
  metadataExtra: Record<string, any> = {}
): Promise<boolean> {
  const pack = STORAGE_PACKS[packId]
  if (!pack) {
    console.error('[addStoragePackToUser] Unknown pack ID:', packId)
    return false
  }

  try {
    const admin = getAdminClient()
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      console.error('[addStoragePackToUser] User lookup failed:', getUserError)
      return false
    }

    const currentMeta = userData.user.user_metadata || {}
    const currentAdditional = Number(currentMeta.additional_storage_bytes) || 0

    const billingHistory = Array.isArray(currentMeta.billing_history)
      ? [...currentMeta.billing_history]
      : []

    const isDuplicate = billingHistory.some(
      (b) => b.paymentId === metadataExtra.razorpay_payment_id || (metadataExtra.razorpay_order_id && b.orderId === metadataExtra.razorpay_order_id)
    )

    if (isDuplicate) {
      return true
    }

    const newAdditional = currentAdditional + pack.storageBytes
    const purchasedPacks = Array.isArray(currentMeta.purchased_storage_packs)
      ? [...currentMeta.purchased_storage_packs]
      : []

    const now = new Date().toISOString()
    purchasedPacks.push({
      packId: pack.id,
      packName: pack.name,
      storageBytes: pack.storageBytes,
      priceINR: pack.priceINR,
      purchasedAt: now,
      orderId: metadataExtra.razorpay_order_id,
      paymentId: metadataExtra.razorpay_payment_id,
    })

    billingHistory.unshift({
      id: `tx_${Date.now()}`,
      type: 'storage_pack',
      packId: pack.id,
      packName: pack.name,
      amountINR: metadataExtra.amount_paid_inr || pack.priceINR,
      date: now,
      orderId: metadataExtra.razorpay_order_id,
      paymentId: metadataExtra.razorpay_payment_id,
      status: metadataExtra.transaction_status || 'paid',
      customerName: metadataExtra.customer_name || userData.user.user_metadata?.full_name || 'FileMind User',
      customerEmail: metadataExtra.customer_email || userData.user.email || '',
      customerPhone: metadataExtra.customer_phone || userData.user.phone || userData.user.user_metadata?.phone || '',
    })

    const updatedMeta = {
      ...currentMeta,
      additional_storage_bytes: newAdditional,
      purchased_storage_packs: purchasedPacks,
      billing_history: billingHistory.slice(0, 50),
      ...metadataExtra,
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMeta,
    })

    if (updateError) {
      console.error('[addStoragePackToUser] Metadata update failed:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[addStoragePackToUser] Unexpected error:', error)
    return false
  }
}

export async function incrementUserAiUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const admin = getAdminClient()
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      return { allowed: false, remaining: 0 }
    }

    const meta = userData.user.user_metadata || {}
    const tier = getUserPlanTier(userData.user)
    const plan = PLAN_CONFIGS[tier]

    if (meta.byok_gemini_key) {
      return { allowed: true, remaining: 999999 }
    }

    if (!plan.hasAiFeatures) {
      return { allowed: false, remaining: 0 }
    }

    const currentMonthKey = new Date().toISOString().slice(0, 7)
    const currentUsage = meta.ai_usage?.month === currentMonthKey ? Number(meta.ai_usage.count) || 0 : 0

    if (currentUsage >= plan.monthlyAiAllowance) {
      return { allowed: false, remaining: 0 }
    }

    const nextCount = currentUsage + 1
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        ai_usage: {
          month: currentMonthKey,
          count: nextCount,
          last_used_at: new Date().toISOString(),
        },
      },
    })

    return { allowed: true, remaining: plan.monthlyAiAllowance - nextCount }
  } catch (err) {
    console.error('[incrementUserAiUsage] Error:', err)
    return { allowed: true, remaining: 10 }
  }
}
