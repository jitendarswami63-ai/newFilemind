'use client'

import React, { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  Laptop,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BiometricEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function getDefaultDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Biometric Authenticator'
  if (navigator.userAgent.includes('Windows')) return 'Windows PC (Windows Hello)'
  if (navigator.userAgent.includes('Macintosh')) return 'MacBook (Touch ID)'
  return 'Biometric Authenticator'
}

export function BiometricEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
}: BiometricEnrollmentModalProps) {
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const optRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
      })
      if (!optRes.ok) {
        const data = await optRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to initialize biometric enrollment')
      }
      const { options, challengeToken } = await optRes.json()

      let attResp
      try {
        attResp = await startRegistration({ optionsJSON: options })
      } catch (authErr: unknown) {
        const msg = authErr instanceof Error ? authErr.message : String(authErr)
        if (msg.includes('NotAllowedError') || msg.includes('cancel') || msg.includes('aborted')) {
          throw new Error('Biometric registration was cancelled by user or timed out.')
        }
        throw new Error(`Platform authenticator error: ${msg}`)
      }

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attResp,
          registrationResponse: attResp,
          challengeToken,
          deviceName: deviceName.trim() || 'Biometric Authenticator',
        }),
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.error || 'Biometric credential verification failed')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Biometric enrollment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1D21]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFCF5] rounded-3xl shadow-2xl border border-[#E5DED1] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5DED1]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292720]">Enroll Biometric Key</h3>
              <p className="text-xs text-[#777064]">Windows Hello / Touch ID / Platform PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-[#777064] hover:text-[#292720] rounded-xl hover:bg-[#F8F4EA] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB] flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-[#292720]">Authenticator Registered!</p>
              <p className="text-xs text-[#777064]">
                This device can now unlock and decrypt your protected documents.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#B91C1C] flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="device-name-input" className="block text-xs font-semibold text-[#292720]">
                  Device Label
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777064]">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <input
                    id="device-name-input"
                    type="text"
                    required
                    maxLength={50}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Work PC Windows Hello"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FFFCF5] border border-[#E5DED1] rounded-xl text-xs sm:text-sm text-[#292720] placeholder-[#777064]/60 focus:outline-hidden focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25"
                  />
                </div>
                <p className="text-[11px] text-[#777064]">
                  A descriptive name to identify which laptop or phone this key belongs to.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8F4EA] border border-[#E5DED1] space-y-2 text-xs text-[#777064]">
                <div className="flex items-center gap-2 font-semibold text-[#292720]">
                  <ShieldCheck className="h-4 w-4 text-[#1E7E34]" />
                  <span>Hardware-Bound Security</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  When you click Enroll, your browser will invoke Windows Hello or your device biometric reader. The private key never leaves your device TPM.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !deviceName.trim()}
                  className="rounded-xl text-xs bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] font-semibold flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Waiting for Device...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4" />
                      <span>Start Biometric Prompt</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
