import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import {
  grantManualSubscription,
  revokeManualSubscription,
  listManualGrants,
} from '@/lib/admin/subscriptions'
import { getAdminClient } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const status = searchParams.get('status') || undefined

  try {
    const data = await listManualGrants({ page, limit, status })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to list manual grants' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { targetEmail, targetUserId, tier, durationDays, reason } = body

    if (!tier || (tier !== 'pro' && tier !== 'elite')) {
      return NextResponse.json(
        { error: 'Tier must be either "pro" or "elite"' },
        { status: 400 }
      )
    }

    let finalUserId = targetUserId
    let finalEmail = targetEmail

    // If only email provided, resolve user ID
    if (!finalUserId && finalEmail) {
      const admin = getAdminClient()
      const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (usersErr || !usersData?.users) {
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
      }

      const found = usersData.users.find(
        (u) => (u.email || '').toLowerCase() === finalEmail.trim().toLowerCase()
      )

      if (!found) {
        return NextResponse.json(
          { error: `User with email "${finalEmail}" does not exist in the system.` },
          { status: 404 }
        )
      }

      finalUserId = found.id
      finalEmail = found.email
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'Please provide either targetEmail or targetUserId' },
        { status: 400 }
      )
    }

    const grant = await grantManualSubscription({
      targetUserId: finalUserId,
      targetUserEmail: finalEmail || 'Unknown Email',
      tier,
      durationDays: typeof durationDays === 'number' ? durationDays : null,
      reason: reason || 'Manual grant from Admin Control Center',
      adminId: auth.admin.user.id,
      adminEmail: auth.admin.email,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${tier.toUpperCase()} access`,
      grant,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to grant subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { targetUserId, targetUserEmail, grantId, reason } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    await revokeManualSubscription({
      targetUserId,
      targetUserEmail,
      grantId,
      reason: reason || 'Manual revocation from Admin Control Center',
      adminId: auth.admin.user.id,
      adminEmail: auth.admin.email,
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully revoked and reverted to Free tier',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke subscription' },
      { status: 500 }
    )
  }
}
