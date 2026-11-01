import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.filemindhub.xyz/#website',
      url: 'https://www.filemindhub.xyz',
      name: 'FileMind',
      description: 'AI-Powered PDF Search & Document Intelligence Platform',
      publisher: {
        '@id': 'https://www.filemindhub.xyz/#organization',
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.filemindhub.xyz/#organization',
      name: 'FileMind',
      url: 'https://www.filemindhub.xyz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.filemindhub.xyz/logo.png',
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.filemindhub.xyz/#software',
      name: 'FileMind',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      url: 'https://www.filemindhub.xyz',
      description: 'AI document management platform with hybrid semantic search, exact page citations, dual-engine AI synthesis, and biometric vault encryption.',
      softwareRequirements: 'Modern Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
}

export default async function Home() {
  let user = null
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch {
    user = null
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage user={user} />
    </>
  )
}
