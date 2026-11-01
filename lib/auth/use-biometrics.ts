'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  startRegistration,
  startAuthentication,
  platformAuthenticatorIsAvailable,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import type { BiometricCredential } from '@/types'

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [isPlatformAvailable, setIsPlatformAvailable] = useState<boolean>(false)
  const [credentials, setCredentials] = useState<BiometricCredential[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function checkAvailability() {
      try {
        const supported = browserSupportsWebAuthn()
        let platformAvailable = false
        if (supported) {
          platformAvailable = await platformAuthenticatorIsAvailable()
        }
        if (isMounted) {
          setIsSupported(supported)
          setIsPlatformAvailable(platformAvailable)
        }
      } catch {
        if (isMounted) {
          setIsSupported(false)
          setIsPlatformAvailable(false)
        }
      }
    }
    checkAvailability()
    return () => {
      isMounted = false
    }
  }, [])

  const loadCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/webauthn/credentials')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.credentials)) {
          setCredentials(data.credentials)
          return data.credentials
        }
      }
    } catch {}
    return []
  }, [])

  const registerBiometric = useCallback(async (deviceName?: string) => {
    setLoading(true)
    setError(null)
    try {
      const optRes = await fetch('/api/auth/webauthn/register/options', { method: 'POST' })
      if (!optRes.ok) {
        const optData = await optRes.json().catch(() => ({}))
        throw new Error(optData.error || 'Failed to start biometric registration')
      }
      const { options, challengeToken } = await optRes.json()

      const regResponse = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: regResponse,
          challengeToken,
          deviceName: deviceName || 'Windows Hello / Touch ID',
        }),
      })

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}))
        throw new Error(verifyData.error || 'Failed to verify biometric registration')
      }

      await loadCredentials()
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [loadCredentials])

  const authenticateBiometric = useCallback(async (documentId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const optRes = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      if (!optRes.ok) {
        const optData = await optRes.json().catch(() => ({}))
        throw new Error(optData.error || 'Failed to initialize biometric challenge')
      }
      const { options, challengeToken } = await optRes.json()

      const authResponse = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: authResponse,
          challengeToken,
          documentId,
        }),
      })

      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Biometric authentication verification failed')
      }

      return {
        success: true,
        leaseId: verifyData.leaseId,
        expiresAt: verifyData.expiresAt,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCredential = useCallback(async (credentialId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/webauthn/credentials?credentialId=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete credential')
      }
      await loadCredentials()
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [loadCredentials])

  const revokeLease = useCallback(async (documentId?: string) => {
    try {
      await fetch('/api/auth/webauthn/leases/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      return true
    } catch {
      return false
    }
  }, [])

  return {
    isSupported,
    isPlatformAvailable,
    credentials,
    loading,
    error,
    loadCredentials,
    registerBiometric,
    authenticateBiometric,
    deleteCredential,
    revokeLease,
  }
}
