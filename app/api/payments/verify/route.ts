import { NextResponse } from 'next/server'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { createClient } from '@/lib/supabase/server'
import { promoteUserToPro } from '@/lib/subscription/plan-server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required Razorpay verification parameters' },
        { status: 400 }
      )
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature verification failed' },
        { status: 400 }
      )
    }

    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const targetUserId = body.userId || user?.id
      if (targetUserId) {
        await promoteUserToPro(targetUserId, {
          razorpay_order_id,
          razorpay_payment_id,
          plan_activated_at: new Date().toISOString(),
        })
      }
    } catch (authErr) {
      console.warn('[Payments Verify] Could not auto-promote user session:', authErr)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Payment verified and confirmed successfully',
      is_pro: true,
      plan: 'pro',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    })

    // Wipe any generic browser cookie so other accounts never inherit Pro
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
