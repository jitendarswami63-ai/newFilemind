import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getServerUserEntitlements,
  getServerUserTier,
  downgradeUserToFree,
} from '@/lib/subscription/plan-server'
import { PLAN_CONFIGS } from '@/lib/subscription/plans'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const response = NextResponse.json({
        success: true,
        is_pro: false,
        is_elite: false,
        tier: 'free',
        plan: 'free',
        planName: 'Free Tier',
        entitlements: null,
        user_id: null,
      })
      response.cookies.delete('filemind_plan')
      response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })
      return response
    }

    const tier = await getServerUserTier(user)
    const entitlements = await getServerUserEntitlements(user.id, user.user_metadata)
    const meta = user.user_metadata || {}

    const response = NextResponse.json({
      success: true,
      is_pro: tier === 'pro' || tier === 'elite',
      is_elite: tier === 'elite',
      tier,
      plan: tier,
      planName: PLAN_CONFIGS[tier]?.name || 'Free Tier',
      user_id: user.id,
      email: user.email,
      entitlements,
      billing_history: meta.billing_history || [],
      purchased_storage_packs: meta.purchased_storage_packs || [],
      byok_configured: Boolean(meta.byok_gemini_key),
      renewal_date: meta.plan_renewal_date || null,
      activated_at: meta.plan_activated_at || null,
    })

    response.cookies.delete('filemind_plan')
    response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })

    return response
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error checking subscription status' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { action } = body

    if (action === 'downgrade_to_free') {
      const success = await downgradeUserToFree(user.id)
      if (!success) {
        return NextResponse.json({ error: 'Failed to downgrade plan' }, { status: 500 })
      }
      return NextResponse.json({
        success: true,
        message: 'Successfully switched to Free Tier. All your existing documents are safely preserved.',
      })
    }

    if (action === 'save_byok') {
      const { apiKey } = body
      if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return NextResponse.json({ error: 'Invalid Gemini API key provided' }, { status: 400 })
      }

      const admin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const currentMeta = user.user_metadata || {}
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...currentMeta,
          byok_gemini_key: apiKey.trim(),
          byok_updated_at: new Date().toISOString(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Gemini BYOK key configured securely for your account.',
      })
    }

    if (action === 'remove_byok') {
      const admin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const currentMeta = user.user_metadata || {}
      const updatedMeta = { ...currentMeta }
      delete updatedMeta.byok_gemini_key
      delete updatedMeta.byok_updated_at

      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: updatedMeta,
      })

      return NextResponse.json({
        success: true,
        message: 'BYOK Gemini key removed.',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
