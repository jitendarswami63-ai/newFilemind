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

    const meta = (user.user_metadata || {}) as Record<string, unknown>
    const billingHistory = Array.isArray(meta.billing_history)
      ? (meta.billing_history as Array<{ paymentId?: string; orderId?: string; id?: string }>)
      : []
    const purchasedPacks = Array.isArray(meta.purchased_storage_packs)
      ? (meta.purchased_storage_packs as Array<{ paymentId?: string; orderId?: string }>)
      : []

    const userOwnsPayment =
      billingHistory.some(
        (tx) => tx.paymentId === paymentId || tx.orderId === paymentId || tx.id === paymentId
      ) || purchasedPacks.some((pack) => pack.paymentId === paymentId || pack.orderId === paymentId)

    if (!userOwnsPayment) {
      return NextResponse.json({ error: 'Payment not found in user records' }, { status: 404 })
    }

    let liveDetails: Record<string, unknown> = {}

    try {
      const razorpay = getRazorpayClient()
      const payment = (await razorpay.payments.fetch(paymentId)) as unknown as {
        entity?: string
        amount?: number
        currency?: string
        status?: string
        method?: string
        order_id?: string
        description?: string
        international?: boolean
        refund_status?: string | null
        amount_refunded?: number
        captured?: boolean
        email?: string
        contact?: string | number
        fee?: number
        tax?: number
        created_at?: number
        bank?: string | null
        wallet?: string | null
        vpa?: string | null
        card?: { network?: string; last4?: string; type?: string } | null
        acquirer_data?: Record<string, unknown> | null
      }

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
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
