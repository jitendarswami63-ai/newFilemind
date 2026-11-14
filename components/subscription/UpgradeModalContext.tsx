'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const UpgradeModal = dynamic(
  () => import('./UpgradeModal').then((m) => m.UpgradeModal),
  { ssr: false }
)

interface UpgradeModalOptions {
  targetTier?: 'pro' | 'elite'
  featureName?: string
}

interface UpgradeModalContextValue {
  openUpgradeModal: (options?: UpgradeModalOptions) => void
  closeUpgradeModal: () => void
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null)

export function UpgradeModalProvider({
  children,
  user,
}: {
  children: React.ReactNode
  user?: { email?: string; user_metadata?: Record<string, any> } | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetTier, setTargetTier] = useState<'pro' | 'elite'>('pro')
  const [featureName, setFeatureName] = useState<string | undefined>()

  const openUpgradeModal = useCallback((options?: UpgradeModalOptions) => {
    setTargetTier(options?.targetTier || 'pro')
    setFeatureName(options?.featureName)
    setIsOpen(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      {isOpen && (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          targetTier={targetTier}
          featureName={featureName}
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name}
          onUpgradeSuccess={() => {
            window.dispatchEvent(new Event('filemind_plan_changed'))
          }}
        />
      )}
    </UpgradeModalContext.Provider>
  )
}

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext)
  if (!context) {
    return {
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
    }
  }
  return context
}
