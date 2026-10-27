import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/ai/service-role-worker'
import { processDocument } from '@/lib/ai/processor'

export const maxDuration = 60

/**
 * Background Cron Worker for Autonomous Queue Draining.
 * Authenticates securely via CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 * Drains pending/stale jobs in bounded batches without requiring an active browser tab.
 */
export async function POST(request: Request) {
  return handleCronWorker(request)
}

export async function GET(request: Request) {
  // Support GET for standard Vercel Cron invocations
  return handleCronWorker(request)
}

async function handleCronWorker(request: Request) {
  const startTime = Date.now()

  // 1. Verify caller authorization strictly using dedicated CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecretHeader = request.headers.get('x-cron-secret')
  const configuredCronSecret = process.env.CRON_SECRET

  if (!configuredCronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 500 }
    )
  }

  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const providedSecret = bearerToken || cronSecretHeader

  if (providedSecret !== configuredCronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: valid CRON_SECRET required' },
      { status: 401 }
    )
  }

  // 2. Bounded batch execution (max 3 documents per invocation to ensure <60s completion)
  const MAX_BATCH_DOCUMENTS = 3
  const results: Array<{ documentId: string; success: boolean; durationMs: number }> = []

  const serviceClient = getServiceRoleClient()

  for (let i = 0; i < MAX_BATCH_DOCUMENTS; i++) {
    // Avoid running past 45s of execution time
    if (Date.now() - startTime > 45_000) {
      console.log(`[CronWorker] Approaching execution deadline (45s), ending batch early after ${results.length} items`)
      break
    }

    try {
      // 3. Atomically claim next pending document across all users via system claim RPC
      const { data: claimedDocs, error: claimError } = await serviceClient.rpc(
        'claim_next_system_pending_document'
      )

      if (claimError) {
        console.error('[CronWorker] Error invoking claim_next_system_pending_document:', claimError)
        break
      }

      const claimedDoc = Array.isArray(claimedDocs) && claimedDocs.length > 0 ? claimedDocs[0] : claimedDocs

      if (!claimedDoc || !claimedDoc.document_id) {
        // Queue is empty
        break
      }

      const docStartTime = Date.now()
      console.log(`[CronWorker] Claimed document ${claimedDoc.document_id} for user ${claimedDoc.user_id}`)

      // 4. Process document with the acquired fencing token
      const processed = await processDocument(claimedDoc.document_id, claimedDoc.processing_token)
      results.push({
        documentId: claimedDoc.document_id,
        success: processed,
        durationMs: Date.now() - docStartTime,
      })
    } catch (docErr) {
      console.error('[CronWorker] Error processing claimed document:', docErr)
    }
  }

  const totalDurationMs = Date.now() - startTime

  return NextResponse.json({
    success: true,
    processedCount: results.length,
    totalDurationMs,
    results,
    emptyQueue: results.length < MAX_BATCH_DOCUMENTS,
  })
}
