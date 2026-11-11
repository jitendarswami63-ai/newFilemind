import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import {
  getAdminAllowlist,
  isEmailAuthorizedAdmin,
  verifyAdminUserCredentials,
  AdminVerificationResult,
} from './auth-core'

export {
  getAdminAllowlist,
  isEmailAuthorizedAdmin,
  verifyAdminUserCredentials,
  type AdminVerificationResult,
}

export interface AuthorizedAdmin {
  user: User
  email: string
}

export async function getAuthorizedAdmin(): Promise<AuthorizedAdmin | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const verification = verifyAdminUserCredentials(user)
    if (!verification.isAuthorized || !verification.email) {
      return null
    }

    return {
      user,
      email: verification.email,
    }
  } catch {
    return null
  }
}

export async function verifyAdminApi(): Promise<{ admin: AuthorizedAdmin } | NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      )
    }

    const verification = verifyAdminUserCredentials(user)
    if (!verification.isAuthorized || !verification.email) {
      return NextResponse.json(
        { error: `Forbidden: ${verification.reason || 'Administrator privileges required'}` },
        { status: 403 }
      )
    }

    return {
      admin: {
        user,
        email: verification.email,
      },
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal security authorization failure.' },
      { status: 500 }
    )
  }
}
