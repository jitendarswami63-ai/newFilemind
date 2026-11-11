import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'
import { createClient } from '@/lib/supabase/server'

const siteUrl = 'https://www.filemindhub.xyz'

export const metadata: Metadata = {
  title: 'FileMind – AI PDF Manager, Document Search & Understanding',
  description:
    'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.',
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
