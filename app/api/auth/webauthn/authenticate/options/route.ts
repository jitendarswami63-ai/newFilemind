import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import { getRpConfig, storeChallenge, listUserBiometricCredentials } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

async function handleOptions(request: Request, documentId?: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rpID } = getRpConfig(request)
    const userCredentials = await listUserBiometricCredentials(user.id)

    if (userCredentials.length === 0) {
      return NextResponse.json(
        { error: 'No biometric credentials enrolled. Please enroll Windows Hello or Touch ID in Settings first.' },
        { status: 400 }
      )
    }

    const allowCredentials = userCredentials.map((c) => ({
      id: c.credential_id,
    }))

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    })

    const challengeToken = storeChallenge(user.id, options.challenge, documentId)

    return NextResponse.json({ options, challengeToken })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId') || undefined
  return handleOptions(request, documentId)
}

export async function POST(request: Request) {
  let documentId: string | undefined
  try {
    const body = await request.json()
    if (body && typeof body.documentId === 'string') {
      documentId = body.documentId
    }
  } catch {}
  if (!documentId) {
    const { searchParams } = new URL(request.url)
    documentId = searchParams.get('documentId') || undefined
  }
  return handleOptions(request, documentId)
}
