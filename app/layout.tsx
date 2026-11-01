import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'FileMind — Document Intelligence',
  description: 'Secure, private, intelligent document management system.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
