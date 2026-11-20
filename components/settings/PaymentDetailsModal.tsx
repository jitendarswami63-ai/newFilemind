'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  Receipt,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  CreditCard,
  HardDrive,
  Crown,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { formatINR } from '@/lib/subscription/plans'

export interface PaymentItem {
  id?: string
  type?: string
  planTier?: string
  planName?: string
  packId?: string
  packName?: string
  amountINR?: number
  date?: string
  orderId?: string
  paymentId?: string
  status?: string
  [key: string]: any
}

interface PaymentDetailsModalProps {
  payment: PaymentItem | null
  onClose: () => void
  userEmail?: string
  userName?: string
}

export function PaymentDetailsModal({
  payment,
  onClose,
  userEmail,
  userName,
}: PaymentDetailsModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [liveDetails, setLiveDetails] = useState<Record<string, any> | null>(null)
  const [loadingLive, setLoadingLive] = useState(false)

  useEffect(() => {
    if (!payment?.paymentId) return
    let ignore = false
    setLoadingLive(true)

    fetch(`/api/payments/details?paymentId=${encodeURIComponent(payment.paymentId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data?.success && data?.liveDetails) {
          setLiveDetails(data.liveDetails)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingLive(false)
      })

    return () => {
      ignore = true
    }
  }, [payment?.paymentId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!payment) return null

  const handleCopy = (text: string, key: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const paymentDate = payment.date ? new Date(payment.date) : new Date()
  const formattedDate = paymentDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = paymentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const amount =
    payment.amountINR ||
    (payment.type === 'subscription'
      ? payment.planTier === 'elite'
        ? 499
        : 249
      : 49)

  const itemName =
    payment.packName ||
    payment.planName ||
    (payment.type === 'subscription'
      ? payment.planTier === 'elite'
        ? 'Elite Intelligence Subscription'
        : 'Pro Intelligence Subscription'
      : 'Additional 1 GB Storage Pack')

  const invoiceNumber = `RCPT-${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${(payment.paymentId || payment.id || 'TX').slice(-6).toUpperCase()}`

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=850')
    if (!printWindow) {
      window.print()
      return
    }
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${payment.paymentId || invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #292720; background: #fff; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5DED1; padding-bottom: 20px; margin-bottom: 24px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #9C7D47; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: #777064; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 12px; background: #EBF7EE; color: #1E7E34; border: 1px solid #C3E6CB; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .box { background: #FAF5EC; border: 1px solid #E5DED1; border-radius: 8px; padding: 12px 14px; }
    .label { font-size: 11px; color: #777064; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .val { font-size: 13px; font-weight: 700; color: #292720; font-family: monospace; word-break: break-all; }
    .table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    .table th { text-align: left; padding: 10px; border-bottom: 1px solid #E5DED1; font-size: 11px; color: #777064; text-transform: uppercase; }
    .table td { padding: 12px 10px; border-bottom: 1px solid #FAF5EC; font-size: 13px; }
    .total-row { font-size: 15px; font-weight: 800; border-top: 2px solid #292720; }
    .footer { margin-top: 40px; border-top: 1px solid #E5DED1; padding-top: 16px; font-size: 11px; color: #777064; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">FILEMIND</div>
      <div class="brand-sub">AI-Powered Document & File Management Platform</div>
      <div style="font-size: 12px; color: #777064; margin-top: 6px;">www.filemindhub.xyz</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">Payment Paid & Verified</div>
      <div style="font-size: 12px; color: #777064; margin-top: 6px; font-weight: 600;">Receipt Ref: ${invoiceNumber}</div>
      <div style="font-size: 11px; color: #777064; margin-top: 2px;">Date: ${formattedDate} ${formattedTime}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="label">Billed To</div>
      <div style="font-weight: 700; color: #292720;">${userName || 'FileMind User'}</div>
      <div style="font-size: 12px; color: #777064;">${userEmail || 'N/A'}</div>
    </div>
    <div class="box">
      <div class="label">Payment Processing</div>
      <div style="font-weight: 700; color: #292720;">Razorpay Secure Gateway</div>
      <div style="font-size: 12px; color: #777064;">256-bit SSL Encrypted • PCI-DSS Level 1</div>
    </div>
    <div class="box">
      <div class="label">Payment ID</div>
      <div class="val">${payment.paymentId || 'N/A'}</div>
    </div>
    <div class="box">
      <div class="label">Order Reference</div>
      <div class="val">${payment.orderId || 'N/A'}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Category</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 600;">${itemName}</td>
        <td>${payment.type === 'subscription' ? 'Plan Tier Entitlement' : 'Vault Storage Capacity'}</td>
        <td style="text-align: right; font-weight: 700;">₹${amount.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Paid</td>
        <td>Verified Settlement</td>
        <td style="text-align: right; color: #9C7D47;">₹${amount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Thank you for choosing FileMind. This is a computer-generated payment receipt for your records.
  </div>
</body>
</html>`
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleCopyFullReceipt = () => {
    const text = `FILEMIND PAYMENT RECEIPT
Receipt Ref: ${invoiceNumber}
Date: ${formattedDate} ${formattedTime}
Status: Paid & Verified
Item: ${itemName}
Amount Paid: ₹${amount.toFixed(2)} (INR)
Payment ID: ${payment.paymentId || 'N/A'}
Order ID: ${payment.orderId || 'N/A'}
Billed To: ${userName || userEmail || 'FileMind User'}
Payment Gateway: Razorpay Secure`
    handleCopy(text, 'full_receipt')
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1B1D21]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 relative max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#E5DED1]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#292720]">
                Payment Details & Receipt
              </h3>
              <p className="text-xs text-[#777064]">
                Verified transaction processed via Razorpay Secure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#1E7E34]/15 flex items-center justify-center text-[#1E7E34] flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#1E7E34] uppercase tracking-wider">
                Payment Succeeded & Verified
              </div>
              <div className="text-xs text-[#1E7E34]/80">
                {formattedDate} at {formattedTime}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-extrabold text-[#1E7E34]">
              {formatINR(amount)}
            </div>
            <div className="text-[11px] text-[#1E7E34]/80 font-medium">
              Settled & Captured
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#777064]">
              <span>Payment ID</span>
              {payment.paymentId && (
                <button
                  type="button"
                  onClick={() => handleCopy(payment.paymentId || '', 'paymentId')}
                  className="inline-flex items-center gap-1 text-[#9C7D47] hover:underline cursor-pointer"
                >
                  {copiedKey === 'paymentId' ? (
                    <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                      <Check className="h-3 w-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="h-3 w-3" /> Copy
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="font-mono text-xs font-bold text-[#292720] break-all">
              {payment.paymentId || 'N/A'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#777064]">
              <span>Order Reference</span>
              {payment.orderId && (
                <button
                  type="button"
                  onClick={() => handleCopy(payment.orderId || '', 'orderId')}
                  className="inline-flex items-center gap-1 text-[#9C7D47] hover:underline cursor-pointer"
                >
                  {copiedKey === 'orderId' ? (
                    <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                      <Check className="h-3 w-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="h-3 w-3" /> Copy
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="font-mono text-xs font-bold text-[#292720] break-all">
              {payment.orderId || 'N/A'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#777064]">
            Purchased Item & Allocation
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {payment.type === 'subscription' ? (
                <Crown className="h-4 w-4 text-[#9C7D47]" />
              ) : (
                <HardDrive className="h-4 w-4 text-[#9C7D47]" />
              )}
              <span className="text-sm font-bold text-[#292720]">{itemName}</span>
            </div>
            <span className="text-sm font-extrabold text-[#9C7D47]">
              {formatINR(amount)}
            </span>
          </div>

          <div className="text-xs text-[#777064] space-y-1 pt-2 border-t border-[#E5DED1]">
            <div className="flex justify-between">
              <span>Category:</span>
              <span className="font-medium text-[#292720]">
                {payment.type === 'subscription'
                  ? 'Plan Tier Subscription'
                  : 'Vault Storage Add-on'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Account Email:</span>
              <span className="font-medium text-[#292720]">{userEmail || 'Active User'}</span>
            </div>
            <div className="flex justify-between">
              <span>Status in Vault:</span>
              <span className="font-semibold text-emerald-800">
                Applied & Available Immediately
              </span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#777064] flex items-center justify-between">
            <span>Payment Method & Processing</span>
            {loadingLive && <Loader2 className="h-3 w-3 animate-spin text-[#9C7D47]" />}
          </div>
          <div className="flex items-center justify-between text-[#292720]">
            <span className="text-[#777064]">Payment Method:</span>
            <span className="font-semibold capitalize">
              {liveDetails?.method === 'upi'
                ? `UPI (${liveDetails.vpa || 'Direct UPI'})`
                : liveDetails?.method === 'card'
                ? `${liveDetails.card?.network || ''} Card ending in ${liveDetails.card?.last4 || ''}`
                : liveDetails?.method || 'Razorpay Verified Payment (UPI/Card/NetBanking)'}
            </span>
          </div>
          {liveDetails?.acquirerData?.rrn && (
            <div className="flex items-center justify-between text-[#292720]">
              <span className="text-[#777064]">Bank Reference / RRN:</span>
              <span className="font-mono">{liveDetails.acquirerData.rrn}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[#292720]">
            <span className="text-[#777064]">Gateway Encryption:</span>
            <span className="inline-flex items-center gap-1 text-[#1E7E34] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Razorpay (PCI-DSS Level 1 Compliant)</span>
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFCF5] border border-[#E5DED1] space-y-1.5 text-xs">
          <div className="flex justify-between text-[#777064]">
            <span>Item Price</span>
            <span>₹{amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-[#292720] pt-1.5 border-t border-[#E5DED1]">
            <span>Total Paid</span>
            <span className="text-[#9C7D47]">₹{amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-[#9C7D47]" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopyFullReceipt}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {copiedKey === 'full_receipt' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700 font-bold" />
                  <span className="text-emerald-700 font-bold">Receipt Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#9C7D47]" />
                  <span>Copy Receipt</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
