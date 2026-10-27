import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocument } from '@/lib/ai/processor'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate using getUser()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Explicit ownership check in database. Never trust body or query params.
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, user_id, status, processing_locked_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // 4. Return 404 if not found or unauthorized
  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // 6. Check retryable states:
  // - pending
  // - failed
  // - processing with stale lease (>10 minutes)
  const isPending = doc.status === 'pending'
  const isFailed = doc.status === 'failed'

  let isStaleProcessing = false
  if (doc.status === 'processing') {
    if (doc.processing_locked_at) {
      const lockTime = new Date(doc.processing_locked_at).getTime()
      const TEN_MINUTES_MS = 10 * 60 * 1000
      if (Date.now() - lockTime > TEN_MINUTES_MS) {
        isStaleProcessing = true
      }
    } else {
      isStaleProcessing = true
    }
  }

  if (doc.status === 'completed') {
    return NextResponse.json(
      { error: 'Document processing has already completed successfully.' },
      { status: 409 }
    )
  }

  // 7. Active processing younger than 10 minutes -> 409 Conflict
  if (doc.status === 'processing' && !isStaleProcessing) {
    return NextResponse.json(
      { error: 'Document is currently being processed. Please wait.' },
      { status: 409 }
    )
  }

  if (!isPending && !isFailed && !isStaleProcessing) {
    return NextResponse.json(
      { error: 'Document is not in a retryable state.' },
      { status: 400 }
    )
  }

  // 8. Trigger background processing via Next.js 16 after()
  after(async () => {
    await processDocument(id)
  })

  // 9. Return success without exposing service-role secrets or processing_token
  return NextResponse.json({
    success: true,
    message: 'Document processing scheduled.',
    documentId: id,
  })
}
