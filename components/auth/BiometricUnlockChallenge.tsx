'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startAuthentication } from '@simplewebauthn/browser'
import {
  Lock,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
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
  const [unlocked, setUnlocked] = useState(false)

  const handleBiometricAuth = async () => {
    setError(null)
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
        const msg = authErr instanceof Error ? authErr.message : String(authErr)
        if (msg.includes('NotAllowedError') || msg.includes('cancel') || msg.includes('aborted')) {
          throw new Error('Biometric verification was cancelled by user.')
        }
        throw new Error(`Device authentication error: ${msg}`)
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
          <div className="w-full p-3.5 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#B91C1C] flex items-start gap-2.5 mb-6 text-left">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Authentication Failed</span>
              <span>{error}</span>
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
            disabled={loading}
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
        </div>
      </div>
    </div>
  )
}
