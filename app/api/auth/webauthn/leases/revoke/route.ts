import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeBiometricLease } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let documentId: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body.documentId === 'string') {
        documentId = body.documentId
      }
    } catch {}

    await revokeBiometricLease(user.id, documentId)

    return NextResponse.json({ success: true, revoked: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to revoke lease' },
      { status: 500 }
    )
  }
}
