'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

declare global {
  interface Window {
    Razorpay?: any
  }
}

interface RazorpayCheckoutButtonProps {
  amount?: number
  currency?: string
  planName?: string
  buttonText?: string
  className?: string
  onSuccess?: (paymentId: string) => void
  userEmail?: string
  userName?: string
}

export function RazorpayCheckoutButton({
  amount = 499,
  currency = 'INR',
  planName = 'Pro Intelligence',
  buttonText = 'Upgrade with Razorpay',
  className = '',
  onSuccess,
  userEmail,
  userName,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true)
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePayment = async () => {
    setErrorMsg(null)
    setLoading(true)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.')
      }

      // Step 1: Create Order on backend
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency, planName }),
      })

      const data = await res.json()
      if (!res.ok || (!data.order_id && !data.orderId)) {
        throw new Error(data.error || 'Unable to initiate payment order')
      }

      const orderId = data.order_id || data.orderId
      const keyId = data.key_id || data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: keyId,
        amount: data.amount,
        currency: data.currency || currency,
        name: 'FileMind',
        description: `${planName} Subscription`,
        image: '/filemind-ai-pdf-manager-logo.png',
        order_id: orderId,
        handler: async function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          try {
            // Step 3: Verify payment signature on backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              setPaymentSuccess(response.razorpay_payment_id)
              onSuccess?.(response.razorpay_payment_id)
            } else {
              setErrorMsg(verifyData.error || 'Payment signature verification failed.')
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Error verifying payment.')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: userName || 'FileMind User',
          email: userEmail || 'contact@filemindhub.xyz',
        },
        theme: {
          color: '#9C7D47',
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp: any) {
        setErrorMsg(resp.error?.description || 'Payment failed. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      console.error('[Razorpay Checkout Error]:', err)
      setErrorMsg(err.message || 'Payment initiation failed')
      setLoading(false)
    }
  }

  if (paymentSuccess) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-xs font-semibold text-[#15803D]">
        <CheckCircle2 className="h-4 w-4" />
        <span>Paid Successfully! ID: {paymentSuccess.substring(0, 14)}...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs transition-colors cursor-pointer disabled:opacity-60'
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
