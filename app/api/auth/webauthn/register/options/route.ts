import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import { getRpConfig, storeChallenge, listUserBiometricCredentials } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rpName, rpID } = getRpConfig(request)
    const existingCreds = await listUserBiometricCredentials(user.id)

    const excludeCredentials = existingCreds.map((c) => ({
      id: c.credential_id,
    }))

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email || 'user@filemind.app',
      userDisplayName: (user.user_metadata?.full_name as string) || user.email || 'FileMind User',
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
    })

    const challengeToken = storeChallenge(user.id, options.challenge)

    return NextResponse.json({ options, challengeToken })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
