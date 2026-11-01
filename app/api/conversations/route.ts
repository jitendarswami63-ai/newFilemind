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

    if (dbError) {
      if (
        dbError.code === '42P01' ||
        dbError.code === 'PGRST204' ||
        dbError.code === 'PGRST200' ||
        dbError.message?.toLowerCase().includes('schema cache') ||
        dbError.message?.toLowerCase().includes('does not exist')
      ) {
        return NextResponse.json({ success: true, conversations: [] })
      }
      console.error('[Conversations API] Failed to fetch conversations:', dbError.message)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || [],
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
