'use client'

import React, { useState, useEffect, useCallback, useContext, createContext } from 'react'
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

let legacyCookiesCleared = false
export function clearLegacyCookies() {
  if (legacyCookiesCleared) return
  if (typeof document !== 'undefined') {
    try {
      document.cookie = 'filemind_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      localStorage.removeItem('filemind_user_plan')
      localStorage.removeItem('filemind_is_pro')
      legacyCookiesCleared = true
    } catch {}
  }
}

// Global in-memory cache and in-flight request deduplication
let inFlightPlanPromise: Promise<{ tier: PlanTier; entitlements: UserEntitlements | null } | null> | null = null
let cachedPlanData: { tier: PlanTier; entitlements: UserEntitlements | null; timestamp: number } | null = null
const PLAN_CACHE_TTL_MS = 60000 // 60 seconds

export function invalidatePlanCache() {
  cachedPlanData = null
  inFlightPlanPromise = null
}

async function fetchAuthoritativePlan(): Promise<{ tier: PlanTier; entitlements: UserEntitlements | null } | null> {
  const now = Date.now()
  if (cachedPlanData && now - cachedPlanData.timestamp < PLAN_CACHE_TTL_MS) {
    return { tier: cachedPlanData.tier, entitlements: cachedPlanData.entitlements }
  }

  if (inFlightPlanPromise) {
    return inFlightPlanPromise
  }

  inFlightPlanPromise = (async () => {
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.success && data?.tier) {
          const result = {
            tier: data.tier as PlanTier,
            entitlements: (data.entitlements as UserEntitlements) || null,
          }
          cachedPlanData = { ...result, timestamp: Date.now() }
          return result
        }
      }
      return null
    } catch {
      return null
    } finally {
      inFlightPlanPromise = null
    }
  })()

  return inFlightPlanPromise
}

function useUserPlanInternal(
  initialUser?: { id?: string; email?: string; user_metadata?: Record<string, any> | null } | null
): UserPlanInfo {
  const initialTier = getUserPlanTier(initialUser)
  const [tier, setTier] = useState<PlanTier>(() => cachedPlanData?.tier || initialTier)
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(() =>
    cachedPlanData?.entitlements || (initialUser ? calculateUserEntitlements(initialUser, 0) : null)
  )
  const [loading, setLoading] = useState<boolean>(!cachedPlanData && !initialUser)

  useEffect(() => {
    if (initialUser) {
      const computedTier = getUserPlanTier(initialUser)
      setTier((prev) => (cachedPlanData ? prev : computedTier))
      setEntitlements((prev) => (cachedPlanData ? prev : calculateUserEntitlements(initialUser, 0)))
    }
  }, [initialUser])

  const syncPlan = useCallback(async (force = false) => {
    if (force) {
      invalidatePlanCache()
    }
    setLoading(true)
    try {
      const result = await fetchAuthoritativePlan()
      if (result) {
        setTier(result.tier)
        if (result.entitlements) {
          setEntitlements(result.entitlements)
        }
      } else if (initialUser) {
        setTier(getUserPlanTier(initialUser))
      }
    } finally {
      setLoading(false)
    }
  }, [initialUser])

  useEffect(() => {
    clearLegacyCookies()

    // If we don't have fresh cached data, fetch authoritative status once
    const now = Date.now()
    if (!cachedPlanData || now - cachedPlanData.timestamp >= PLAN_CACHE_TTL_MS) {
      syncPlan()
    }

    const handlePlanUpdate = () => {
      syncPlan(true)
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
    refreshPlan: () => syncPlan(true),
  }
}

const UserPlanContext = createContext<UserPlanInfo | null>(null)

export function UserPlanProvider({
  initialUser,
  children,
}: {
  initialUser?: { id?: string; email?: string; user_metadata?: Record<string, any> | null } | null
  children: React.ReactNode
}) {
  const planInfo = useUserPlanInternal(initialUser)
  return <UserPlanContext.Provider value={planInfo}>{children}</UserPlanContext.Provider>
}

export function useUserPlan(
  initialUser?: { id?: string; email?: string; user_metadata?: Record<string, any> | null } | null
): UserPlanInfo {
  const context = useContext(UserPlanContext)
  if (context) {
    return context
  }
  return useUserPlanInternal(initialUser)
}
