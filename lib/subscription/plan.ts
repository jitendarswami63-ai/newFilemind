'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlanTier,
  PLAN_CONFIGS,
  getUserPlanTier,
  UserEntitlements,
  calculateUserEntitlements,
} from './plans'

export interface UserPlanInfo {
  isPro: boolean
  isElite: boolean
  tier: PlanTier
  planName: string
  badgeLabel: string
  entitlements: UserEntitlements | null
  loading: boolean
  refreshPlan: () => Promise<void>
}

export function isUserPro(
  user?: { user_metadata?: Record<string, any> | null } | null
): boolean {
  if (!user) return false
  const tier = getUserPlanTier(user)
  return tier === 'pro' || tier === 'elite'
}

export function clearLegacyCookies() {
  if (typeof document !== 'undefined') {
    try {
      document.cookie = 'filemind_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      localStorage.removeItem('filemind_user_plan')
      localStorage.removeItem('filemind_is_pro')
    } catch {}
  }
}

export function useUserPlan(
  initialUser?: { id?: string; email?: string; user_metadata?: Record<string, any> | null } | null
): UserPlanInfo {
  const initialTier = getUserPlanTier(initialUser)
  const [tier, setTier] = useState<PlanTier>(initialTier)
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(() =>
    initialUser ? calculateUserEntitlements(initialUser, 0) : null
  )
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (initialUser) {
      const computedTier = getUserPlanTier(initialUser)
      setTier(computedTier)
      setEntitlements(calculateUserEntitlements(initialUser, 0))
    }
  }, [initialUser])

  const syncPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.success && data?.tier) {
          setTier(data.tier)
          if (data.entitlements) {
            setEntitlements(data.entitlements)
          }
        }
      }
    } catch {
      setTier(getUserPlanTier(initialUser))
    } finally {
      setLoading(false)
    }
  }, [initialUser])

  useEffect(() => {
    clearLegacyCookies()
    syncPlan()

    const handlePlanUpdate = () => {
      syncPlan()
    }

    window.addEventListener('filemind_plan_changed', handlePlanUpdate)

    return () => {
      window.removeEventListener('filemind_plan_changed', handlePlanUpdate)
    }
  }, [syncPlan])

  const planConfig = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free

  return {
    isPro: tier === 'pro' || tier === 'elite',
    isElite: tier === 'elite',
    tier,
    planName: planConfig.name,
    badgeLabel: planConfig.badgeLabel,
    entitlements,
    loading,
    refreshPlan: syncPlan,
  }
}
