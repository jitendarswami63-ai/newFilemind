import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import { listAdminAuditLogs } from '@/lib/admin/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '25', 10)
  const actionType = searchParams.get('actionType') || undefined
  const search = searchParams.get('search') || undefined

  try {
    const data = await listAdminAuditLogs({ page, limit, actionType, search })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to list audit logs' },
      { status: 500 }
    )
  }
}
