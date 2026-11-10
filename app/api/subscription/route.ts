import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isServerUserPro } from '@/lib/subscription/plan-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Auto-fetches the authoritative subscription status directly from the user's database records.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: true,
        is_pro: false,
        plan: 'free',
        planName: 'Free Tier',
        user_id: null,
      })
    }

    const isPro = await isServerUserPro(user)

    return NextResponse.json({
      success: true,
      is_pro: isPro,
      plan: isPro ? 'pro' : 'free',
      planName: isPro ? 'Pro Intelligence' : 'Free Tier',
      user_id: user.id,
      email: user.email,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error checking subscription status' },
      { status: 500 }
    )
  }
}
