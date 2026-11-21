import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
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
    default: 'FileMind — AI-Powered Document and File Management Platform',
    template: '%s | FileMind',
  },
  description:
    'FileMind is an AI-powered document and file management platform to store, organize, search, and understand your files with semantic search, smart summaries, and private biometric security.',
  keywords: [
    'AI document management',
    'Intelligent file management',
    'Centralized file workspace',
    'AI-powered document assistant',
    'AI-powered PDF assistant',
    'Semantic document search',
    'AI PDF search',
    'Smart file search',
    'Document intelligence platform',
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
    title: 'FileMind — AI-Powered Document and File Management Platform',
    description:
      'FileMind is an AI-powered document and file management platform to store, organize, search, and understand your files with semantic search, smart summaries, and private biometric security.',
    images: [`${siteUrl}/filemind-ai-pdf-manager-logo.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileMind — AI-Powered Document and File Management Platform',
    description:
      'FileMind is an AI-powered document and file management platform to store, organize, search, and understand your files with semantic search, smart summaries, and private biometric security.',
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

const siteTitle = 'FileMind — AI-Powered Document and File Management Platform'
const siteDescription =
  'FileMind is an AI-powered document and file management platform to store, organize, search, and understand your files with semantic search, smart summaries, and private biometric security.'
const siteImage = `${siteUrl}/filemind-ai-pdf-manager-logo.png`
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-FLMND9PDF1'

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
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <Script
          strategy="lazyOnload"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
        />
        <Script
          id="google-analytics"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}',{page_path:window.location.pathname});`,
          }}
        />
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
                  name: siteTitle,
                  alternateName: 'FileMind',
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
                    'FileMind is an AI-powered document and file management platform providing semantic search, document understanding, and hardware-grade biometric encryption.',
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
                    'Document and File Management',
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
                  applicationCategory: 'Document and File Management Application',
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
                      name: 'What is FileMind and how does it help manage files and documents?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'FileMind is an AI-powered document and file management platform that helps you store, organize, search, and understand your files in one centralized workspace with verified citations.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How does AI semantic search find answers inside documents?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'FileMind indexes both semantic meaning and exact keywords to match the most relevant passages across your files and documents in milliseconds.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Are my uploaded files and documents private and secure?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes. Files are stored in private cloud storage with strict row-level security and can be locked with hardware-grade biometric encryption.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Does FileMind train AI models on my private files?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'No. FileMind strictly adheres to a zero-training privacy policy. Your private files and questions are never used to train external AI models.',
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
