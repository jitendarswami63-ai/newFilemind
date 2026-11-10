'use client'

import { useState, useEffect } from 'react'

export interface UserPlanInfo {
  isPro: boolean
  planName: 'Pro Intelligence' | 'Free Tier'
  tier: 'pro' | 'free'
  badgeLabel: string
}

/**
 * Authoritatively checks whether a user has an active Pro plan.
 * Verified strictly from Supabase user_metadata or secure server cookie.
 */
export function isUserPro(
  user?: { user_metadata?: Record<string, any> | null } | null,
  cookieValue?: string | null
): boolean {
  const meta = user?.user_metadata || {}
  const proInMeta =
    meta.plan === 'pro' ||
    meta.is_pro === true ||
    meta.tier === 'pro' ||
    meta.plan_tier === 'pro' ||
    meta.subscription === 'pro'

  if (proInMeta) return true
  if (cookieValue === 'pro') return true

  // Read cookie on client if available
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)filemind_plan=([^;]+)/)
    if (match && match[1] === 'pro') return true
  }

  return false
}

/**
 * Sets Pro status cookie on client after verified payment
 */
export function setClientProStatus(isPro: boolean = true) {
  if (typeof window === 'undefined') return
  try {
    if (isPro) {
      document.cookie = 'filemind_plan=pro; path=/; max-age=31536000; SameSite=Lax'
    } else {
      document.cookie = 'filemind_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    window.dispatchEvent(new Event('filemind_plan_changed'))
  } catch {
    // ignore
  }
}

/**
 * React hook that auto-fetches and maintains the authoritative user plan directly from the system.
 */
export function useUserPlan(initialUser?: { user_metadata?: Record<string, any> | null } | null) {
  const [isPro, setIsPro] = useState<boolean>(() => isUserPro(initialUser))

  useEffect(() => {
    // Auto-fetch current subscription state from server API
    let active = true

    const syncPlan = async () => {
      try {
        const res = await fetch('/api/subscription', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (active && typeof data?.is_pro === 'boolean') {
            setIsPro(data.is_pro)
          }
        }
      } catch {
        if (active) {
          setIsPro(isUserPro(initialUser))
        }
      }
    }

    syncPlan()

    const handlePlanUpdate = () => {
      syncPlan()
    }

    window.addEventListener('filemind_plan_changed', handlePlanUpdate)

    return () => {
      active = false
      window.removeEventListener('filemind_plan_changed', handlePlanUpdate)
    }
  }, [initialUser])

  return {
    isPro,
    planName: isPro ? ('Pro Intelligence' as const) : ('Free Tier' as const),
    tier: isPro ? ('pro' as const) : ('free' as const),
    badgeLabel: isPro ? 'PRO' : 'FREE',
  }
}
