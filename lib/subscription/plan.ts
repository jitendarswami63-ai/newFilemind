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
 * Verified strictly from the user's personal user_metadata.
 * No cookies or local storage fallbacks are used so Pro status never leaks across accounts.
 */
export function isUserPro(
  user?: { user_metadata?: Record<string, any> | null } | null
): boolean {
  if (!user) return false
  const meta = user.user_metadata || {}
  return Boolean(
    meta.plan === 'pro' ||
    meta.is_pro === true ||
    meta.tier === 'pro' ||
    meta.plan_tier === 'pro' ||
    meta.subscription === 'pro'
  )
}

/**
 * Clears any legacy cookies that might have lingered from earlier sessions
 */
export function clearLegacyCookies() {
  if (typeof document !== 'undefined') {
    try {
      document.cookie = 'filemind_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      localStorage.removeItem('filemind_user_plan')
      localStorage.removeItem('filemind_is_pro')
    } catch {}
  }
}

/**
 * React hook that auto-fetches and maintains the authoritative user plan strictly for the currently authenticated user.
 */
export function useUserPlan(initialUser?: { id?: string; email?: string; user_metadata?: Record<string, any> | null } | null) {
  const [isPro, setIsPro] = useState<boolean>(() => isUserPro(initialUser))

  useEffect(() => {
    // Clear any legacy cookie that might have leaked across accounts
    clearLegacyCookies()

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
  }, [initialUser?.id, initialUser?.email])

  return {
    isPro,
    planName: isPro ? ('Pro Intelligence' as const) : ('Free Tier' as const),
    tier: isPro ? ('pro' as const) : ('free' as const),
    badgeLabel: isPro ? 'PRO' : 'FREE',
  }
}
