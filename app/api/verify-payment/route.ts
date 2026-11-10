import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { promoteUserToPro } from '@/lib/subscription/plan-server'

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
        { error: 'Server configuration error: missing secret' },
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
        { success: false, error: 'Signature mismatch' },
        { status: 400 }
      )
    }

    // Try to associate with logged-in user if available
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const targetUserId = body.userId || user?.id
      if (targetUserId) {
        await promoteUserToPro(targetUserId, {
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
          plan_activated_at: new Date().toISOString(),
        })
      }
    } catch (authErr) {
      console.warn('[Razorpay Verify] Could not auto-promote user session:', authErr)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Payment signature verified successfully',
      is_pro: true,
      plan: 'pro',
      order_id,
      payment_id,
    })

    // Set cookie so immediate page transitions recognize Pro
    response.cookies.set('filemind_plan', 'pro', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    })

    return response
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
