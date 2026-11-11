import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { promoteUserPlan, addStoragePackToUser } from '@/lib/subscription/plan-server'
import { getRazorpayClient } from '@/lib/payments/razorpay'

export async function POST(req: Request) {
  try {
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

    let orderNotes: Record<string, any> = {}
    try {
      const razorpay = getRazorpayClient()
      const order = await razorpay.orders.fetch(order_id)
      orderNotes = order.notes || {}
    } catch (orderFetchErr) {
      console.warn('[Razorpay Verify] Could not fetch order notes, falling back to body:', orderFetchErr)
    }

    const itemType = orderNotes.type || body.type || 'subscription'
    const planTier = orderNotes.planTier || body.planTier || (body.planName?.toLowerCase().includes('elite') ? 'elite' : 'pro')
    const packId = orderNotes.packId || body.packId

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const targetUserId = body.userId || user?.id

    if (targetUserId) {
      if (itemType === 'storage_pack' && packId) {
        await addStoragePackToUser(targetUserId, packId, {
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
        })
      } else if (planTier === 'elite') {
        await promoteUserPlan(targetUserId, 'elite', {
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
        })
      } else {
        await promoteUserPlan(targetUserId, 'pro', {
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
        })
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
