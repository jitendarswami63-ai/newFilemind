'use client'

import React, { useState, useEffect, useCallback, useContext, createContext } from 'react'
import {
  PlanTier,
  PLAN_CONFIGS,
  getUserPlanTier,
  UserEntitlements,
  calculateUserEntitlements,
} from './plans'
import { createClient } from '@/lib/supabase/client'

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

let inFlightPlanPromise: Promise<{ userId: string | null; tier: PlanTier; entitlements: UserEntitlements | null } | null> | null = null
let cachedPlanData: { userId: string | null; tier: PlanTier; entitlements: UserEntitlements | null; timestamp: number } | null = null
const PLAN_CACHE_TTL_MS = 60000

export function invalidatePlanCache() {
  cachedPlanData = null
  inFlightPlanPromise = null
}

async function fetchAuthoritativePlan(expectedUserId?: string | null): Promise<{ userId: string | null; tier: PlanTier; entitlements: UserEntitlements | null } | null> {
  const now = Date.now()
  if (
    cachedPlanData &&
    now - cachedPlanData.timestamp < PLAN_CACHE_TTL_MS &&
    (expectedUserId === undefined || cachedPlanData.userId === expectedUserId)
  ) {
    return cachedPlanData
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
            userId: (data.user_id as string) || null,
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
  const isGuest = !initialUser
  const initialTier: PlanTier = isGuest ? 'free' : getUserPlanTier(initialUser)
  const [tier, setTier] = useState<PlanTier>(() => {
    if (isGuest) return 'free'
    if (cachedPlanData && cachedPlanData.userId === initialUser?.id) {
      return cachedPlanData.tier
    }
    return initialTier
  })
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(() => {
    if (isGuest) return null
    if (cachedPlanData && cachedPlanData.userId === initialUser?.id) {
      return cachedPlanData.entitlements
    }
    return initialUser ? calculateUserEntitlements(initialUser, 0) : null
  })
  const [loading, setLoading] = useState<boolean>(!isGuest && !cachedPlanData)

  useEffect(() => {
    if (!initialUser) {
      setTier('free')
      setEntitlements(null)
      setLoading(false)
      return
    }
    const computedTier = getUserPlanTier(initialUser)
    if (cachedPlanData && cachedPlanData.userId === initialUser.id) {
      setTier(cachedPlanData.tier)
      setEntitlements(cachedPlanData.entitlements)
    } else {
      setTier(computedTier)
      setEntitlements(calculateUserEntitlements(initialUser, 0))
    }
  }, [initialUser])

  const syncPlan = useCallback(async (force = false) => {
    if (!initialUser) {
      setTier('free')
      setEntitlements(null)
      setLoading(false)
      return
    }
    if (force) {
      invalidatePlanCache()
    }
    setLoading(true)
    try {
      const result = await fetchAuthoritativePlan(initialUser.id)
      if (result && result.userId === initialUser.id) {
        setTier(result.tier)
        if (result.entitlements) {
          setEntitlements(result.entitlements)
        }
      } else {
        setTier(getUserPlanTier(initialUser))
      }
    } finally {
      setLoading(false)
    }
  }, [initialUser])

  useEffect(() => {
    clearLegacyCookies()

    if (!initialUser) {
      return
    }

    const now = Date.now()
    if (!cachedPlanData || cachedPlanData.userId !== initialUser.id || now - cachedPlanData.timestamp >= PLAN_CACHE_TTL_MS) {
      syncPlan()
    }

    const handlePlanUpdate = () => {
      syncPlan(true)
    }

    window.addEventListener('filemind_plan_changed', handlePlanUpdate)

    return () => {
      window.removeEventListener('filemind_plan_changed', handlePlanUpdate)
    }
  }, [syncPlan, initialUser])

  useEffect(() => {
    try {
      const supabase = createClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'SIGNED_OUT') {
          invalidatePlanCache()
          setTier('free')
          setEntitlements(null)
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          invalidatePlanCache()
          syncPlan(true)
        }
      })
      return () => {
        subscription.unsubscribe()
      }
    } catch {
      return undefined
    }
  }, [syncPlan])

  const planConfig = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free
  const isPro = !isGuest && (tier === 'pro' || tier === 'elite')
  const isElite = !isGuest && tier === 'elite'
  const activeTier: PlanTier = isGuest ? 'free' : tier

  return {
    isPro,
    isElite,
    tier: activeTier,
    planName: isGuest ? PLAN_CONFIGS.free.name : planConfig.name,
    badgeLabel: isGuest ? PLAN_CONFIGS.free.badgeLabel : planConfig.badgeLabel,
    entitlements: isGuest ? null : entitlements,
    loading: isGuest ? false : loading,
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
    if (initialUser === null) {
      return {
        ...context,
        isPro: false,
        isElite: false,
        tier: 'free',
        planName: PLAN_CONFIGS.free.name,
        badgeLabel: PLAN_CONFIGS.free.badgeLabel,
        entitlements: null,
      }
    }
    return context
  }
  return useUserPlanInternal(initialUser)
}