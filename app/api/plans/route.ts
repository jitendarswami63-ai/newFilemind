import { NextResponse } from 'next/server'
import { getLivePlanConfigs } from '@/lib/subscription/dynamic-plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getLivePlanConfigs()
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch active plans' },
      { status: 500 }
    )
  }
}
