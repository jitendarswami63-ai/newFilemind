import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0a0a0a] text-slate-100">
      <Sidebar user={user} />
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 w-full">
        <MobileNav user={user} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto box-border">
          {children}
        </main>
      </div>
    </div>
  )
}
