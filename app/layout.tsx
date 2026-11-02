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
      { url: '/logo.png', type: 'image/png' },
      { url: '/logo-badge.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
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
        <link rel="canonical" href={siteUrl} />

        {/* Primary Open Graph / Facebook Metadata */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:site_name" content="FileMind" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:image" content={siteImage} />
        <meta property="og:image:secure_url" content={siteImage} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="FileMind – AI PDF Manager, Document Search & Understanding" />

        {/* Twitter Card Metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={siteImage} />
        <meta name="twitter:image:alt" content="FileMind – AI PDF Manager, Document Search & Understanding" />

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
                },
                {
                  '@type': 'Organization',
                  '@id': `${siteUrl}/#organization`,
                  name: 'FileMind',
                  url: siteUrl,
                  logo: {
                    '@type': 'ImageObject',
                    url: siteImage,
                    width: 512,
                    height: 512,
                  },
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': `${siteUrl}/#software`,
                  name: 'FileMind',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web Browser',
                  url: siteUrl,
                  description: siteDescription,
                  softwareRequirements: 'Modern Web Browser',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
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
