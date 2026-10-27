import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { indexDocument } from '@/lib/ai/index-document'
import { isSameOrigin } from '@/lib/validation/origin'

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

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Authoritative database ownership check
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, status')
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

  // 3. Trigger Phase 1B background indexing
  after(async () => {
    try {
      await indexDocument(id)
    } catch (err) {
      console.error(`[DocumentIndex] Background reindex error for doc ${id}:`, err)
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Document reindexing scheduled successfully',
  })
}
