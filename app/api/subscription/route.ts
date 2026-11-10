import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoteUserToPro, isServerUserPro } from '@/lib/subscription/plan-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isPro = await isServerUserPro(user)

    return NextResponse.json({
      success: true,
      is_pro: isPro,
      plan: isPro ? 'pro' : 'free',
      planName: isPro ? 'Pro Intelligence' : 'Free Tier',
      user_id: user?.id || null,
    })
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

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'activate_pro'

    if (action === 'reset_free') {
      const response = NextResponse.json({
        success: true,
        is_pro: false,
        plan: 'free',
        message: 'Subscription reset to Free Tier',
      })
      response.cookies.delete('filemind_plan')
      return response
    }

    // Default: activate Pro
    if (user?.id) {
      await promoteUserToPro(user.id, {
        plan_activated_at: new Date().toISOString(),
        plan_source: 'manual_sync_or_checkout',
      })
    }

    const response = NextResponse.json({
      success: true,
      is_pro: true,
      plan: 'pro',
      planName: 'Pro Intelligence',
      message: 'Pro Intelligence activated successfully',
    })

    response.cookies.set('filemind_plan', 'pro', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    })

    return response
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error updating subscription' },
      { status: 500 }
    )
  }
}
