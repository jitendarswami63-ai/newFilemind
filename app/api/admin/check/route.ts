import { NextResponse } from 'next/server'
import { getAuthorizedAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const admin = await getAuthorizedAdmin()
  return NextResponse.json({
    isAdmin: Boolean(admin),
  })
}
