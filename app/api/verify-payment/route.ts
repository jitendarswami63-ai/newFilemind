import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { promoteUserPlan, addStoragePackToUser } from '@/lib/subscription/plan-server'
import { getRazorpayClient } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Authentication required. Please sign in to verify your payment.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      )
    }

    const authenticatedUserId = user.id
    const userMeta = user.user_metadata || {}

    const body = await req.json().catch(() => ({}))
    const order_id = body.razorpay_order_id || body.order_id
    const payment_id = body.razorpay_payment_id || body.payment_id
    const signature = body.razorpay_signature || body.signature

    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        { error: 'Missing required parameters: order_id, payment_id, signature' },
        { status: 400 }
      )
    }

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').replace(/^["']|["']$/g, '').trim()
    if (!secret) {
      return NextResponse.json(
        { error: 'Server configuration error: missing Razorpay secret' },
        { status: 500 }
      )
    }

    const payload = `${order_id}|${payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Cryptographic payment signature mismatch' },
        { status: 400 }
      )
    }

    const razorpay = getRazorpayClient()
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(order_id).catch(() => null),
      razorpay.payments.fetch(payment_id).catch(() => null),
    ])

    if (!order) {
      return NextResponse.json(
        { error: 'Order record not found on payment gateway' },
        { status: 404 }
      )
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found on payment gateway' },
        { status: 404 }
      )
    }

    if (payment.order_id && payment.order_id !== order_id) {
      return NextResponse.json(
        { error: 'Payment ID does not correspond to the specified Order ID' },
        { status: 400 }
      )
    }

    const validStatuses = ['captured', 'authorized']
    if (!validStatuses.includes(payment.status)) {
      return NextResponse.json(
        {
          error: `Payment cannot be processed. Gateway status: ${payment.status}`,
          paymentStatus: payment.status,
        },
        { status: 400 }
      )
    }

    const orderNotes = order.notes || {}
    if (orderNotes.userId && orderNotes.userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Payment order does not belong to the authenticated user' },
        { status: 403 }
      )
    }

    const existingHistory = Array.isArray(userMeta.billing_history) ? userMeta.billing_history : []
    const alreadyProcessed = existingHistory.some(
      (tx: any) => tx.paymentId === payment_id || (tx.orderId === order_id && tx.status === 'paid')
    )

    if (alreadyProcessed) {
      const response = NextResponse.json({
        success: true,
        message: 'Payment verified and confirmed successfully (already processed)',
        itemType: orderNotes.type || body.type || 'subscription',
        planTier: orderNotes.planTier || body.planTier,
        packId: orderNotes.packId || body.packId,
        order_id,
        payment_id,
        alreadyProcessed: true,
      })
      response.cookies.delete('filemind_plan')
      response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })
      return response
    }

    const itemType = orderNotes.type || body.type || 'subscription'
    const planTier = orderNotes.planTier || body.planTier || (body.planName?.toLowerCase().includes('elite') ? 'elite' : 'pro')
    const packId = orderNotes.packId || body.packId

    const registeredName = (userMeta.full_name || userMeta.name || orderNotes.customerName || 'FileMind User').trim()
    const registeredEmail = user.email || orderNotes.customerEmail || ''
    const registeredPhone = (user.phone || userMeta.phone || orderNotes.customerPhone || '').trim()

    const metadataExtra = {
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      transaction_status: payment.status || 'paid',
      customer_name: registeredName,
      customer_email: registeredEmail,
      customer_phone: registeredPhone,
      payment_method: (payment as any).method || 'online',
      amount_paid_inr: payment.amount ? Number(payment.amount) / 100 : undefined,
    }

    if (itemType === 'storage_pack' && packId) {
      await addStoragePackToUser(authenticatedUserId, packId, metadataExtra)
    } else if (planTier === 'elite') {
      await promoteUserPlan(authenticatedUserId, 'elite', metadataExtra)
    } else {
      await promoteUserPlan(authenticatedUserId, 'pro', metadataExtra)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Payment verified and confirmed successfully',
      itemType,
      planTier: itemType === 'subscription' ? planTier : undefined,
      packId: itemType === 'storage_pack' ? packId : undefined,
      order_id,
      payment_id,
      transaction_status: payment.status || 'paid',
      customer_email: registeredEmail,
    })

    response.cookies.delete('filemind_plan')
    response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })

    return response
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Payment signature verification error' },
      { status: 500 }
    )
  }
}
