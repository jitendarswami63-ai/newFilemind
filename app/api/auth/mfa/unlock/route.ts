import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.delete('filemind_vault_locked')

    return NextResponse.json({ success: true, currentLevel: 'aal2' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to unlock vault'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
