import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVaultMfaStatus } from '@/lib/auth/vault-mfa'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await getVaultMfaStatus(supabase)
    return NextResponse.json(status)
  } catch (err: unknown) {
    console.error('[MFA Status] Error:', err)
    return NextResponse.json({ error: 'Failed to retrieve MFA status' }, { status: 500 })
  }
}
