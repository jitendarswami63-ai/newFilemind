import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import {
  createPublicShare,
  createRestrictedShare,
  getDocumentShares,
  revokeShare,
  updateShareSettings,
} from '@/lib/sharing/share-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

const createShareSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('public'),
    allowDownload: z.boolean().optional(),
    expiresInHours: z.number().positive().nullable().optional(),
  }),
  z.object({
    mode: z.literal('restricted'),
    recipientEmail: z.string().email('Invalid email address'),
    allowDownload: z.boolean().optional(),
    expiresInHours: z.number().positive().nullable().optional(),
  }),
])

const updateShareSchema = z.object({
  shareId: z.string().uuid('Invalid share ID'),
  allowDownload: z.boolean().optional(),
  expiresInHours: z.number().positive().nullable().optional(),
})

// GET /api/documents/[id]/shares
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const auth = await verifyVaultAccess(supabase)
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    // Verify document exists and belongs to this user
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, filename, user_id')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
    }

    const shares = await getDocumentShares(id, auth.user.id)

    return NextResponse.json({
      success: true,
      documentId: id,
      filename: doc.filename,
      publicShare: shares.publicShare,
      restrictedShares: shares.restrictedShares,
    })
  } catch (error: unknown) {
    console.error('[Document Shares API] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch shares' },
      { status: 500 }
    )
  }
}

// POST /api/documents/[id]/shares
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const auth = await verifyVaultAccess(supabase)
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, filename, user_id')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const parsed = createShareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const expiresAt = payload.expiresInHours
      ? new Date(Date.now() + payload.expiresInHours * 60 * 60 * 1000)
      : null

    if (payload.mode === 'public') {
      const result = await createPublicShare(supabase, {
        documentId: id,
        ownerId: auth.user.id,
        allowDownload: payload.allowDownload,
        expiresAt,
      })

      // Construct the full public share URL
      const origin = request.nextUrl.origin || 'http://localhost:3000'
      const shareUrl = `${origin}/share/${result.rawToken}`

      return NextResponse.json({
        success: true,
        mode: 'public',
        share: result.share,
        rawToken: result.rawToken,
        shareUrl,
      })
    } else {
      const result = await createRestrictedShare(supabase, {
        documentId: id,
        ownerId: auth.user.id,
        recipientEmail: payload.recipientEmail,
        allowDownload: payload.allowDownload,
        expiresAt,
      })

      return NextResponse.json({
        success: true,
        mode: 'restricted',
        share: result.share,
      })
    }
  } catch (error: unknown) {
    console.error('[Document Shares API] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create share' },
      { status: 500 }
    )
  }
}

// PATCH /api/documents/[id]/shares
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const auth = await verifyVaultAccess(supabase)
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const parsed = updateShareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }

    const { shareId, allowDownload, expiresInHours } = parsed.data
    const expiresAt =
      expiresInHours !== undefined
        ? expiresInHours
          ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
          : null
        : undefined

    const updated = await updateShareSettings(shareId, auth.user.id, {
      allowDownload,
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      share: updated,
    })
  } catch (error: unknown) {
    console.error('[Document Shares API] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update share' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id]/shares
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')

    if (!shareId) {
      return NextResponse.json({ error: 'shareId query parameter is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const auth = await verifyVaultAccess(supabase)
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    await revokeShare(shareId, auth.user.id)

    return NextResponse.json({
      success: true,
      message: 'Share revoked successfully',
    })
  } catch (error: unknown) {
    console.error('[Document Shares API] DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke share' },
      { status: 500 }
    )
  }
}
