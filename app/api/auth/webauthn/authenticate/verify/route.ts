import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import {
  getRpConfig,
  consumeChallenge,
  getServiceRoleClient,
  createBiometricLease,
  getAllowedOrigins,
  getAllowedRPIDs,
} from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const response = (body.response || body.authenticationResponse) as AuthenticationResponseJSON
    const challengeToken = body.challengeToken as string
    const documentId = body.documentId as string | undefined

    if (!response || !challengeToken) {
      return NextResponse.json({ error: 'Missing authentication payload or challenge' }, { status: 400 })
    }

    const challengeData = consumeChallenge(challengeToken)
    if (!challengeData || challengeData.userId !== user.id) {
      return NextResponse.json({ error: 'Challenge expired or invalid. Please retry.' }, { status: 400 })
    }

    const targetDocId = documentId || challengeData.documentId

    const supabaseAdmin = getServiceRoleClient()
    const { data: credentialRecord, error: credError } = await supabaseAdmin
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('credential_id', response.id)
      .single()

    if (credError || !credentialRecord) {
      return NextResponse.json({ error: 'Biometric credential not recognized.' }, { status: 400 })
    }

    const { rpID, origin } = getRpConfig(request)
    const publicKeyBuffer = Buffer.from(credentialRecord.public_key, 'base64url')

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getAllowedOrigins(origin),
      expectedRPID: getAllowedRPIDs(rpID),
      credential: {
        id: credentialRecord.credential_id,
        publicKey: publicKeyBuffer,
        counter: Number(credentialRecord.counter || 0),
      },
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json({ error: 'Biometric verification failed.' }, { status: 400 })
    }

    await supabaseAdmin
      .from('biometric_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', credentialRecord.id)

    let leaseId: string | undefined
    let expiresAt: string | undefined

    if (targetDocId) {
      const lease = await createBiometricLease(user.id, targetDocId, credentialRecord.credential_id)
      leaseId = lease.leaseId
      expiresAt = lease.expiresAt
    }

    return NextResponse.json({
      verified: true,
      documentId: targetDocId,
      leaseId,
      expiresAt,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Biometric verification failed' },
      { status: 500 }
    )
  }
}
