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

export interface PlanUserLike {
  id?: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export function isUserPro(
  user?: { user_metadata?: Record<string, unknown> | null } | null
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
  initialUser?: PlanUserLike | null,
  disabled: boolean = false
): UserPlanInfo {
  const isGuest = disabled || !initialUser
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

  const syncPlan = useCallback(async (force = false) => {
    if (disabled || !initialUser) {
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
        setEntitlements(calculateUserEntitlements(initialUser, 0))
      }
    } finally {
      setLoading(false)
    }
  }, [initialUser, disabled])

  useEffect(() => {
    if (disabled) return
    clearLegacyCookies()

    if (!initialUser) {
      const resetTimer = setTimeout(() => {
        setTier('free')
        setEntitlements(null)
        setLoading(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const now = Date.now()
    const needsFetch =
      !cachedPlanData ||
      cachedPlanData.userId !== initialUser.id ||
      now - cachedPlanData.timestamp >= PLAN_CACHE_TTL_MS

    let initTimer: ReturnType<typeof setTimeout> | null = null
    if (needsFetch) {
      initTimer = setTimeout(() => {
        void syncPlan()
      }, 0)
    } else if (cachedPlanData) {
      const cachedSnapshot = cachedPlanData
      initTimer = setTimeout(() => {
        setTier(cachedSnapshot.tier)
        setEntitlements(cachedSnapshot.entitlements)
        setLoading(false)
      }, 0)
    }

    const handlePlanUpdate = () => {
      void syncPlan(true)
    }

    window.addEventListener('filemind_plan_changed', handlePlanUpdate)

    return () => {
      if (initTimer) clearTimeout(initTimer)
      window.removeEventListener('filemind_plan_changed', handlePlanUpdate)
    }
  }, [syncPlan, initialUser, disabled])

  useEffect(() => {
    if (disabled) return undefined
    try {
      const supabase = createClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'SIGNED_OUT') {
          invalidatePlanCache()
          setTier('free')
          setEntitlements(null)
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          invalidatePlanCache()
          void syncPlan(true)
        }
      })
      return () => {
        subscription.unsubscribe()
      }
    } catch {
      return undefined
    }
  }, [syncPlan, disabled])

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
  initialUser?: PlanUserLike | null
  children: React.ReactNode
}) {
  const planInfo = useUserPlanInternal(initialUser, false)
  return <UserPlanContext.Provider value={planInfo}>{children}</UserPlanContext.Provider>
}

export function useUserPlan(
  initialUser?: PlanUserLike | null
): UserPlanInfo {
  const context = useContext(UserPlanContext)
  const fallbackPlan = useUserPlanInternal(context ? undefined : initialUser, Boolean(context))
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
  return fallbackPlan
}