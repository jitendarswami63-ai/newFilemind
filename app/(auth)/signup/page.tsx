import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description: 'Join FileMind free to analyze dense PDF documents with AI-powered hybrid search, exact page citations, and military-grade biometric encryption.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/signup',
  },
  robots: {
    index: true,
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
