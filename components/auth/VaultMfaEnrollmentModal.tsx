'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  RefreshCw,
  Smartphone,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VaultMfaEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function formatQrSvg(raw: string): string {
  if (!raw) return ''
  let clean = raw
  if (clean.startsWith('data:image/svg+xml;utf-8,')) {
    clean = clean.slice('data:image/svg+xml;utf-8,'.length)
  }
  try {
    clean = decodeURIComponent(clean)
  } catch {}
  if (clean.includes('<svg') && !clean.includes('viewBox')) {
    clean = clean.replace(
      /<svg([^>]*)width="(\d+)"\s+height="(\d+)"/,
      '<svg$1width="$2" height="$3" viewBox="0 0 $2 $3" shape-rendering="crispEdges"'
    )
  }
  return clean
}

export function VaultMfaEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
}: VaultMfaEnrollmentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null)
  const [secretKey, setSecretKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false

    const enrollFactor = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const { data: existingFactors } = await supabase.auth.mfa.listFactors()
        if (existingFactors?.all) {
          for (const factor of existingFactors.all) {
            if (factor.status === 'unverified') {
              await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => {})
            }
          }
        }

        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'FileMind',
          friendlyName: 'FileMind Authenticator',
        })

        if (enrollError) {
          throw enrollError
        }

        if (!isCancelled && data) {
          setFactorId(data.id)
          setQrCodeSvg(data.totp?.qr_code || null)
          setSecretKey(data.totp?.secret || null)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize 2FA enrollment.')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    enrollFactor()

    return () => {
      isCancelled = true
    }
  }, [isOpen])

  const handleCopySecret = async () => {
    if (!secretKey) return
    try {
      await navigator.clipboard.writeText(secretKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    } catch {
      setError('Failed to copy to clipboard.')
    }
  }

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText('FileMind')
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2000)
    } catch {
      setError('Failed to copy account name.')
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError(null)
    setVerificationCode('')

    try {
      const supabase = createClient()

      if (factorId) {
        await supabase.auth.mfa.unenroll({ factorId }).catch(() => {})
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'FileMind',
        friendlyName: 'FileMind Authenticator',
      })

      if (enrollError) {
        throw enrollError
      }

      if (data) {
        setFactorId(data.id)
        setQrCodeSvg(data.totp?.qr_code || null)
        setSecretKey(data.totp?.secret || null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate factor.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = verificationCode.trim().replace(/\s+/g, '')

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit code from Google Authenticator.')
      return
    }

    if (!factorId) {
      setError('Factor initialization incomplete. Please click regenerate.')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const supabase = createClient()

      let verifySuccess = false
      const { error: cvErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      })

      if (!cvErr) {
        verifySuccess = true
      } else {
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId,
        })

        if (challengeErr) {
          throw challengeErr
        }

        const { error: verifyErr } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: cleanCode,
        })

        if (verifyErr) {
          throw verifyErr
        }
        verifySuccess = true
      }

      if (verifySuccess) {
        await supabase.auth.refreshSession()
        router.refresh()
        onSuccess()
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.toLowerCase().includes('invalid totp') ||
        msg.toLowerCase().includes('invalid code') ||
        msg.toLowerCase().includes('invalid')
      ) {
        setError(
          'Invalid TOTP code. Please make sure: (1) You enter the current 6-digit code for "FileMind", and (2) Your phone time is set to "Automatic".'
        )
      } else {
        setError(msg)
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleCancel = async () => {
    if (factorId && !verifying) {
      try {
        const supabase = createClient()
        await supabase.auth.mfa.unenroll({ factorId })
      } catch {}
    }
    setFactorId(null)
    setQrCodeSvg(null)
    setSecretKey(null)
    setVerificationCode('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1D21]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] shadow-2xl p-6 sm:p-7 space-y-4 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#292720] tracking-tight">
                Enable Vault 2FA
              </h3>
              <p className="text-xs text-[#777064] mt-0.5">
                Google Authenticator (TOTP)
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={verifying}
            className="p-1 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-start gap-2.5 text-[#B91C1C] text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#777064]">
            <Loader2 className="h-8 w-8 animate-spin text-[#9C7D47]" />
            <p className="text-xs font-medium">Generating secure QR code...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-1 p-1 bg-[#F8F4EA] border border-[#E5DED1] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-[#FFFCF5] text-[#292720] shadow-2xs border border-[#E5DED1]'
                    : 'text-[#777064] hover:text-[#292720]'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Scan QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-[#FFFCF5] text-[#292720] shadow-2xs border border-[#E5DED1]'
                    : 'text-[#777064] hover:text-[#292720]'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Enter Key Manually</span>
              </button>
            </div>

            {activeTab === 'qr' && (
              <div className="flex flex-col items-center justify-center p-4 bg-[#F8F4EA] rounded-2xl border border-[#E5DED1] space-y-3">
                <div className="bg-[#FFFCF5] p-3.5 rounded-xl shadow-2xs border border-[#E5DED1] flex items-center justify-center">
                  {qrCodeSvg ? (
                    <div
                      className="w-56 h-56 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                      style={{ imageRendering: 'pixelated' }}
                      dangerouslySetInnerHTML={{ __html: formatQrSvg(qrCodeSvg) }}
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-[#777064]">
                      <QrCode className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between w-full px-1 text-[11px] text-[#777064]">
                  <span className="inline-flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-[#777064]" />
                    Scan with Google Authenticator
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1 text-[#9C7D47] hover:text-[#856837] font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="p-4 bg-[#F8F4EA] rounded-2xl border border-[#E5DED1] space-y-3 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-[#292720]">
                    How to add in Google Authenticator:
                  </p>
                  <ol className="list-decimal list-inside text-[#777064] space-y-1 text-[11px] leading-relaxed">
                    <li>Tap the <strong>+</strong> button at the bottom right.</li>
                    <li>Select <strong>Enter a setup key</strong>.</li>
                    <li>Fill in the fields below and tap <strong>Add</strong>:</li>
                  </ol>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="p-2.5 bg-[#FFFCF5] rounded-xl border border-[#E5DED1] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#777064] block tracking-wider">
                        Account Name
                      </span>
                      <span className="font-semibold text-[#292720]">FileMind</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="text-[11px] font-semibold text-[#9C7D47] hover:text-[#856837] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="h-3 w-3 text-[#1E7E34]" />
                          <span className="text-[#1E7E34]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 bg-[#FFFCF5] rounded-xl border border-[#E5DED1] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#777064] block tracking-wider">
                        Your Key
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="text-[11px] font-semibold text-[#9C7D47] hover:text-[#856837] inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="h-3 w-3 text-[#1E7E34]" />
                            <span className="text-[#1E7E34]">Key Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-[#292720] font-semibold tracking-wider break-all select-all bg-[#F8F4EA] p-1.5 rounded-lg border border-[#E5DED1]">
                      {secretKey || 'Generating...'}
                    </div>
                  </div>

                  <div className="px-1 text-[11px] text-[#777064]">
                    Type of key: <strong>Time based</strong> (default)
                  </div>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-[#FAF5EC] rounded-xl border border-[#E5DED1] flex items-start gap-2 text-[11px] text-[#777064] leading-relaxed">
              <Info className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0 mt-0.5" />
              <span>
                If you have old <strong>FileMind</strong> or <strong>localhost</strong> entries in Google Authenticator, delete them first to avoid typing an expired code.
              </span>
            </div>

            <form onSubmit={handleVerify} className="space-y-3 pt-1">
              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-xs font-semibold text-[#292720] mb-1"
                >
                  Enter the 6-digit code shown in your app
                </label>
                <input
                  ref={inputRef}
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setVerificationCode(val)
                    if (error) setError(null)
                  }}
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 px-3 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] focus:outline-hidden focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all text-[#292720] placeholder:text-[#DDD5C7] shadow-2xs"
                  disabled={verifying}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={verifying}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
