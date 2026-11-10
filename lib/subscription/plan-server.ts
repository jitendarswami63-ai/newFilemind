import 'server-only'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function isServerUserPro(user?: { user_metadata?: Record<string, any> | null } | null): Promise<boolean> {
  const meta = user?.user_metadata || {}
  if (
    meta.plan === 'pro' ||
    meta.is_pro === true ||
    meta.tier === 'pro' ||
    meta.plan_tier === 'pro' ||
    meta.subscription === 'pro'
  ) {
    return true
  }

  try {
    const cookieStore = await cookies()
    const planCookie = cookieStore.get('filemind_plan')?.value
    if (planCookie === 'pro') {
      return true
    }
  } catch {
    // ignore
  }

  return false
}

/**
 * Promotes a user to Pro plan in Supabase Auth user_metadata using the service role key.
 */
export async function promoteUserToPro(userId: string, metadataExtra: Record<string, any> = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[promoteUserToPro] Missing Supabase admin credentials')
    return false
  }

  try {
    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      console.error('[promoteUserToPro] Failed to fetch user:', getUserError)
      return false
    }

    const currentMeta = userData.user.user_metadata || {}
    const updatedMeta = {
      ...currentMeta,
      plan: 'pro',
      is_pro: true,
      plan_tier: 'pro',
      plan_activated_at: new Date().toISOString(),
      ...metadataExtra,
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMeta,
    })

    if (updateError) {
      console.error('[promoteUserToPro] Error updating user metadata:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[promoteUserToPro] Unexpected error:', error)
    return false
  }
}
