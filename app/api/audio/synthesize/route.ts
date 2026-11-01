import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  synthesizeSpeech,
  sanitizeDeepgramError,
  MAX_RAW_TTS_INPUT_LENGTH,
} from '@/lib/audio/deepgram'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const synthesizeSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text to synthesize cannot be empty.')
    .max(MAX_RAW_TTS_INPUT_LENGTH, `Text exceeds maximum allowed length of ${MAX_RAW_TTS_INPUT_LENGTH} characters.`),
  voice: z.string().optional(),
})

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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const parseResult = synthesizeSchema.safeParse(body)
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join('; ')
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    const { text, voice } = parseResult.data

    const { audioBuffer, contentType } = await synthesizeSpeech(text, { voice })

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=1800',
      },
    })
  } catch (error: unknown) {
    console.error('[Audio Synthesize API] Error:', error instanceof Error ? error.message : error)
    const sanitizedError = sanitizeDeepgramError(error)
    const status = sanitizedError.includes('not configured') ? 503 : 500
    return NextResponse.json({ error: sanitizedError }, { status })
  }
}
