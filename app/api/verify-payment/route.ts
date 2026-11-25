import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { promoteUserPlan, addStoragePackToUser } from '@/lib/subscription/plan-server'
import { getRazorpayClient } from '@/lib/payments/razorpay'
import { PLAN_CONFIGS, STORAGE_PACKS } from '@/lib/subscription/plans'
import { getLivePlanConfigs } from '@/lib/subscription/dynamic-plans'
import { isSameOrigin } from '@/lib/validation/origin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const order_id = typeof body.razorpay_order_id === 'string'
      ? body.razorpay_order_id.trim()
      : typeof body.order_id === 'string'
      ? body.order_id.trim()
      : ''
    const payment_id = typeof body.razorpay_payment_id === 'string'
      ? body.razorpay_payment_id.trim()
      : typeof body.payment_id === 'string'
      ? body.payment_id.trim()
      : ''
    const signature = typeof body.razorpay_signature === 'string'
      ? body.razorpay_signature.trim()
      : typeof body.signature === 'string'
      ? body.signature.trim()
      : ''

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

    const expectedBuf = Buffer.from(expectedSignature, 'utf8')
    const providedBuf = Buffer.from(signature, 'utf8')
    const isValid =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf)

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

    const orderNotes = (order.notes || {}) as Record<string, string | number | null>
    if (!orderNotes.userId || String(orderNotes.userId) !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Payment order does not belong to the authenticated user' },
        { status: 403 }
      )
    }

    if (String(order.currency || '').toUpperCase() !== 'INR' || String(payment.currency || '').toUpperCase() !== 'INR') {
      return NextResponse.json(
        { error: 'Invalid payment currency mismatch' },
        { status: 400 }
      )
    }

    const paidAmountPaise = Number(payment.amount)
    const orderAmountPaise = Number(order.amount)
    if (!Number.isFinite(paidAmountPaise) || !Number.isFinite(orderAmountPaise) || paidAmountPaise < orderAmountPaise) {
      return NextResponse.json(
        { error: 'Paid amount is less than the order amount' },
        { status: 400 }
      )
    }

    const itemType = String(orderNotes.type || '').trim()
    const planTier = orderNotes.planTier ? String(orderNotes.planTier).trim().toLowerCase() : ''
    const packId = orderNotes.packId ? String(orderNotes.packId).trim().toLowerCase() : ''

    const liveConfig = await getLivePlanConfigs().catch(() => null)
    const activePlans = liveConfig?.plans || PLAN_CONFIGS
    const activePacks = liveConfig?.storagePacks || STORAGE_PACKS

    let expectedAmountPaise = 0
    if (itemType === 'storage_pack' && packId && activePacks[packId]) {
      expectedAmountPaise = Math.round(activePacks[packId].priceINR * 100)
    } else if (itemType === 'subscription' && (planTier === 'pro' || planTier === 'elite')) {
      expectedAmountPaise = Math.round(activePlans[planTier].priceINR * 100)
    } else {
      return NextResponse.json(
        { error: 'Unrecognized or untrusted order item specification' },
        { status: 400 }
      )
    }

    if (expectedAmountPaise < 100 || paidAmountPaise < expectedAmountPaise) {
      return NextResponse.json(
        {
          error: 'Payment amount does not satisfy the authoritative price for this item.',
          expectedAmountPaise,
          paidAmountPaise,
        },
        { status: 400 }
      )
    }

    const existingHistory = Array.isArray(userMeta.billing_history)
      ? (userMeta.billing_history as Array<{ paymentId?: string; orderId?: string; status?: string }>)
      : []
    const alreadyProcessed = existingHistory.some(
      (tx) => tx.paymentId === payment_id || (tx.orderId === order_id && tx.status === 'paid')
    )

    if (alreadyProcessed) {
      const response = NextResponse.json({
        success: true,
        message: 'Payment verified and confirmed successfully (already processed)',
        itemType,
        planTier: itemType === 'subscription' ? planTier : undefined,
        packId: itemType === 'storage_pack' ? packId : undefined,
        order_id,
        payment_id,
        alreadyProcessed: true,
      })
      response.cookies.delete('filemind_plan')
      response.cookies.set('filemind_plan', '', { path: '/', expires: new Date(0) })
      return response
    }

    const registeredName = String(
      userMeta.full_name || userMeta.name || orderNotes.customerName || 'FileMind User'
    ).trim()
    const registeredEmail = user.email || String(orderNotes.customerEmail || '')
    const registeredPhone = String(
      user.phone || userMeta.phone || orderNotes.customerPhone || ''
    ).trim()

    const paymentObj = payment as { method?: string }
    const metadataExtra = {
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      transaction_status: payment.status || 'paid',
      customer_name: registeredName,
      customer_email: registeredEmail,
      customer_phone: registeredPhone,
      payment_method: paymentObj.method || 'online',
      amount_paid_inr: paidAmountPaise / 100,
    }

    if (itemType === 'storage_pack' && (packId === 'pack_1gb' || packId === 'pack_5gb' || packId === 'pack_10gb')) {
      const updated = await addStoragePackToUser(authenticatedUserId, packId, metadataExtra)
      if (!updated) {
        return NextResponse.json({ error: 'Failed to provision storage pack' }, { status: 500 })
      }
    } else if (planTier === 'elite' || planTier === 'pro') {
      const updated = await promoteUserPlan(authenticatedUserId, planTier, metadataExtra)
      if (!updated) {
        return NextResponse.json({ error: 'Failed to activate subscription plan' }, { status: 500 })
      }
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
  } catch (error: unknown) {
    console.error('[Razorpay Verify Error]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment signature verification error' },
      { status: 500 }
    )
  }
}
