import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listUserBiometricCredentials, deleteBiometricCredential } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credentials = await listUserBiometricCredentials(user.id)
    return NextResponse.json({ credentials })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let credentialId = searchParams.get('credentialId') || searchParams.get('id')

    if (!credentialId) {
      try {
        const body = await request.json()
        credentialId = body?.credentialId || body?.id
      } catch {}
    }

    if (!credentialId) {
      return NextResponse.json({ error: 'credentialId is required' }, { status: 400 })
    }

    await deleteBiometricCredential(user.id, credentialId)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete credential' },
      { status: 500 }
    )
  }
}
