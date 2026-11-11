import React from 'react'
import { Home, FileText, Search, Settings, LayoutDashboard, Sparkles, UserCircle } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  requiredTier?: 'pro' | 'elite'
  featureKey?: 'ask_ai' | 'semantic_search'
}

export const navItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Documents', href: '/documents', icon: FileText },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Ask AI', href: '/ask', icon: Sparkles, requiredTier: 'pro', featureKey: 'ask_ai' },
  { name: 'Profile', href: '/profile', icon: UserCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]
