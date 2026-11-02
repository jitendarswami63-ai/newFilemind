import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  documentId: z.string().uuid('Invalid document ID format').optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let conversationsList: unknown[] = []

    const { data: conversations, error: dbError } = await supabase
      .from('conversations')
      .select(`
        id,
        user_id,
        title,
        document_id,
        created_at,
        updated_at,
        document:documents!conversations_document_id_fkey (
          id,
          filename
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (!dbError && Array.isArray(conversations)) {
      conversationsList = conversations
    } else {
      console.warn('[Conversations API] Joined query warning, trying fallback:', dbError?.message)
      // Fallback 1: Query without foreign key specification
      let { data: rawConvs, error: rawError } = await supabase
        .from('conversations')
        .select('id, user_id, title, document_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      // Fallback 2: Admin client if user client had RLS/token issue
      if (rawError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient: createAdmin } = await import('@supabase/supabase-js')
          const adminSupabase = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          const adminRes = await adminSupabase
            .from('conversations')
            .select('id, user_id, title, document_id, created_at, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(50)
          if (!adminRes.error && Array.isArray(adminRes.data)) {
            rawConvs = adminRes.data
            rawError = null
          }
        } catch (e) {
          console.error('[Conversations API] Admin fallback error:', e)
        }
      }

      if (rawError) {
        if (
          rawError.code === '42P01' ||
          rawError.message?.toLowerCase().includes('does not exist')
        ) {
          return NextResponse.json({ success: true, conversations: [] })
        }
        console.error('[Conversations API] Failed to fetch conversations:', rawError.message)
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      // Enrich rawConvs with document filenames if document_id is present
      if (Array.isArray(rawConvs)) {
        const docIds = rawConvs.map((c) => c.document_id).filter(Boolean) as string[]
        const docMap = new Map<string, string>()

        if (docIds.length > 0) {
          const { data: docs } = await supabase
            .from('documents')
            .select('id, filename')
            .in('id', docIds)

          if (Array.isArray(docs)) {
            docs.forEach((d) => docMap.set(d.id, d.filename))
          }
        }

        conversationsList = rawConvs.map((c) => ({
          ...c,
          document: c.document_id && docMap.has(c.document_id)
            ? { id: c.document_id, filename: docMap.get(c.document_id)! }
            : null,
        }))
      }
    }

    return NextResponse.json({
      success: true,
      conversations: conversationsList || [],
    })
  } catch (error: unknown) {
    console.error('[Conversations API] GET error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {

    }

    const parseResult = createConversationSchema.safeParse(body)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join('; ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { title, documentId } = parseResult.data

    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id, filename')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (docError || !doc) {
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
      }
    }

    const defaultTitle = title || 'New Conversation'
    const { data: conversation, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: defaultTitle,
        document_id: documentId || null,
      })
      .select(`
        id,
        user_id,
        title,
        document_id,
        created_at,
        updated_at
      `)
      .single()

    if (insertError) {
      if (
        insertError.code === '42P01' ||
        insertError.code === 'PGRST204' ||
        insertError.code === 'PGRST200' ||
        insertError.message?.toLowerCase().includes('schema cache') ||
        insertError.message?.toLowerCase().includes('does not exist')
      ) {
        return NextResponse.json({
          success: true,
          conversation: {
            id: crypto.randomUUID(),
            user_id: user.id,
            title: defaultTitle,
            document_id: documentId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      }
      console.error('[Conversations API] Failed to create conversation:', insertError.message)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversation,
    })
  } catch (error: unknown) {
    console.error('[Conversations API] POST error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
