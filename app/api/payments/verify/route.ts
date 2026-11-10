import { NextResponse } from 'next/server'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'

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

    return NextResponse.json({
      success: true,
      message: 'Payment verified and confirmed successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    })
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Payment signature verification error' },
      { status: 500 }
    )
  }
}
