import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In to Your Workspace',
  description: 'Sign in to FileMind to access your intelligent PDF document library, hybrid semantic search, and private biometric vault.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/login',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
