import 'server-only'
import { DeepgramClient } from '@deepgram/sdk'
import {
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  MAX_TTS_TEXT_LENGTH,
  MAX_RAW_TTS_INPUT_LENGTH,
  DEEPGRAM_TTS_MAX_CHUNK_CHARS,
  DEFAULT_STT_MODEL,
  DEFAULT_TTS_VOICE,
  SUPPORTED_AUDIO_MIME_TYPES,
  cleanTextForSpeech,
  truncateTextForSpeech,
  splitTextIntoTtsChunks,
  isDeepgramConfigured,
  sanitizeDeepgramError,
} from './speech-utils.ts'

export {
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  MAX_TTS_TEXT_LENGTH,
  MAX_RAW_TTS_INPUT_LENGTH,
  DEEPGRAM_TTS_MAX_CHUNK_CHARS,
  DEFAULT_STT_MODEL,
  DEFAULT_TTS_VOICE,
  SUPPORTED_AUDIO_MIME_TYPES,
  cleanTextForSpeech,
  truncateTextForSpeech,
  splitTextIntoTtsChunks,
  isDeepgramConfigured,
  sanitizeDeepgramError,
}

export function getDeepgramApiKey(serviceType: 'stt' | 'tts' = 'stt'): string {
  const specificKey =
    serviceType === 'stt'
      ? process.env.DEEPGRAM_STT_API_KEY
      : process.env.DEEPGRAM_TTS_API_KEY

  const fallbackKey =
    serviceType === 'stt'
      ? process.env.DEEPGRAM_TTS_API_KEY
      : process.env.DEEPGRAM_STT_API_KEY

  const key = process.env.DEEPGRAM_API_KEY || specificKey || fallbackKey

  if (!key || !key.trim()) {
    throw new Error(
      'DEEPGRAM_API_KEY is not configured on the server. Please set DEEPGRAM_API_KEY in your .env.local file to enable voice features.'
    )
  }
  return key.trim()
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
  options: { model?: string; language?: string } = {}
): Promise<{ transcript: string; confidence: number; wordsCount: number }> {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Audio recording buffer is empty.')
  }

  if (audioBuffer.length < MIN_AUDIO_BYTES) {
    throw new Error('Audio recording is too short or contains no audio data.')
  }

  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    throw new Error(
      `Audio recording exceeds maximum allowed size of 25MB (received ${(
        audioBuffer.length /
        (1024 * 1024)
      ).toFixed(1)}MB).`
    )
  }

  const apiKey = getDeepgramApiKey('stt')
  const model = options.model || process.env.DEEPGRAM_STT_MODEL || DEFAULT_STT_MODEL
  const cleanMimeType = mimeType.split(';')[0].trim()

  try {
    const deepgram = new DeepgramClient({ apiKey })

    const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model,
      smart_format: true,
      punctuate: true,
      ...(options.language ? { language: options.language } : {}),
    })

    const payload = response as unknown as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string
            confidence?: number
            words?: Array<{ word: string }>
          }>
        }>
      }
      data?: {
        results?: {
          channels?: Array<{
            alternatives?: Array<{
              transcript?: string
              confidence?: number
              words?: Array<{ word: string }>
            }>
          }>
        }
      }
    }

    const results = payload.results || payload.data?.results
    const firstAlternative = results?.channels?.[0]?.alternatives?.[0]
    const rawTranscript = firstAlternative?.transcript || ''
    const confidence = firstAlternative?.confidence ?? 0
    const wordsCount =
      firstAlternative?.words?.length ??
      (rawTranscript.trim() ? rawTranscript.trim().split(/\s+/).length : 0)

    return {
      transcript: rawTranscript.trim(),
      confidence,
      wordsCount,
    }
  } catch (sdkError: unknown) {
    console.warn(
      '[Deepgram] SDK transcribeFile fallback to REST API:',
      sdkError instanceof Error ? sdkError.message : sdkError
    )

    const params = new URLSearchParams({
      model,
      smart_format: 'true',
      punctuate: 'true',
    })
    if (options.language) {
      params.set('language', options.language)
    }

    const restResponse = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': cleanMimeType || 'application/octet-stream',
      },
      body: new Uint8Array(audioBuffer),
    })

    if (!restResponse.ok) {
      const errorText = await restResponse.text().catch(() => '')
      throw new Error(
        `Deepgram STT API responded with HTTP ${restResponse.status}: ${
          errorText || restResponse.statusText
        }`
      )
    }

    const restData = await restResponse.json()
    const firstAlternative = restData?.results?.channels?.[0]?.alternatives?.[0]
    const rawTranscript = firstAlternative?.transcript || ''
    const confidence = firstAlternative?.confidence ?? 0
    const wordsCount =
      firstAlternative?.words?.length ??
      (rawTranscript.trim() ? rawTranscript.trim().split(/\s+/).length : 0)

    return {
      transcript: rawTranscript.trim(),
      confidence,
      wordsCount,
    }
  }
}

async function synthesizeSingleChunk(
  textChunk: string,
  apiKey: string,
  voice: string
): Promise<Buffer> {
  try {
    const deepgram = new DeepgramClient({ apiKey })
    const binaryResponse = await deepgram.speak.v1.audio.generate({
      text: textChunk,
      model: voice,
    })

    const arrayBuf = await binaryResponse.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch (sdkError: unknown) {
    console.warn(
      '[Deepgram] SDK speak fallback to REST API:',
      sdkError instanceof Error ? sdkError.message : sdkError
    )

    const params = new URLSearchParams({
      model: voice,
    })

    const restResponse = await fetch(`https://api.deepgram.com/v1/speak?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: textChunk }),
    })

    if (!restResponse.ok) {
      const errorText = await restResponse.text().catch(() => '')
      throw new Error(
        `Deepgram TTS API responded with HTTP ${restResponse.status}: ${
          errorText || restResponse.statusText
        }`
      )
    }

    const arrayBuf = await restResponse.arrayBuffer()
    return Buffer.from(arrayBuf)
  }
}

export async function synthesizeSpeech(
  text: string,
  options: { voice?: string } = {}
): Promise<{ audioBuffer: Buffer; contentType: string }> {
  const preparedText = cleanTextForSpeech(text)

  if (!preparedText) {
    throw new Error('No spoken content remains after removing citations and formatting.')
  }

  const boundedText = truncateTextForSpeech(preparedText, MAX_TTS_TEXT_LENGTH)

  const apiKey = getDeepgramApiKey('tts')
  const voice = options.voice || process.env.DEEPGRAM_TTS_MODEL || DEFAULT_TTS_VOICE

  const chunks = splitTextIntoTtsChunks(boundedText, DEEPGRAM_TTS_MAX_CHUNK_CHARS)

  if (chunks.length === 0) {
    throw new Error('No spoken content remains after removing citations and formatting.')
  }

  if (chunks.length === 1) {
    const audioBuffer = await synthesizeSingleChunk(chunks[0], apiKey, voice)
    return {
      audioBuffer,
      contentType: 'audio/mpeg',
    }
  }

  const audioBuffers = await Promise.all(
    chunks.map((chunk) => synthesizeSingleChunk(chunk, apiKey, voice))
  )

  const combinedAudio = Buffer.concat(audioBuffers)

  return {
    audioBuffer: combinedAudio,
    contentType: 'audio/mpeg',
  }
}
