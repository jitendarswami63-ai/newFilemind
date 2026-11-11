'use client'

import React from 'react'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { UpgradeModalProvider } from '@/components/subscription/UpgradeModalContext'

type ShellUser = { email?: string; user_metadata?: Record<string, any> } | null

function DashboardInnerShell({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex min-h-screen w-full bg-[#F3EFE5] text-[#292720]">
      <Sidebar user={user} />
      <div
        className={`flex-1 flex flex-col min-w-0 w-full transition-[padding] duration-300 ease-in-out ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <MobileNav user={user} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto box-border focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}

export function DashboardShell({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  return (
    <UpgradeModalProvider user={user}>
      <SidebarProvider>
        <DashboardInnerShell user={user}>{children}</DashboardInnerShell>
      </SidebarProvider>
    </UpgradeModalProvider>
  )
}
