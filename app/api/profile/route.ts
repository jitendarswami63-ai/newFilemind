import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { UserProfileData, calculateProfileCompletion } from '@/lib/profile/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function buildDefaultProfile(user: any): UserProfileData {
  const meta = user.user_metadata || {}
  const saved = meta.profile_data || {}

  const defaultUsername = user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') : 'researcher'

  return {
    full_name: saved.full_name || meta.full_name || meta.name || '',
    email: user.email || '',
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

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = buildDefaultProfile(user)
    const completion = calculateProfileCompletion(profile)

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        completion_percentage: completion.percentage,
        section_1_complete: completion.section1,
        section_2_complete: completion.section2,
        section_3_complete: completion.section3,
        section_4_complete: completion.section4,
      },
      completion,
    })
  } catch (err: any) {
    console.error('[Profile API GET Error]:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const existing = buildDefaultProfile(user)

    // Merge incoming values cleanly
    const updated: UserProfileData = {
      full_name: typeof body.full_name === 'string' ? body.full_name.trim() : existing.full_name,
      email: user.email || existing.email,
      username: typeof body.username === 'string' ? body.username.trim() : existing.username,
      bio: typeof body.bio === 'string' ? body.bio.trim() : existing.bio,
      occupation_role: typeof body.occupation_role === 'string' ? body.occupation_role.trim() : existing.occupation_role,
      institution: typeof body.institution === 'string' ? body.institution.trim() : existing.institution,
      primary_domain: typeof body.primary_domain === 'string' ? body.primary_domain.trim() : existing.primary_domain,
      document_volume: typeof body.document_volume === 'string' ? body.document_volume.trim() : existing.document_volume,
      preferred_ai_provider: typeof body.preferred_ai_provider === 'string' ? body.preferred_ai_provider.trim() : existing.preferred_ai_provider,
      citation_precision: typeof body.citation_precision === 'string' ? body.citation_precision.trim() : existing.citation_precision,
      audio_voice_speed: typeof body.audio_voice_speed === 'string' ? body.audio_voice_speed.trim() : existing.audio_voice_speed,
      email_digest: typeof body.email_digest === 'boolean' ? body.email_digest : existing.email_digest,
      biometric_hardware_vault: typeof body.biometric_hardware_vault === 'string' ? body.biometric_hardware_vault.trim() : existing.biometric_hardware_vault,
      vault_recovery_hint: typeof body.vault_recovery_hint === 'string' ? body.vault_recovery_hint.trim() : existing.vault_recovery_hint,
      auto_lock_interval: typeof body.auto_lock_interval === 'string' ? body.auto_lock_interval.trim() : existing.auto_lock_interval,
      zero_knowledge_ack: typeof body.zero_knowledge_ack === 'boolean' ? body.zero_knowledge_ack : existing.zero_knowledge_ack,
      updated_at: new Date().toISOString(),
    }

    const completion = calculateProfileCompletion(updated)
    updated.completion_percentage = completion.percentage
    updated.section_1_complete = completion.section1
    updated.section_2_complete = completion.section2
    updated.section_3_complete = completion.section3
    updated.section_4_complete = completion.section4

    // 1. Update user_metadata via user session
    await supabase.auth.updateUser({
      data: {
        full_name: updated.full_name,
        profile_data: updated,
      },
    })

    // 2. Fallback update via admin if service role key is present
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      try {
        const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            full_name: updated.full_name,
            profile_data: updated,
          },
        })

        // Also update public.profiles if exists
        await admin
          .from('profiles')
          .update({
            full_name: updated.full_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      } catch (adminErr) {
        console.warn('[Profile Admin Update Warning]:', adminErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile information saved successfully',
      profile: updated,
      completion,
    })
  } catch (err: any) {
    console.error('[Profile API POST Error]:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to save profile' },
      { status: 500 }
    )
  }
}
