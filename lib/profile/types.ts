export interface UserProfileData {
  // Section 1: Basic Account & Identity (25%)
  full_name: string
  email: string
  username: string
  bio: string

  // Section 2: Professional & Academic Role (25%)
  occupation_role: string
  institution: string
  primary_domain: string
  document_volume: string

  // Section 3: AI Engine & Workspace Preferences (25%)
  preferred_ai_provider: string
  citation_precision: string
  audio_voice_speed: string
  email_digest: boolean

  // Section 4: Security & Biometric Vault Configuration (25%)
  biometric_hardware_vault: string
  vault_recovery_hint: string
  auto_lock_interval: string
  zero_knowledge_ack: boolean

  // Computed Metadata
  completion_percentage?: number
  section_1_complete?: boolean
  section_2_complete?: boolean
  section_3_complete?: boolean
  section_4_complete?: boolean
  updated_at?: string
}

export interface ProfileCompletionStatus {
  percentage: number
  section1: boolean
  section2: boolean
  section3: boolean
  section4: boolean
}

/**
 * Calculates profile completion percentage based on the 4 SaaS onboarding sections.
 * Section 1 is automatically 25% completed upon initial signup or login (email/name present).
 * Each completed section contributes exactly 25% (25%, 50%, 75%, 100%).
 */
export function calculateProfileCompletion(data?: Partial<UserProfileData> | null): ProfileCompletionStatus {
  // Section 1: Basic Account & Identity (Always completed on signup/login with valid user)
  const section1 = Boolean(
    (data?.email && data.email.trim().length > 0) ||
    (data?.full_name && data.full_name.trim().length > 0)
  )

  // Section 2: Professional & Academic Profile
  const section2 = Boolean(
    data?.occupation_role && data.occupation_role.trim().length > 0 &&
    data?.institution && data.institution.trim().length > 0 &&
    data?.primary_domain && data.primary_domain.trim().length > 0
  )

  // Section 3: AI Engine & Workspace Preferences
  const section3 = Boolean(
    data?.preferred_ai_provider && data.preferred_ai_provider.trim().length > 0 &&
    data?.citation_precision && data.citation_precision.trim().length > 0
  )

  // Section 4: Security & Biometric Vault Configuration
  const section4 = Boolean(
    data?.vault_recovery_hint && data.vault_recovery_hint.trim().length > 0 &&
    data?.zero_knowledge_ack === true
  )

  let percentage = 0
  if (section1) percentage += 25
  if (section2) percentage += 25
  if (section3) percentage += 25
  if (section4) percentage += 25

  return {
    percentage: Math.min(100, Math.max(section1 ? 25 : 0, percentage)),
    section1,
    section2,
    section3,
    section4,
  }
}
