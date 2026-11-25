import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { indexDocument } from '@/lib/ai/index-document'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { getServerUserEntitlements } from '@/lib/subscription/plan-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized', code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user

  const entitlements = await getServerUserEntitlements(user.id, user.user_metadata, false)
  if (!entitlements.hasAiFeatures) {
    return NextResponse.json(
      {
        error: 'Semantic AI reindexing requires Pro, Elite, or a configured Gemini BYOK key.',
        code: 'PLAN_UPGRADE_REQUIRED',
      },
      { status: 403 }
    )
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, status, embedding_status, embedding_locked_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.status !== 'completed') {
    return NextResponse.json(
      { error: 'Document must be fully processed before it can be indexed' },
      { status: 400 }
    )
  }

  const isResume = request.nextUrl.searchParams.get('resume') === 'true'
  if (isResume) {
    if (doc.embedding_status === 'completed') {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }
    if (doc.embedding_status === 'processing' && doc.embedding_locked_at) {
      const lockAgeMs = Date.now() - new Date(doc.embedding_locked_at).getTime()
      if (lockAgeMs < 2 * 60 * 1000) {
        return NextResponse.json({ success: true, inProgress: true })
      }
    }
    if (doc.embedding_status === 'processing' && !doc.embedding_locked_at && doc.updated_at) {
      const cooldownElapsed = Date.now() - new Date(doc.updated_at).getTime()
      if (cooldownElapsed < 60_000) {
        return NextResponse.json({
          success: true,
          cooldownRemainingMs: 60_000 - cooldownElapsed,
        })
      }
    }
  } else {
    // Manual retry: reset embedding_attempts/lock so acquire_document_indexing allows re-trying after 3 previous attempts
    const { getServiceRoleClient } = await import('@/lib/ai/service-role-worker')
    const adminClient = getServiceRoleClient()
    await adminClient
      .from('documents')
      .update({
        embedding_status: 'pending',
        embedding_attempts: 0,
        embedding_token: null,
        embedding_locked_at: null,
        embedding_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  const byokApiKey =
    typeof user.user_metadata?.byok_gemini_key === 'string' && user.user_metadata.byok_gemini_key.trim()
      ? user.user_metadata.byok_gemini_key.trim()
      : undefined

  after(async () => {
    try {
      await indexDocument(id, byokApiKey)
    } catch (err) {
      console.error(`[DocumentIndex] Background reindex error for doc ${id}:`, err)
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Document reindexing scheduled successfully',
  })
}
