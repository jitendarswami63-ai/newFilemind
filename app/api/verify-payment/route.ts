import { NextResponse } from 'next/server'
import crypto from 'crypto'

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

    const secret = process.env.RAZORPAY_KEY_SECRET
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

    return NextResponse.json({
      success: true,
      message: 'Payment signature verified successfully',
      order_id,
      payment_id,
    })
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
