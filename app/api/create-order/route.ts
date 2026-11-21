import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'
import { PLAN_CONFIGS, STORAGE_PACKS } from '@/lib/subscription/plans'
import { getLivePlanConfigs } from '@/lib/subscription/dynamic-plans'
import { createClient } from '@/lib/supabase/server'

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
          error: 'Authentication required. Please sign in to proceed with checkout.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      )
    }

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

    const userMetadata = user.user_metadata || {}
    const registeredName = (userMetadata.full_name || userMetadata.name || body.userName || '').trim() || 'FileMind User'
    const registeredEmail = user.email || body.userEmail || ''
    const registeredPhone = (user.phone || userMetadata.phone || userMetadata.phone_number || body.userPhone || '').trim()
    const userId = user.id

    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`
    const razorpay = getRazorpayClient()

    const orderNotes = {
      description: orderDescription,
      userId,
      user_id: userId,
      customerName: registeredName,
      customerEmail: registeredEmail,
      customerPhone: registeredPhone,
      user_name: registeredName,
      user_email: registeredEmail,
      user_phone: registeredPhone,
      type: notes.type || (packId ? 'storage_pack' : 'subscription'),
      planTier: planTier || undefined,
      packId: packId || undefined,
      ...notes,
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: orderNotes,
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
      userId,
      customerName: registeredName,
      customerEmail: registeredEmail,
      customerPhone: registeredPhone,
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
