import React from 'react'
import { FileText, Search, Settings, LayoutDashboard, Sparkles } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Documents', href: '/documents', icon: FileText },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Ask AI', href: '/ask', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
]
