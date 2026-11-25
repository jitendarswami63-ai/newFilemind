import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'
import { PLAN_CONFIGS, STORAGE_PACKS } from '@/lib/subscription/plans'
import { getLivePlanConfigs } from '@/lib/subscription/dynamic-plans'
import { createClient } from '@/lib/supabase/server'
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
          error: 'Authentication required. Please sign in to proceed with checkout.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const requestedTier = typeof body.planTier === 'string' ? body.planTier.trim().toLowerCase() : undefined
    const requestedPackId = typeof body.packId === 'string' ? body.packId.trim().toLowerCase() : undefined
    const requestedCurrency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'INR'

    if (requestedCurrency !== 'INR') {
      return NextResponse.json(
        { error: 'Unsupported currency. All plans and storage packs are billed in INR.' },
        { status: 400 }
      )
    }

    const liveConfig = await getLivePlanConfigs().catch(() => null)
    const activePlans = liveConfig?.plans || PLAN_CONFIGS
    const activePacks = liveConfig?.storagePacks || STORAGE_PACKS

    let amountInPaise: number | null = null
    let orderDescription = 'FileMind Order'
    let authoritativeType: 'subscription' | 'storage_pack' = 'subscription'
    let authoritativeTier: 'pro' | 'elite' | undefined
    let authoritativePackId: string | undefined

    if (requestedPackId) {
      const pack = activePacks[requestedPackId]
      if (!pack) {
        return NextResponse.json({ error: 'Invalid storage pack identifier' }, { status: 400 })
      }
      amountInPaise = Math.round(pack.priceINR * 100)
      orderDescription = `${pack.name} Storage Add-on`
      authoritativeType = 'storage_pack'
      authoritativePackId = pack.id
    } else if (requestedTier) {
      if (requestedTier !== 'pro' && requestedTier !== 'elite') {
        return NextResponse.json(
          { error: 'Invalid subscription tier. Only Pro or Elite plans are purchasable.' },
          { status: 400 }
        )
      }
      const plan = activePlans[requestedTier]
      amountInPaise = Math.round(plan.priceINR * 100)
      orderDescription = `${plan.name} Subscription`
      authoritativeType = 'subscription'
      authoritativeTier = requestedTier
    } else if (body.amount !== undefined) {
      return NextResponse.json(
        { error: 'Valid planTier or packId is required to initiate checkout.' },
        { status: 400 }
      )
    } else {
      const defaultPro = activePlans.pro || PLAN_CONFIGS.pro
      amountInPaise = Math.round(defaultPro.priceINR * 100)
      orderDescription = `${defaultPro.name} Subscription`
      authoritativeType = 'subscription'
      authoritativeTier = 'pro'
    }

    if (!amountInPaise || amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least ₹1.00 (100 paise)' },
        { status: 400 }
      )
    }

    const userMetadata = user.user_metadata || {}
    const registeredName =
      String(userMetadata.full_name || userMetadata.name || '').trim() || 'FileMind User'
    const registeredEmail = user.email || ''
    const registeredPhone = String(
      user.phone || userMetadata.phone || userMetadata.phone_number || ''
    ).trim()
    const userId = user.id

    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`
    const razorpay = getRazorpayClient()

    const safeClientNotes: Record<string, string> = {}
    if (body.notes && typeof body.notes === 'object' && !Array.isArray(body.notes)) {
      const reservedKeys = new Set([
        'userId',
        'user_id',
        'type',
        'planTier',
        'packId',
        'expectedAmountPaise',
        'expectedCurrency',
        'description',
        'customerName',
        'customerEmail',
        'customerPhone',
        'user_name',
        'user_email',
        'user_phone',
      ])
      for (const [k, v] of Object.entries(body.notes as Record<string, unknown>)) {
        if (!reservedKeys.has(k) && typeof v === 'string' && v.length <= 250) {
          safeClientNotes[k] = v
        }
      }
    }

    const orderNotes: Record<string, string> = {
      ...safeClientNotes,
      description: orderDescription,
      userId,
      user_id: userId,
      customerName: registeredName,
      customerEmail: registeredEmail,
      customerPhone: registeredPhone,
      user_name: registeredName,
      user_email: registeredEmail,
      user_phone: registeredPhone,
      type: authoritativeType,
      ...(authoritativeTier ? { planTier: authoritativeTier } : {}),
      ...(authoritativePackId ? { packId: authoritativePackId } : {}),
      expectedAmountPaise: String(amountInPaise),
      expectedCurrency: 'INR',
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
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
  } catch (error: unknown) {
    const errObj = error as { statusCode?: number; error?: { code?: string; description?: string }; message?: string }
    if (errObj?.statusCode === 401 || errObj?.error?.code === 'BAD_REQUEST_ERROR') {
      return NextResponse.json(
        { error: errObj.error?.description || 'Razorpay authentication failed' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
