import { NextRequest } from 'next/server'
import { validatePublicShareToken } from '@/lib/sharing/share-service'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const { searchParams } = new URL(request.url)
    const isDownload = searchParams.get('download') === 'true'

    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const clientIp = forwardedFor.split(',')[0].trim()

    const validation = await validatePublicShareToken(token, clientIp)

    if (!validation.valid || !validation.share || !validation.document) {
      if (validation.reason === 'RATE_LIMITED') {
        return new Response('Too many requests. Please try again shortly.', { status: 429 })
      }
      if (validation.reason === 'REVOKED') {
        return new Response('This share link has been revoked.', { status: 410 })
      }
      if (validation.reason === 'EXPIRED') {
        return new Response('This share link has expired.', { status: 410 })
      }
      return new Response('Document share not found.', { status: 404 })
    }

    const { share, document: doc } = validation

    // Enforce download permission server-side
    if (isDownload && !share.allow_download) {
      return new Response(
        JSON.stringify({ error: 'Downloads are disabled for this shared document.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let fileBuffer: Buffer
    try {
      const { buffer } = await storageService.downloadBuffer(
        doc.storage_path,
        (doc.storage_provider as StorageProvider) || undefined
      )
      fileBuffer = buffer
    } catch (downloadError) {
      console.error('[Public Share Content API] Storage download error:', downloadError)
      return new Response('Unable to load document content from storage.', { status: 500 })
    }
    const dispositionType = isDownload ? 'attachment' : 'inline'
    const safeFilename = doc.filename.replace(/["\r\n]/g, '_')

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${safeFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error: unknown) {
    console.error('[Public Share Content API] Unexpected error:', error)
    return new Response('Internal server error loading shared document.', { status: 500 })
  }
}
