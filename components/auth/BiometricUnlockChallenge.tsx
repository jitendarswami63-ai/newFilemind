'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startAuthentication } from '@simplewebauthn/browser'
import {
  Lock,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BiometricUnlockChallengeProps {
  documentId: string
  documentTitle?: string
  onUnlocked?: () => void
}

export function BiometricUnlockChallenge({
  documentId,
  documentTitle,
  onUnlocked,
}: BiometricUnlockChallengeProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noPasskeyDetected, setNoPasskeyDetected] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // Fallback unlock state (account password / TOTP code)
  const [showFallback, setShowFallback] = useState(false)
  const [fallbackPassword, setFallbackPassword] = useState('')
  const [fallbackTotp, setFallbackTotp] = useState('')
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [fallbackError, setFallbackError] = useState<string | null>(null)

  const handleBiometricAuth = async () => {
    setError(null)
    setNoPasskeyDetected(false)
    setLoading(true)

    try {
      const optRes = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      const optData = await optRes.json().catch(() => ({}))
      if (!optRes.ok) {
        throw new Error(optData.error || 'Failed to initialize biometric challenge')
      }
      const { options, challengeToken } = optData

      let asseResp
      try {
        asseResp = await startAuthentication({ optionsJSON: options })
      } catch (authErr: unknown) {
        const errObj = authErr instanceof Error ? authErr : null
        const errName = errObj?.name || ''
        const msg = (errObj ? errObj.message : String(authErr)).toLowerCase()

        if (
          errName === 'NotAllowedError' ||
          msg.includes('not allowed') ||
          msg.includes('timed out') ||
          msg.includes('cancel') ||
          msg.includes('abort')
        ) {
          setNoPasskeyDetected(true)
          setShowFallback(true)
          throw new Error('No passkey found for this domain on this device, or the prompt was closed. You can enroll this device in Settings or unlock using your account credentials below.')
        }

        if (errName === 'SecurityError' || msg.includes('origin') || msg.includes('rpid')) {
          setNoPasskeyDetected(true)
          setShowFallback(true)
          throw new Error('Security context mismatch. Please enroll this device on the current domain in Settings.')
        }

        throw new Error(errObj?.message || 'Biometric verification was not completed.')
      }

      const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: asseResp,
          authenticationResponse: asseResp,
          challengeToken,
          documentId,
        }),
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.error || 'Biometric authorization failed')
      }

      setUnlocked(true)
      setTimeout(() => {
        if (onUnlocked) {
          onUnlocked()
        } else {
          router.refresh()
          window.location.reload()
        }
      }, 600)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Biometric verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFallbackUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setFallbackError(null)
    setFallbackLoading(true)

    try {
      const res = await fetch(`/api/documents/${documentId}/recovery-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: fallbackPassword,
          totpCode: fallbackTotp,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unlock with security credentials')
      }

      setUnlocked(true)
      setTimeout(() => {
        if (onUnlocked) {
          onUnlocked()
        } else {
          router.refresh()
          window.location.reload()
        }
      }, 600)
    } catch (err: unknown) {
      setFallbackError(err instanceof Error ? err.message : 'Unlock failed')
    } finally {
      setFallbackLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-[#FFFCF5] rounded-3xl p-8 border border-[#E5DED1] shadow-sm relative overflow-hidden">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5">
          <div className="h-16 w-16 rounded-3xl bg-[#FEF8EC] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shadow-2xs">
            {unlocked ? (
              <CheckCircle2 className="h-8 w-8 text-[#1E7E34] animate-in zoom-in-75 duration-300" />
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#9C7D47] border-2 border-[#FFFCF5] flex items-center justify-center text-[#FFFCF5] shadow-xs">
            <Fingerprint className="h-3.5 w-3.5" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-[#292720] mb-1.5">
          {unlocked ? 'Biometric Authorized' : 'Biometric Vault Protected'}
        </h3>
        <p className="text-xs text-[#777064] max-w-sm mb-6 leading-relaxed">
          {unlocked
            ? 'Decryption lease established. Decrypting document contents...'
            : 'This document is encrypted with AES-256-GCM. Authenticate with Windows Hello, fingerprint, or device PIN to obtain an ephemeral 15-minute lease.'}
        </p>

        {documentTitle && (
          <div className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F8F4EA] border border-[#E5DED1] mb-6 text-left">
            <FileText className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#292720] truncate" title={documentTitle}>
              {documentTitle}
            </span>
          </div>
        )}

        {error && (
          <div className="w-full p-4 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#B91C1C] flex items-start gap-3 mb-6 text-left">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
            <div className="flex-1 space-y-2">
              <span className="font-semibold block">Authentication Notice</span>
              <p className="leading-relaxed">{error}</p>
              {noPasskeyDetected && (
                <div className="pt-2 border-t border-[#F8D7DA]/60 flex flex-wrap gap-2 items-center">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9C7D47] text-[#FFFCF5] text-xs font-semibold hover:bg-[#856837] transition-colors"
                  >
                    <span>+ Enroll This Device in Settings</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-full space-y-3">
          <Button
            type="button"
            onClick={
              unlocked
                ? () => {
                    if (onUnlocked) {
                      onUnlocked()
                    } else {
                      router.refresh()
                      window.location.reload()
                    }
                  }
                : handleBiometricAuth
            }
            disabled={loading || fallbackLoading}
            className="w-full h-12 rounded-2xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] font-semibold flex items-center justify-center gap-2.5 shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Scanning Platform Authenticator...</span>
              </>
            ) : unlocked ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#FFFCF5]" />
                <span>Vault Lease Active — Opening Document...</span>
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4" />
                <span>Unlock with Windows Hello / Biometrics</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#777064]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1E7E34]" />
            <span>FIDO2 / WebAuthn Level 3 Authenticator Bound</span>
          </div>

          {!unlocked && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowFallback(!showFallback)}
                className="text-xs font-semibold text-[#9C7D47] hover:text-[#856837] underline cursor-pointer"
              >
                {showFallback ? 'Hide account credentials option' : "Can't use Windows Hello on this domain? Unlock with Password / TOTP"}
              </button>

              {showFallback && (
                <form onSubmit={handleFallbackUnlock} className="mt-4 p-4 rounded-2xl bg-[#F8F4EA] border border-[#E5DED1] text-left space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#292720]">
                    <KeyRound className="h-4 w-4 text-[#9C7D47]" />
                    <span>Emergency Vault Unlock (Document Owner)</span>
                  </div>
                  <p className="text-[11px] text-[#777064]">
                    Enter your FileMind account password or 6-digit TOTP code to establish a temporary 15-minute decryption lease.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292720] mb-1">
                      Account Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your account password"
                      value={fallbackPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFallbackPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] text-xs h-9 text-[#292720] focus:outline-none focus:ring-1 focus:ring-[#9C7D47]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292720] mb-1">
                      Or 6-Digit Authenticator (TOTP) Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      maxLength={6}
                      value={fallbackTotp}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFallbackTotp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] text-xs h-9 font-mono tracking-widest text-[#292720] focus:outline-none focus:ring-1 focus:ring-[#9C7D47]"
                    />
                  </div>

                  {fallbackError && (
                    <div className="text-[11px] text-[#B91C1C] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{fallbackError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={fallbackLoading || (!fallbackPassword && !fallbackTotp)}
                    className="w-full h-9 rounded-xl bg-[#292720] hover:bg-[#1B1D21] text-[#FFFCF5] text-xs font-semibold"
                  >
                    {fallbackLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      'Unlock Document'
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
