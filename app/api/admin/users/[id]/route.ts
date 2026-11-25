import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import { getAdminUserDetail, updateUserAccountStatus } from '@/lib/admin/data'
import { isSameOrigin } from '@/lib/validation/origin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    const user = await getAdminUserDetail(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(user)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    const body = await req.json()
    const { isSuspended, reason } = body

    if (typeof isSuspended !== 'boolean') {
      return NextResponse.json(
        { error: 'Field isSuspended must be a boolean' },
        { status: 400 }
      )
    }

    const userDetail = await getAdminUserDetail(id)
    const targetEmail = userDetail?.email || 'Unknown User'

    const updated = await updateUserAccountStatus({
      targetUserId: id,
      targetUserEmail: targetEmail,
      action: isSuspended ? 'suspend' : 'reactivate',
      reason,
      adminId: auth.admin.user.id,
      adminEmail: auth.admin.email,
    })

    return NextResponse.json({
      success: true,
      message: isSuspended ? 'Account suspended' : 'Account reactivated',
      user: updated,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account status' },
      { status: 500 }
    )
  }
}
