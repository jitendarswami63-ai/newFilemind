import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocument } from '@/lib/ai/processor'
import { processUniversalFile } from '@/lib/files/processing-engine'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { documentId?: string } = {}
  try {
    body = await request.json()
  } catch {}

  if (body.documentId) {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, user_id, status, processing_locked_at')
      .eq('id', body.documentId)
      .eq('user_id', user.id)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status === 'completed') {
      return NextResponse.json({
        success: true,
        documentId: doc.id,
        status: 'completed',
        alreadyCompleted: true,
      })
    }

    after(async () => {
      try {
        await processUniversalFile(doc.id)
      } catch (procErr) {
        console.error('[ProcessQueue] Background document processing error:', procErr)
      }
    })

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      scheduled: true,
      status: 'processing',
    })
  }

  const { data: claimedDocs, error: claimError } = await supabase.rpc('claim_next_pending_document', {
    p_user_id: user.id,
  })

  if (claimError) {

    const { data: fallbackDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!fallbackDoc) {
      return NextResponse.json({ success: true, processed: false, reason: 'empty_queue' })
    }

    const processed = await processDocument(fallbackDoc.id)
    return NextResponse.json({
      success: processed,
      documentId: fallbackDoc.id,
      processed: true,
    })
  }

  const claimedDoc = Array.isArray(claimedDocs) && claimedDocs.length > 0 ? claimedDocs[0] : claimedDocs

  if (!claimedDoc || !claimedDoc.document_id) {
    return NextResponse.json({ success: true, processed: false, reason: 'empty_queue' })
  }

  try {
    const processed = await processDocument(claimedDoc.document_id, claimedDoc.processing_token)
    return NextResponse.json({
      success: processed,
      documentId: claimedDoc.document_id,
      processed: true,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json(
      { error: errorMsg, documentId: claimedDoc.document_id },
      { status: 500 }
    )
  }
}
