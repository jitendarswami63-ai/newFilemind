import React from 'react'
import { FileText, Search, Settings, LayoutDashboard } from 'lucide-react'

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
  { name: 'Settings', href: '/settings', icon: Settings },
]
