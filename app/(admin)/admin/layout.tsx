import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthorizedAdmin } from '@/lib/admin/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'FileMind Admin Control Center',
  description: 'Administrative portal for user, subscription, storage, and website management.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAuthorizedAdmin()

  if (!admin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <AdminSidebar adminEmail={admin.email} />

      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-[#FAF6EE]/95 backdrop-blur-xs border-b border-[#E5DED1] px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#777064]">
              Admin Control Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFCF5] border border-[#E5DED1] text-xs font-medium text-[#777064]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
              <span>Online: <strong className="text-[#292720]">{admin.email}</strong></span>
            </div>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D8D0C2] bg-[#FFFCF5] hover:bg-[#FAF5EC] text-xs font-semibold text-[#292720] hover:text-[#9C7D47] transition-colors shadow-2xs"
            >
              <span>View Live Site</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
