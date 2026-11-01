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
    default: 'FileMind — AI-Powered PDF Search & Document Intelligence',
    template: '%s | FileMind',
  },
  description: 'Transform complex PDF libraries into conversational knowledge with sub-second hybrid semantic search, dual-engine AI synthesis, exact page citations, and biometric secure vault.',
  keywords: [
    'AI document management',
    'AI PDF search',
    'Semantic document search',
    'AI-powered PDF assistant',
    'Document intelligence platform',
    'PDF search engine',
    'Biometric document vault',
    'Vector search PDF',
    'Exact page citations',
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
    title: 'FileMind — AI-Powered PDF Search & Document Intelligence',
    description: 'Transform complex PDF libraries into conversational knowledge with sub-second hybrid semantic search, dual-engine AI synthesis, exact page citations, and biometric secure vault.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'FileMind — Document Intelligence',
      },
      {
        url: '/logo-full.png',
        width: 555,
        height: 175,
        alt: 'FileMind Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileMind — AI-Powered PDF Search & Document Intelligence',
    description: 'Transform complex PDF libraries into conversational knowledge with sub-second hybrid semantic search, dual-engine AI synthesis, exact page citations, and biometric secure vault.',
    images: ['/logo.png'],
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
      <body className="min-h-full flex flex-col bg-[#F3EFE5] text-[#292720] selection:bg-[#C5A878]/30 selection:text-[#292720]">
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10 flex min-h-full flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  )
}
