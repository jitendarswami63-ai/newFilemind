import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  FileQuestion,
  Home,
  LayoutDashboard,
  Search,
  LogIn,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export const metadata: Metadata = {
  title: 'Page Not Found (404) | FileMind',
  description:
    'The requested document, file, or page could not be found. Explore FileMind homepage, workspace dashboard, or semantic document search.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center justify-center text-center space-y-8">
        <div className="space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47] shadow-2xs">
            <FileQuestion className="h-4 w-4" />
            <span>Error 404 &bull; Page Not Found</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#292720]">
            Lost in the Vault?
          </h1>

          <p className="text-sm sm:text-base text-[#777064] leading-relaxed">
            The page, file, or resource you are looking for doesn&apos;t exist, was renamed, or has been relocated to another workspace folder.
          </p>
        </div>

        <div className="w-full max-w-md p-6 rounded-3xl bg-[#FFFCF5] border border-[#E5DED1] shadow-xs space-y-4 text-left">
          <span className="text-[11px] font-bold text-[#777064] uppercase tracking-wider block">
            Popular Destinations
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            <Link
              href="/"
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-semibold text-[#292720] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-[#9C7D47]" />
                <span>Return to Homepage</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#777064] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-semibold text-[#292720] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4 text-[#9C7D47]" />
                <span>Open Document Workspace</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#777064] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/search"
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-semibold text-[#292720] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-[#9C7D47]" />
                <span>Search Document Vault</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#777064] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-semibold text-[#292720] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <LogIn className="h-4 w-4 text-[#9C7D47]" />
                <span>Sign In to Account</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#777064] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="text-xs text-[#777064] flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-[#9C7D47]" />
          <span>Need help finding a file?</span>
          <Link
            href="/contact"
            className="font-semibold text-[#9C7D47] hover:underline underline-offset-2"
          >
            Contact support
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#E5DED1] bg-[#F3EFE5] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777064]">
          <div className="flex items-center gap-2">
            <Image
              src="/filemind-ai-pdf-manager-logo.png"
              alt="FileMind Logo"
              width={20}
              height={20}
              className="object-contain"
            />
            <span className="font-semibold text-[#292720]">FileMind Technologies</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#292720]">Home</Link>
            <Link href="/contact" className="hover:text-[#292720]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#292720]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#292720]">Terms of Service</Link>
          </div>
          <div>&copy; {new Date().getFullYear()} FileMind. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
