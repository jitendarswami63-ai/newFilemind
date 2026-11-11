import type { Metadata } from 'next'
import Link from 'next/link'
import { getAuthorizedAdmin } from '@/lib/admin/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'

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
    return (
      <div className="min-h-screen bg-[#1B1D21] text-[#F5F1E9] flex items-center justify-center p-6 selection:bg-[#9C7D47]/30 selection:text-[#F5F1E9]">
        <div className="max-w-md w-full bg-[#24262B] border border-[#3E4149] rounded-2xl p-8 text-center shadow-2xl space-y-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-[#9C7D47]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#E07A7A]/15 text-[#E07A7A] border border-[#E07A7A]/30">
              403 Access Denied
            </span>
            <h1 className="text-xl font-extrabold text-[#F5F1E9] tracking-tight">
              Administrator Privileges Required
            </h1>
            <p className="text-xs text-[#A8A49B] leading-relaxed">
              This administrative control center is restricted to authorized FileMind system administrators via verified server-side allowlist.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1B1D21] border border-[#2E3036] text-[11px] text-[#A8A49B] space-y-1 text-left">
            <div className="flex items-center gap-1.5 font-semibold text-[#E5DED1]">
              <Lock className="h-3 w-3 text-[#D4AF37]" />
              <span>Security Invariant Notice:</span>
            </div>
            <p>
              Your email must be confirmed and explicitly declared in the server environment variable (<code className="text-[#D4AF37]">ADMIN_EMAILS</code>).
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-sm transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to User Workspace</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full py-2 px-4 rounded-xl text-xs font-semibold text-[#A8A49B] hover:text-[#F5F1E9] transition-colors"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    )
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
          {children}
        </main>
      </div>
    </div>
  )
}
