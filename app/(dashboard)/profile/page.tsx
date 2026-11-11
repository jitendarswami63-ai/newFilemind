import type { Metadata } from 'next'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { User, Shield, CheckCircle2 } from 'lucide-react'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings'
import { UserProfileData, calculateProfileCompletion } from '@/lib/profile/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Personal Profile & Account Dashboard',
  description: 'Manage your professional identity, AI preferences, biometric vault settings, and subscription entitlements.',
}

function buildInitialProfile(user: any): UserProfileData {
  const meta = user?.user_metadata || {}
  const saved = meta.profile_data || {}

  const defaultUsername = user?.email
    ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : 'researcher'

  return {
    full_name: saved.full_name || meta.full_name || meta.name || '',
    email: user?.email || '',
    username: saved.username || defaultUsername,
    bio: saved.bio || '',
    occupation_role: saved.occupation_role || '',
    institution: saved.institution || '',
    primary_domain: saved.primary_domain || '',
    document_volume: saved.document_volume || '1–15 documents/week',
    preferred_ai_provider: saved.preferred_ai_provider || 'Dual-Engine (Gemini 3.8 + NVIDIA NIM)',
    citation_precision: saved.citation_precision || 'Page-Precise Academic Quotes',
    audio_voice_speed: saved.audio_voice_speed || 'Deepgram Neural (1.0x Normal)',
    email_digest: typeof saved.email_digest === 'boolean' ? saved.email_digest : true,
    biometric_hardware_vault: saved.biometric_hardware_vault || 'FIDO2 WebAuthn Hardware Passkey',
    vault_recovery_hint: saved.vault_recovery_hint || '',
    auto_lock_interval: saved.auto_lock_interval || '1 hour',
    zero_knowledge_ack: Boolean(saved.zero_knowledge_ack),
  }
}

export default async function ProfilePage() {
  const user = await getAuthenticatedUser()

  const profile = buildInitialProfile(user)
  const completion = calculateProfileCompletion(profile)

  return (
    <div className="space-y-10 w-full max-w-5xl mx-auto pb-16">
      <div className="border-b border-[#E5DED1] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#292720] flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] shadow-2xs">
              <User className="h-5 w-5" />
            </div>
            <span>Personal Profile & Account</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#777064] mt-1.5">
            Structured 4-step onboarding dashboard, AI routing, storage quota tracking, and subscription entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFCF5] border border-[#E5DED1] text-xs font-semibold text-[#777064] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#1E7E34]" />
            <span>Account Active: {user?.email}</span>
          </span>
        </div>
      </div>

      <ProfileForm initialProfile={profile} initialCompletion={completion} />

      <div className="pt-4 border-t border-[#E5DED1]">
        <SubscriptionSettings initialUser={user} />
      </div>
    </div>
  )
}
