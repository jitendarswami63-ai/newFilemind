'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, CheckCircle2, Crown, ArrowRight } from 'lucide-react'

declare global {
  interface Window {
    Razorpay?: any
  }
}

interface RazorpayCheckoutButtonProps {
  planTier?: 'pro' | 'elite'
  packId?: 'pack_1gb' | 'pack_5gb' | 'pack_10gb'
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
  planTier,
  packId,
  amount,
  currency = 'INR',
  planName,
  buttonText,
  className = '',
  onSuccess,
  userEmail,
  userName,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const defaultAmount = planTier === 'elite' ? 499 : 249
  const effectiveAmount = amount ?? defaultAmount
  const effectivePlanName = planName || (planTier === 'elite' ? 'Elite Intelligence' : 'Pro Intelligence')
  const effectiveButtonText = buttonText || `Pay ₹${effectiveAmount} with Razorpay`

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

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          packId,
          amount: effectiveAmount,
          currency,
          planName: effectivePlanName,
        }),
      })

      const data = await res.json()
      if (!res.ok || (!data.order_id && !data.orderId)) {
        throw new Error(data.error || 'Unable to initiate payment order')
      }

      const orderId = data.order_id || data.orderId
      const keyId = data.key_id || data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      const options = {
        key: keyId,
        amount: data.amount,
        currency: data.currency || currency,
        name: 'FileMind',
        description: data.description || `${effectivePlanName} Order`,
        image: '/filemind-ai-pdf-manager-logo.png',
        order_id: orderId,
        handler: async function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                planTier,
                packId,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              window.dispatchEvent(new Event('filemind_plan_changed'))
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
        setErrorMsg(resp.error?.description || 'Payment transaction failed or cancelled.')
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initiating Razorpay checkout.')
      setLoading(false)
    }
  }

  if (paymentSuccess) {
    return (
      <div className="p-4 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] text-[#1E7E34] space-y-2 text-center animate-in fade-in duration-200">
        <div className="flex items-center justify-center gap-2 font-bold text-sm">
          <CheckCircle2 className="h-5 w-5 text-[#28A745]" />
          <span>Payment Verified & Confirmed!</span>
        </div>
        <p className="text-xs text-[#28A745]">
          Reference ID: <span className="font-mono font-medium">{paymentSuccess}</span>
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#28A745] hover:bg-[#218838] transition-colors"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer'
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#FFFCF5]" />
            <span>Connecting to Razorpay...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-[#F6E27A]" />
            <span>{effectiveButtonText}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] text-xs">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
