import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'
import { PLAN_CONFIGS, STORAGE_PACKS } from '@/lib/subscription/plans'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { planTier, packId, currency = 'INR', notes = {} } = body

    let amountInPaise: number | null = null
    let orderDescription = 'FileMind Order'

    if (planTier && PLAN_CONFIGS[planTier as keyof typeof PLAN_CONFIGS]) {
      const plan = PLAN_CONFIGS[planTier as keyof typeof PLAN_CONFIGS]
      amountInPaise = plan.priceINR * 100
      orderDescription = `${plan.name} Subscription`
      notes.type = 'subscription'
      notes.planTier = planTier
    } else if (packId && STORAGE_PACKS[packId]) {
      const pack = STORAGE_PACKS[packId]
      amountInPaise = pack.priceINR * 100
      orderDescription = `${pack.name} Storage Add-on`
      notes.type = 'storage_pack'
      notes.packId = packId
    } else if (typeof body.amount === 'number' && body.amount > 0) {
      amountInPaise = body.amount > 1000 ? Math.round(body.amount) : Math.round(body.amount * 100)
      orderDescription = body.planName || 'FileMind Service'
      notes.type = body.type || 'custom'
    } else {
      amountInPaise = 24900
      orderDescription = 'Pro Intelligence Subscription'
      notes.type = 'subscription'
      notes.planTier = 'pro'
    }

    if (!amountInPaise || amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1.00 (100 paise)' },
        { status: 400 }
      )
    }

    const receipt = body.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const razorpay = getRazorpayClient()

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        description: orderDescription,
        ...notes,
      },
    })

    const keyId = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '').replace(/^["']|["']$/g, '').trim()

    return NextResponse.json({
      order_id: order.id,
      orderId: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      keyId: keyId,
      description: orderDescription,
    })
  } catch (error: any) {
    console.error('[Razorpay Create Order Error]:', error)
    if (error?.statusCode === 401 || error?.error?.code === 'BAD_REQUEST_ERROR') {
      return NextResponse.json(
        { error: error.error?.description || 'Razorpay authentication failed' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
