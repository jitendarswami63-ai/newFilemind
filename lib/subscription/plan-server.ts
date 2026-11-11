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
  user?: { user_metadata?: Record<string, any> | null } | null
): Promise<boolean> {
  if (!user) return false
  const tier = getUserPlanTier(user)
  return tier === 'pro' || tier === 'elite'
}

export async function getServerUserTier(
  user?: { user_metadata?: Record<string, any> | null } | null
): Promise<PlanTier> {
  return getUserPlanTier(user)
}

export async function getServerUserEntitlements(
  userId: string,
  userMetadata?: Record<string, any> | null
): Promise<UserEntitlements> {
  const admin = getAdminClient()

  let totalUsedBytes = 0
  try {
    const { data, error } = await admin
      .from('documents')
      .select('file_size')
      .eq('user_id', userId)

    if (!error && Array.isArray(data)) {
      totalUsedBytes = data.reduce((acc, row) => acc + (Number(row.file_size) || 0), 0)
    }
  } catch (err) {
    console.error('[getServerUserEntitlements] Error computing used storage:', err)
  }

  return calculateUserEntitlements({ user_metadata: userMetadata }, totalUsedBytes)
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
      billingHistory.unshift({
        id: `tx_${Date.now()}`,
        type: 'subscription',
        planTier: tier,
        planName: PLAN_CONFIGS[tier].name,
        amountINR: PLAN_CONFIGS[tier].priceINR,
        date: now.toISOString(),
        orderId: metadataExtra.razorpay_order_id,
        paymentId: metadataExtra.razorpay_payment_id,
        status: 'paid',
      })
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

    const billingHistory = Array.isArray(currentMeta.billing_history)
      ? [...currentMeta.billing_history]
      : []

    billingHistory.unshift({
      id: `tx_${Date.now()}`,
      type: 'storage_pack',
      packId: pack.id,
      packName: pack.name,
      amountINR: pack.priceINR,
      date: now,
      orderId: metadataExtra.razorpay_order_id,
      paymentId: metadataExtra.razorpay_payment_id,
      status: 'paid',
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
