'use client'

import { useState, useEffect } from 'react'

export interface UserPlanInfo {
  isPro: boolean
  planName: 'Pro Intelligence' | 'Free Tier'
  tier: 'pro' | 'free'
  badgeLabel: string
}

/**
 * Checks whether a user has an active Pro plan.
 * Checks user_metadata, cookie, and client-side localStorage fallback.
 */
export function isUserPro(
  user?: { user_metadata?: Record<string, any> | null } | null,
  cookieValue?: string | null
): boolean {
  // Check user metadata if available
  const meta = user?.user_metadata || {}
  const proInMeta =
    meta.plan === 'pro' ||
    meta.is_pro === true ||
    meta.tier === 'pro' ||
    meta.plan_tier === 'pro' ||
    meta.subscription === 'pro'

  if (proInMeta) return true
  if (cookieValue === 'pro') return true

  // Check client-side storage
  if (typeof window !== 'undefined') {
    try {
      const localPlan = localStorage.getItem('filemind_user_plan')
      const localIsPro = localStorage.getItem('filemind_is_pro')
      if (localPlan === 'pro' || localIsPro === 'true') return true
    } catch {
      // ignore storage access errors
    }
  }

  return false
}

/**
 * Sets Pro status in localStorage and document.cookie on client
 */
export function setClientProStatus(isPro: boolean = true) {
  if (typeof window === 'undefined') return
  try {
    if (isPro) {
      localStorage.setItem('filemind_user_plan', 'pro')
      localStorage.setItem('filemind_is_pro', 'true')
      document.cookie = 'filemind_plan=pro; path=/; max-age=31536000; SameSite=Lax'
    } else {
      localStorage.removeItem('filemind_user_plan')
      localStorage.removeItem('filemind_is_pro')
      document.cookie = 'filemind_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    window.dispatchEvent(new Event('filemind_plan_changed'))
  } catch {
    // ignore
  }
}

/**
 * React hook that returns live user plan information and stays in sync across tabs and updates.
 */
export function useUserPlan(initialUser?: { user_metadata?: Record<string, any> | null } | null) {
  const [isPro, setIsPro] = useState<boolean>(() => isUserPro(initialUser))

  useEffect(() => {
    setIsPro(isUserPro(initialUser))

    const handlePlanUpdate = () => {
      setIsPro(isUserPro(initialUser))
    }

    window.addEventListener('filemind_plan_changed', handlePlanUpdate)
    window.addEventListener('storage', handlePlanUpdate)

    return () => {
      window.removeEventListener('filemind_plan_changed', handlePlanUpdate)
      window.removeEventListener('storage', handlePlanUpdate)
    }
  }, [initialUser])

  return {
    isPro,
    planName: isPro ? ('Pro Intelligence' as const) : ('Free Tier' as const),
    tier: isPro ? ('pro' as const) : ('free' as const),
    badgeLabel: isPro ? 'PRO' : 'FREE',
  }
}
