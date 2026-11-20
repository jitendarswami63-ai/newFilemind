import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import { getAllAdminPayments } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const payments = await getAllAdminPayments()
    return NextResponse.json({ success: true, payments, total: payments.length })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch customer payments' },
      { status: 500 }
    )
  }
}
