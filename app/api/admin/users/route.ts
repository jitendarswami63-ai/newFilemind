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
  const rawTier = searchParams.get('tier') || 'all'
  const rawStatus = searchParams.get('status') || 'all'
  const tier = (['all', 'free', 'pro', 'elite'].includes(rawTier) ? rawTier : 'all') as 'all' | 'free' | 'pro' | 'elite'
  const status = (['all', 'active', 'suspended'].includes(rawStatus) ? rawStatus : 'all') as 'all' | 'active' | 'suspended'

  try {
    const data = await getAdminUsersList({
      page,
      limit,
      search,
      tier,
      status,
    })
    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list users' },
      { status: 500 }
    )
  }
}
