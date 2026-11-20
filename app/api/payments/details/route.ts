import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId parameter' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meta = user.user_metadata || {}
    const billingHistory: any[] = Array.isArray(meta.billing_history) ? meta.billing_history : []
    const purchasedPacks: any[] = Array.isArray(meta.purchased_storage_packs)
      ? meta.purchased_storage_packs
      : []

    const userOwnsPayment =
      billingHistory.some(
        (tx) => tx.paymentId === paymentId || tx.orderId === paymentId || tx.id === paymentId
      ) || purchasedPacks.some((pack) => pack.paymentId === paymentId || pack.orderId === paymentId)

    if (!userOwnsPayment) {
      return NextResponse.json({ error: 'Payment not found in user records' }, { status: 404 })
    }

    let liveDetails: Record<string, any> = {}

    try {
      const razorpay = getRazorpayClient()
      const payment: any = await razorpay.payments.fetch(paymentId)

      if (payment) {
        liveDetails = {
          entity: payment.entity,
          amountPaise: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          orderId: payment.order_id,
          description: payment.description,
          international: payment.international,
          refundStatus: payment.refund_status,
          amountRefunded: payment.amount_refunded,
          captured: payment.captured,
          email: payment.email,
          contact: payment.contact,
          fee: payment.fee ? payment.fee / 100 : null,
          tax: payment.tax ? payment.tax / 100 : null,
          createdAt: payment.created_at,
          bank: payment.bank || null,
          wallet: payment.wallet || null,
          vpa: payment.vpa || null,
          card: payment.card
            ? {
                network: payment.card.network,
                last4: payment.card.last4,
                type: payment.card.type,
              }
            : null,
          acquirerData: payment.acquirer_data || null,
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      liveDetails,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
