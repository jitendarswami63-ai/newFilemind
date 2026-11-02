import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'Workspace',
    template: '%s | FileMind',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

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
    const headerList = await headers()
    const targetUrl = headerList.get('x-url') || '/dashboard'
    const safeTarget = targetUrl.startsWith('/') && !targetUrl.startsWith('//') && !targetUrl.startsWith('/\\')
      ? targetUrl
      : '/dashboard'
    redirect(`/login?next=${encodeURIComponent(safeTarget)}`)
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
