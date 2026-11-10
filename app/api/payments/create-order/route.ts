import { NextResponse } from 'next/server'
import { createRazorpayOrder } from '@/lib/payments/razorpay'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { amount = 499, currency = 'INR', planName = 'Pro Intelligence', notes = {} } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount specified' },
        { status: 400 }
      )
    }

    const orderData = await createRazorpayOrder({
      amount,
      currency,
      receipt: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        planName,
        ...notes,
      },
    })

    return NextResponse.json({
      success: true,
      ...orderData,
    })
  } catch (error: any) {
    console.error('[Razorpay Create Order Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
