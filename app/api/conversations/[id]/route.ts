import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { AskAIMessage, AskAISource, VerifiedCitation } from '@/types'

export const dynamic = 'force-dynamic'

const patchConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  documentId: z.string().uuid().nullable().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: conversation, error: convError } = await supabase
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
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 })
    }

    const { data: dbMessages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('[Conversation Detail API] Failed to fetch messages:', msgError.message)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const formattedMessages: AskAIMessage[] = (dbMessages || []).map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      sources: (m.sources as AskAISource[]) || [],
      verifiedCitations: (m.verified_citations as VerifiedCitation[]) || [],
      hasSufficientEvidence: m.has_sufficient_evidence ?? true,
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))

    return NextResponse.json({
      success: true,
      conversation,
      messages: formattedMessages,
    })
  } catch (error: unknown) {
    console.error('[Conversation Detail API] GET error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parseResult = patchConversationSchema.safeParse(body)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join('; ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { title, documentId } = parseResult.data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) {
      updates.title = title
    }

    if (documentId !== undefined) {
      if (documentId !== null) {

        const { data: doc } = await supabase
          .from('documents')
          .select('id')
          .eq('id', documentId)
          .eq('user_id', user.id)
          .single()

        if (!doc) {
          return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
        }
      }
      updates.document_id = documentId
    }

    const { data: updatedConv, error: updateError } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !updatedConv) {
      return NextResponse.json({ error: 'Conversation not found or failed to update' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConv,
    })
  } catch (error: unknown) {
    console.error('[Conversation Detail API] PATCH error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[Conversation Detail API] Failed to delete conversation:', deleteError.message)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    })
  } catch (error: unknown) {
    console.error('[Conversation Detail API] DELETE error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
