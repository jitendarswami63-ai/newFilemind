import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askAiQuestion, sanitizeAskAiError } from '@/lib/ai/ask-ai'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { hasActiveBiometricLease } from '@/lib/auth/webauthn'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Question must be at least 2 characters')
    .max(1000, 'Question exceeds maximum length of 1000 characters'),
  documentId: z.string().uuid('Invalid document ID format').optional(),
  conversationId: z.string().uuid('Invalid conversation ID format').optional(),
  provider: z.enum(['gemini', 'nvidia']).optional(),
  model: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000, 'History turn exceeds maximum character limit'),
      })
    )
    .max(12, 'History exceeds maximum number of turns')
    .optional(),
})

function generateSensibleTitle(question: string): string {
  const clean = question.trim().replace(/^[^a-zA-Z0-9]+/, '')
  const firstSentence = clean.split(/[.?!]\s/)[0] || clean
  const truncated = firstSentence.length > 50 ? firstSentence.slice(0, 47).trim() + '...' : firstSentence
  return (truncated.charAt(0).toUpperCase() + truncated.slice(1)) || 'New Conversation'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const auth = await verifyVaultAccess(supabase)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
        { status: auth.status }
      )
    }

    const user = auth.user!

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const parseResult = askSchema.safeParse(body)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join('; ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { question, documentId, conversationId, history, provider, model } = parseResult.data

    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id, filename, status, embedding_status, is_locked')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (docError || !doc) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        )
      }

      if (doc.is_locked) {
        const hasLease = await hasActiveBiometricLease(user.id, documentId)
        if (!hasLease) {
          return NextResponse.json(
            {
              error: 'Biometric authorization required to query this locked document',
              code: 'BIOMETRIC_REQUIRED',
              documentId: doc.id,
              filename: doc.filename,
            },
            { status: 403 }
          )
        }
      }

      if (doc.status === 'processing' || doc.embedding_status === 'processing') {
        return NextResponse.json({
          answer: `The document "${doc.filename}" is currently being processed and indexed for AI search. Please wait until indexing completes before asking questions.`,
          sources: [],
          verifiedCitations: [],
          status: 'indexing_in_progress',
        })
      }

      if (doc.embedding_status === 'failed') {
        return NextResponse.json({
          answer: `The search index for "${doc.filename}" is not available (indexing failed). Please retry indexing from the document view.`,
          sources: [],
          verifiedCitations: [],
          status: 'indexing_failed',
        })
      }

      if (doc.embedding_status !== 'completed') {
        return NextResponse.json({
          answer: `The search index for "${doc.filename}" is pending. Please open the document page to generate the AI search index.`,
          sources: [],
          verifiedCitations: [],
          status: 'indexing_pending',
        })
      }

      if (doc.status !== 'completed') {
        return NextResponse.json({
          answer: `The document "${doc.filename}" is not yet ready for questions (status: ${doc.status}).`,
          sources: [],
          verifiedCitations: [],
          status: 'not_ready',
        })
      }
    }

    let activeConvId: string | undefined = conversationId

    // Helper to get admin client if service role key is available
    const getAdminClient = async () => {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
      const { createClient: createAdmin } = await import('@supabase/supabase-js')
      return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    }

    if (activeConvId) {
      let { data: existingConv, error: convErr } = await supabase
        .from('conversations')
        .select('id, user_id, document_id')
        .eq('id', activeConvId)
        .eq('user_id', user.id)
        .single()

      if ((convErr || !existingConv) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = await getAdminClient()
        if (admin) {
          const adminCheck = await admin
            .from('conversations')
            .select('id, user_id, document_id')
            .eq('id', activeConvId)
            .eq('user_id', user.id)
            .single()
          if (!adminCheck.error && adminCheck.data) {
            existingConv = adminCheck.data
            convErr = null
          }
        }
      }

      if (convErr || !existingConv) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        )
      }
    } else {
      const title = generateSensibleTitle(question)
      try {
        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title,
            document_id: documentId || null,
          })
          .select('id')
          .single()

        if (!newConvErr && newConv) {
          activeConvId = newConv.id
        } else {
          console.warn('[AskAI] User-client conversation create warning:', newConvErr?.message)
          const admin = await getAdminClient()
          if (admin) {
            const { data: adminNewConv, error: adminConvErr } = await admin
              .from('conversations')
              .insert({
                user_id: user.id,
                title,
                document_id: documentId || null,
              })
              .select('id')
              .single()
            if (!adminConvErr && adminNewConv) {
              activeConvId = adminNewConv.id
            } else if (adminConvErr) {
              console.error('[AskAI] Admin-client conversation create error:', adminConvErr.message)
            }
          }
        }
      } catch (convCreateErr: unknown) {
        console.warn('[AskAI] Failed to auto-create conversation in DB:', convCreateErr)
      }

      if (!activeConvId) {
        activeConvId = crypto.randomUUID()
      }
    }

    if (activeConvId) {
      try {
        let { data: lastMsg } = await supabase
          .from('conversation_messages')
          .select('id, role, content')
          .eq('conversation_id', activeConvId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!lastMsg) {
          const admin = await getAdminClient()
          if (admin) {
            const adminLast = await admin
              .from('conversation_messages')
              .select('id, role, content')
              .eq('conversation_id', activeConvId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            if (!adminLast.error && adminLast.data) {
              lastMsg = adminLast.data
            }
          }
        }

        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
          const insertRes = await supabase.from('conversation_messages').insert({
            conversation_id: activeConvId,
            user_id: user.id,
            role: 'user',
            content: question,
          })

          if (insertRes.error) {
            const admin = await getAdminClient()
            if (admin) {
              await admin.from('conversation_messages').insert({
                conversation_id: activeConvId,
                user_id: user.id,
                role: 'user',
                content: question,
              })
            }
          }
        }
      } catch (msgPersistErr: unknown) {
        console.warn('[AskAI] User message persistence warning:', msgPersistErr)
      }
    }

    let historyToUse = history
    if (!historyToUse && activeConvId) {
      try {
        let { data: prevMsgs } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('conversation_id', activeConvId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(10)

        if (!prevMsgs || prevMsgs.length === 0) {
          const admin = await getAdminClient()
          if (admin) {
            const adminMsgs = await admin
              .from('conversation_messages')
              .select('role, content')
              .eq('conversation_id', activeConvId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: true })
              .limit(10)
            if (!adminMsgs.error && adminMsgs.data) {
              prevMsgs = adminMsgs.data
            }
          }
        }

        if (Array.isArray(prevMsgs) && prevMsgs.length > 0) {
          historyToUse = prevMsgs.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        }
      } catch {}
    }

    const result = await askAiQuestion(supabase, {
      question,
      documentId,
      history: historyToUse,
      provider,
      model,
    })

    if (activeConvId) {
      try {
        const assistantPayload = {
          conversation_id: activeConvId,
          user_id: user.id,
          role: 'assistant' as const,
          content: result.answer,
          sources: result.sources || [],
          verified_citations: result.verifiedCitations || [],
          has_sufficient_evidence: result.hasSufficientEvidence,
        }

        const msgRes = await supabase.from('conversation_messages').insert(assistantPayload)
        if (msgRes.error) {
          const admin = await getAdminClient()
          if (admin) {
            await admin.from('conversation_messages').insert(assistantPayload)
          }
        }

        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConvId)
          .eq('user_id', user.id)
      } catch (assistantPersistErr: unknown) {
        console.warn('[AskAI] Assistant message persistence warning:', assistantPersistErr)
      }
    }

    return NextResponse.json({
      success: true,
      conversationId: activeConvId,
      answer: result.answer,
      sources: result.sources,
      hasSufficientEvidence: result.hasSufficientEvidence,
      verifiedCitations: result.verifiedCitations,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      question,
    })
  } catch (error: unknown) {
    console.error('[AskAI] API error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: sanitizeAskAiError(error),
      },
      { status: 500 }
    )
  }
}
