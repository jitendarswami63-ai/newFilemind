import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isServerUserPro } from '@/lib/subscription/plan-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Auto-fetches the authoritative subscription status directly for the currently logged-in user.
 * Each user account is strictly isolated; no cross-account cookie leakage is allowed.
 */
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
        plan: 'free',
        planName: 'Free Tier',
        user_id: null,
      })
      // Ensure stale generic cookies are wiped
      response.cookies.delete('filemind_plan')
      response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })
      return response
    }

    // Check strictly this specific user's metadata in the database
    const isPro = await isServerUserPro(user)

    const response = NextResponse.json({
      success: true,
      is_pro: isPro,
      plan: isPro ? 'pro' : 'free',
      planName: isPro ? 'Pro Intelligence' : 'Free Tier',
      user_id: user.id,
      email: user.email,
    })

    // Remove legacy cookie so it never bleeds into another account
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
