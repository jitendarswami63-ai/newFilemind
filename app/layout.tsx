import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  themeColor: '#F3EFE5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

const siteUrl = 'https://www.filemindhub.xyz'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FileMind – AI PDF Manager, Document Search & Understanding',
    template: '%s | FileMind',
  },
  description:
    'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.',
  keywords: [
    'AI PDF manager',
    'AI document management',
    'AI PDF search',
    'Semantic document search',
    'Document intelligence',
    'Document intelligence platform',
    'AI-powered PDF assistant',
    'PDF search engine',
    'Biometric document vault',
  ],
  authors: [{ name: 'FileMind' }],
  creator: 'FileMind',
  publisher: 'FileMind',
  applicationName: 'FileMind',
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: '/filemind-ai-pdf-manager-logo.png', type: 'image/png' },
      { url: '/logo-badge.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/filemind-ai-pdf-manager-logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'FileMind',
    title: 'FileMind – AI PDF Manager, Document Search & Understanding',
    description:
      'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.',
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
  verification: {
    google: 'uWPkPUv88EJCrZJ01_TNWVxknXubxh158uKrU7HbyOI',
  },
}

const siteTitle = 'FileMind – AI PDF Manager, Document Search & Understanding'
const siteDescription =
  'FileMind is an AI-powered PDF manager that helps you organize documents, understand content, and find information with AI-powered semantic search.'
const siteImage = `${siteUrl}/filemind-ai-pdf-manager-logo.png`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Canonical Structured Data (Schema.org JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${siteUrl}/#website`,
                  url: siteUrl,
                  name: 'FileMind',
                  description: siteDescription,
                  publisher: {
                    '@id': `${siteUrl}/#organization`,
                  },
                  inLanguage: 'en-US',
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: `${siteUrl}/search?q={search_term_string}`,
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'Organization',
                  '@id': `${siteUrl}/#organization`,
                  name: 'FileMind',
                  legalName: 'FileMind Technologies Inc.',
                  url: siteUrl,
                  logo: {
                    '@type': 'ImageObject',
                    url: siteImage,
                    width: 512,
                    height: 512,
                  },
                  description:
                    'FileMind is an AI-powered PDF manager providing semantic search, document understanding, and hardware-grade biometric encryption.',
                  foundingDate: '2024',
                  contactPoint: [
                    {
                      '@type': 'ContactPoint',
                      contactType: 'customer support',
                      email: 'contact@filemindhub.xyz',
                      availableLanguage: ['en'],
                    },
                    {
                      '@type': 'ContactPoint',
                      contactType: 'security inquiries',
                      email: 'contact@filemindhub.xyz',
                      availableLanguage: ['en'],
                    },
                  ],
                  sameAs: [
                    'https://github.com/jitendarswami63-ai/newFilemind',
                    'https://twitter.com/FileMindAI',
                  ],
                  knowsAbout: [
                    'Artificial Intelligence',
                    'PDF Document Processing',
                    'Semantic Search',
                    'Vector Embeddings',
                    'WebAuthn Biometric Security',
                    'Document Intelligence',
                  ],
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': `${siteUrl}/#software`,
                  name: 'FileMind',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web Browser, Windows, macOS, Linux, iOS, Android',
                  url: siteUrl,
                  description: siteDescription,
                  softwareRequirements: 'Modern Web Browser (Chrome, Edge, Safari, Firefox)',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.9',
                    reviewCount: '128',
                    bestRating: '5',
                    worstRating: '1',
                  },
                },
                {
                  '@type': 'FAQPage',
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'What is FileMind and how does it help manage PDFs?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'FileMind is an AI PDF manager and document search platform that helps you organize, search, and understand complex documents with exact page citations.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How does AI semantic search find answers inside documents?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'FileMind indexes both conceptual meaning and exact keywords to match the most relevant passages across hundreds of PDF pages in milliseconds.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Are my uploaded documents private and secure?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes. Files are stored in private cloud storage with strict row-level security and can be locked with hardware-grade biometric encryption.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Does FileMind train AI models on my private documents?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'No. FileMind strictly adheres to a zero-training privacy policy. Your private files and questions are never used to train external LLM models.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F3EFE5] text-[#292720] selection:bg-[#C5A878]/30 selection:text-[#292720]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-[#292720] focus:text-[#FFFCF5] focus:text-xs focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#9C7D47]"
        >
          Skip to main content
        </a>
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10 flex min-h-full flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  )
}
