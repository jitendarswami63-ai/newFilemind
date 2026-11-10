import Razorpay from 'razorpay'
import crypto from 'crypto'

function cleanKey(val?: string): string {
  if (!val) return ''
  return val.replace(/^["']|["']$/g, '').trim()
}

export function getRazorpayClient(): Razorpay {
  const keyId = cleanKey(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)
  const keySecret = cleanKey(process.env.RAZORPAY_KEY_SECRET)

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export interface CreateOrderParams {
  amount: number
  currency?: string
  receipt?: string
  notes?: Record<string, string>
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const razorpay = getRazorpayClient()
  const currency = params.currency || 'INR'

  // Convert to paise/smallest currency unit
  const amountInSmallestUnit = Math.round(params.amount * 100)

  const order = await razorpay.orders.create({
    amount: amountInSmallestUnit,
    currency,
    receipt: params.receipt || `rcpt_${Date.now()}`,
    notes: params.notes || {},
  })

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
  }
}

export interface VerifySignatureParams {
  orderId: string
  paymentId: string
  signature: string
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: VerifySignatureParams): boolean {
  const secret = cleanKey(process.env.RAZORPAY_KEY_SECRET)
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured.')
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  )
}
