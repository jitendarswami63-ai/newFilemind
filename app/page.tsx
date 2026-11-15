import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'
import { createClient } from '@/lib/supabase/server'

const siteUrl = 'https://www.filemindhub.xyz'

export const metadata: Metadata = {
  title: 'FileMind — AI-Powered Document and File Management Platform',
  description:
    'FileMind is an AI-powered document and file management platform to store, organize, search, and understand your files with semantic search, smart summaries, and private biometric security.',
  alternates: {
    canonical: siteUrl,
  },
}

export default async function Home() {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch {}

  return <LandingPage user={user} />
}
