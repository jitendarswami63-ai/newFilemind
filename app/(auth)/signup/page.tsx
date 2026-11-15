import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description: 'Join FileMind free to store, organize, search, and understand your documents and files with AI-powered search, verified citations, and biometric encryption.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/signup',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
