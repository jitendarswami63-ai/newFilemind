import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  transcribeAudio,
  sanitizeDeepgramError,
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  SUPPORTED_AUDIO_MIME_TYPES,
} from '@/lib/audio/deepgram'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse multipart form data or request body
    const contentTypeHeader = request.headers.get('content-type') || ''
    let audioBuffer: Buffer
    let mimeType = 'audio/webm'

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData()
      const audioFile = formData.get('file')

      if (!audioFile || !(audioFile instanceof Blob)) {
        return NextResponse.json(
          { error: 'No audio file provided in request.' },
          { status: 400 }
        )
      }

      if (audioFile.type) {
        mimeType = audioFile.type
      }

      const explicitMime = formData.get('mimeType')
      if (typeof explicitMime === 'string' && explicitMime.trim()) {
        mimeType = explicitMime.trim()
      }

      const arrayBuffer = await audioFile.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
    } else {
      // Direct raw binary audio stream
      mimeType = contentTypeHeader.split(';')[0].trim() || 'audio/webm'
      const arrayBuffer = await request.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
    }

    // 3. Validate audio payload size
    if (audioBuffer.length === 0 || audioBuffer.length < MIN_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio recording is empty or corrupt. Please speak into your microphone and try again.' },
        { status: 400 }
      )
    }

    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: `Audio recording exceeds maximum allowed size of 25MB (size: ${(
            audioBuffer.length /
            (1024 * 1024)
          ).toFixed(1)}MB). Please record a shorter question.`,
        },
        { status: 413 }
      )
    }

    // 4. Validate MIME type
    const baseMime = mimeType.split(';')[0].trim().toLowerCase()
    const isSupportedMime =
      SUPPORTED_AUDIO_MIME_TYPES.some((m) => m.toLowerCase().startsWith(baseMime)) ||
      baseMime === 'application/octet-stream'

    if (!isSupportedMime) {
      console.warn(`[Audio Transcribe] Unrecognized audio MIME type: ${mimeType}`)
    }

    // 5. Transcribe using Deepgram STT
    const result = await transcribeAudio(audioBuffer, mimeType)

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      wordsCount: result.wordsCount,
      hasSpeech: Boolean(result.transcript && result.transcript.trim().length > 0),
    })
  } catch (error: unknown) {
    console.error('[Audio Transcribe API] Error:', error instanceof Error ? error.message : error)
    const sanitizedError = sanitizeDeepgramError(error)
    const status = sanitizedError.includes('not configured') ? 503 : 500
    return NextResponse.json({ error: sanitizedError }, { status })
  }
}
