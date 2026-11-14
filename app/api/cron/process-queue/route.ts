import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/ai/service-role-worker'
import { processUniversalFile } from '@/lib/files/processing-engine'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleCronWorker(request)
}

export async function GET(request: Request) {

  return handleCronWorker(request)
}

async function handleCronWorker(request: Request) {
  const startTime = Date.now()

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

  const MAX_BATCH_DOCUMENTS = 3
  const results: Array<{ documentId: string; success: boolean; durationMs: number }> = []

  const serviceClient = getServiceRoleClient()

  for (let i = 0; i < MAX_BATCH_DOCUMENTS; i++) {

    if (Date.now() - startTime > 45_000) {
      console.log(`[CronWorker] Approaching execution deadline (45s), ending batch early after ${results.length} items`)
      break
    }

    try {
      const { data: claimedDocs, error: claimError } = await serviceClient.rpc(
        'claim_next_system_pending_document'
      )

      if (claimError) {
        console.error('[CronWorker] Error invoking claim_next_system_pending_document:', claimError)
        break
      }

      const claimedDoc = Array.isArray(claimedDocs) && claimedDocs.length > 0 ? claimedDocs[0] : claimedDocs

      if (!claimedDoc || !claimedDoc.document_id) {
        break
      }

      const docStartTime = Date.now()
      console.log(`[CronWorker] Claimed document ${claimedDoc.document_id} for user ${claimedDoc.user_id}`)

      const processed = await processUniversalFile(claimedDoc.document_id, claimedDoc.processing_token)
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
