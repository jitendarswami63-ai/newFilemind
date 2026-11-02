import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { createBiometricLease, getServiceRoleClient } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { id: documentId } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user

  let password = ''
  let totpCode = ''
  try {
    const body = await request.json()
    if (typeof body.password === 'string') password = body.password.trim()
    if (typeof body.totpCode === 'string') totpCode = body.totpCode.trim()
  } catch {}

  const supabaseAdmin = getServiceRoleClient()
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, filename, is_locked')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the document owner can unlock this document' }, { status: 403 })
  }

  // Verification step
  if (auth.mfaEnrolled && totpCode && auth.factorId) {
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: auth.factorId })
    if (challengeErr) {
      return NextResponse.json({ error: challengeErr.message }, { status: 400 })
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: auth.factorId,
      challengeId: challengeData.id,
      code: totpCode,
    })
    if (verifyErr) {
      return NextResponse.json({ error: 'Invalid 6-digit TOTP code' }, { status: 400 })
    }
  } else if (password) {
    const { error: pwdErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    })
    if (pwdErr) {
      return NextResponse.json({ error: 'Incorrect account password' }, { status: 400 })
    }
  } else if (auth.currentLevel !== 'aal2' && auth.mfaEnrolled) {
    return NextResponse.json(
      { error: 'Security verification required: please enter your 6-digit TOTP code or account password' },
      { status: 400 }
    )
  }

  // Create ephemeral 15-minute lease
  const lease = await createBiometricLease(
    user.id,
    documentId,
    undefined,
    'owner-recovery-session',
    15
  )

  return NextResponse.json({
    success: true,
    leaseId: lease.leaseId,
    expiresAt: lease.expiresAt,
    message: 'Biometric lease granted via security verification',
  })
}
