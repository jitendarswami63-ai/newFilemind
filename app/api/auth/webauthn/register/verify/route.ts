import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import {
  getRpConfig,
  consumeChallenge,
  getServiceRoleClient,
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
    const response = (body.response || body.registrationResponse) as RegistrationResponseJSON
    const challengeToken = body.challengeToken as string
    const deviceName = body.deviceName as string | undefined

    if (!response || !challengeToken) {
      return NextResponse.json({ error: 'Missing registration payload or challenge' }, { status: 400 })
    }

    const challengeData = consumeChallenge(challengeToken)
    if (!challengeData || challengeData.userId !== user.id) {
      return NextResponse.json({ error: 'Challenge expired or invalid. Please retry.' }, { status: 400 })
    }

    const { rpID, origin } = getRpConfig(request)

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getAllowedOrigins(origin),
      expectedRPID: getAllowedRPIDs(rpID),
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 })
    }

    const { credential, aaguid } = verification.registrationInfo
    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url')

    const supabaseAdmin = getServiceRoleClient()
    const { error: insertError } = await supabaseAdmin.from('biometric_credentials').insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: publicKeyBase64,
      counter: credential.counter,
      device_name: deviceName || 'Windows Hello / Touch ID',
      authenticator_type: 'platform',
      aaguid: aaguid || null,
      last_used_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ verified: true, credentialId: credential.id })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration verification failed' },
      { status: 500 }
    )
  }
}
