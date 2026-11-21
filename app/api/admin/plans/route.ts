import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import {
  getLivePlanConfigs,
  saveLivePlanConfigs,
  resetLivePlanConfigs,
} from '@/lib/subscription/dynamic-plans'
import { logAdminAction } from '@/lib/admin/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const config = await getLivePlanConfigs(true)
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load plan configurations' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json().catch(() => ({}))
    const { plans, storagePacks } = body

    if (!plans || typeof plans !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: plans configuration object is required.' },
        { status: 400 }
      )
    }

    const updated = await saveLivePlanConfigs(
      plans,
      storagePacks,
      auth.admin.email
    )

    try {
      await logAdminAction({
        adminId: auth.admin.user.id,
        adminEmail: auth.admin.email,
        actionType: 'plans.update_pricing_and_quotas',
        targetId: 'live_plans',
        reason: 'Updated dynamic subscription plans, quotas, and pricing',
        details: {
          proPrice: updated.plans.pro.priceINR,
          elitePrice: updated.plans.elite.priceINR,
          updatedAt: updated.updatedAt,
        },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Plans and pricing updated successfully. Changes are now live across the website and Razorpay checkout.',
      ...updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save plan configuration' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const reset = await resetLivePlanConfigs(auth.admin.email)

    try {
      await logAdminAction({
        adminId: auth.admin.user.id,
        adminEmail: auth.admin.email,
        actionType: 'plans.reset_to_factory_defaults',
        targetId: 'live_plans',
        reason: 'Reset subscription plans and pricing back to factory defaults',
        details: {},
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Plan configurations have been reset to factory defaults.',
      ...reset,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reset plan configuration' },
      { status: 500 }
    )
  }
}
