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
  openGraph: {
    title: 'FileMind – AI PDF Manager, Document Search & Understanding',
    description:
      'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.',
    url: siteUrl,
    siteName: 'FileMind',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/filemind-ai-pdf-manager-logo.png`,
        width: 512,
        height: 512,
        alt: 'FileMind – AI PDF Manager, Document Search & Understanding',
      },
      {
        url: `${siteUrl}/filemind-pdf-intelligence-brand.png`,
        width: 555,
        height: 175,
        alt: 'FileMind Document Intelligence Platform Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileMind – AI PDF Manager, Document Search & Understanding',
    description:
      'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.',
    images: [`${siteUrl}/filemind-ai-pdf-manager-logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
