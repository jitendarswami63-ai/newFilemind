import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'
import { PLAN_CONFIGS, STORAGE_PACKS } from '@/lib/subscription/plans'
import { getLivePlanConfigs } from '@/lib/subscription/dynamic-plans'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { planTier, packId, currency = 'INR', notes = {} } = body

    const liveConfig = await getLivePlanConfigs().catch(() => null)
    const activePlans = liveConfig?.plans || PLAN_CONFIGS
    const activePacks = liveConfig?.storagePacks || STORAGE_PACKS

    let amountInPaise: number | null = null
    let orderDescription = 'FileMind Order'

    if (planTier && activePlans[planTier as keyof typeof activePlans]) {
      const plan = activePlans[planTier as keyof typeof activePlans]
      amountInPaise = plan.priceINR * 100
      orderDescription = `${plan.name} Subscription`
      notes.type = 'subscription'
      notes.planTier = planTier
    } else if (packId && activePacks[packId]) {
      const pack = activePacks[packId]
      amountInPaise = pack.priceINR * 100
      orderDescription = `${pack.name} Storage Add-on`
      notes.type = 'storage_pack'
      notes.packId = packId
    } else if (typeof body.amount === 'number' && body.amount > 0) {
      amountInPaise = body.amount > 1000 ? Math.round(body.amount) : Math.round(body.amount * 100)
      orderDescription = body.planName || 'FileMind Service'
      notes.type = body.type || 'custom'
    } else {
      const defaultPro = activePlans.pro || PLAN_CONFIGS.pro
      amountInPaise = defaultPro.priceINR * 100
      orderDescription = `${defaultPro.name} Subscription`
      notes.type = 'subscription'
      notes.planTier = 'pro'
    }

    if (!amountInPaise || amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1.00 (100 paise)' },
        { status: 400 }
      )
    }

    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const customerEmail = body.userEmail || user?.email
      const customerName = body.userName || user?.user_metadata?.full_name

      if (customerEmail) notes.customerEmail = customerEmail
      if (customerName) notes.customerName = customerName
      if (user?.id) notes.userId = user.id
    } catch {}

    const receipt =
      body.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
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

    const keyId = (
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      ''
    )
      .replace(/^["']|["']$/g, '')
      .trim()

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
