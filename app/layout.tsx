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
      <body className="min-h-full flex flex-col bg-[#F7F6F3] text-[#242424] selection:bg-[#315C4C]/15 selection:text-[#242424]">
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10 flex min-h-full flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  )
}
