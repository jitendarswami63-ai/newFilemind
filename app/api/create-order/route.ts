import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    let amount = body.amount ?? 5000
    const currency = body.currency || 'INR'
    const receipt = body.receipt || `rcpt_${Date.now()}`

    if (typeof amount !== 'number' || isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Minimum amount: 100 paise (₹1.00)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise (₹1.00)' },
        { status: 400 }
      )
    }

    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes: body.notes || {},
    })

    return NextResponse.json({
      order_id: order.id,
      orderId: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error('[Razorpay Create Order Error]:', error)
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()

    if (error?.statusCode === 401 || error?.error?.code === 'BAD_REQUEST_ERROR') {
      return NextResponse.json(
        {
          error: error.error?.description || 'Razorpay authentication failed',
          details: `Configured KeyId starts with '${keyId.substring(0, 10)}...' (length ${keyId.length}), Secret length ${keySecret.length}`,
        },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
