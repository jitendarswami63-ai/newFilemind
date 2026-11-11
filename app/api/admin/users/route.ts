import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import { getAdminUsersList } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || ''
  const tier = (searchParams.get('tier') || 'all') as any
  const status = (searchParams.get('status') || 'all') as any

  try {
    const data = await getAdminUsersList({
      page,
      limit,
      search,
      tier,
      status,
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to list users' },
      { status: 500 }
    )
  }
}
