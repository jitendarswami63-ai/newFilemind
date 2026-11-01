export const MAX_AUDIO_BYTES = 25 * 1024 * 1024
export const MIN_AUDIO_BYTES = 100
export const MAX_TTS_TEXT_LENGTH = 5000
export const MAX_RAW_TTS_INPUT_LENGTH = 50000
export const DEEPGRAM_TTS_MAX_CHUNK_CHARS = 1800

export const DEFAULT_STT_MODEL = 'nova-3'
export const DEFAULT_TTS_VOICE = 'aura-asteria-en'

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
]

export function isDeepgramConfigured(apiKey?: string): boolean {
  const key =
    apiKey !== undefined
      ? apiKey
      : process.env.DEEPGRAM_API_KEY ||
        process.env.DEEPGRAM_STT_API_KEY ||
        process.env.DEEPGRAM_TTS_API_KEY
  return Boolean(key && key.trim().length > 0)
}

export function cleanTextForSpeech(text: string): string {
  if (!text) return ''

  let cleaned = text

  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' [code omitted] ')

  cleaned = cleaned.replace(
    /\[(?:(?:Document|Doc):\s*)?["']?[^,"'\n\]]+?["']?,\s*(?:Pages?|p\.?|pp\.?):?\s*\d+(?:\s*[–-]\s*\d+)?(?:\s*\([^)]+\))?\]/gi,
    ''
  )

  cleaned = cleaned.replace(/\((?:Unverified Citation|Unverified)\)/gi, '')

  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')

  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2')
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2')

  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')

  cleaned = cleaned.replace(/^[\s*•-]+\s+/gm, '')
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '')

  cleaned = cleaned.replace(/<[^>]+>/g, '')

  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

export function sanitizeDeepgramError(err: unknown): string {
  if (!err) return 'Audio processing encountered an unknown error. Please try again.'

  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes('deepgram_api_key is not configured')) {
    return 'Voice capabilities are not configured on this server. Please add your DEEPGRAM_API_KEY to .env.local to activate Speech-to-Text and Text-to-Speech.'
  }

  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('invalid credentials') || lower.includes('authentication')) {
    return 'Deepgram authentication failed. Please verify that your DEEPGRAM_API_KEY is valid.'
  }

  if (lower.includes('payment required') || lower.includes('402') || lower.includes('insufficient credits') || lower.includes('quota')) {
    return 'Deepgram voice quota or credits have been exhausted. Please verify your Deepgram billing tier.'
  }

  if (lower.includes('too many requests') || lower.includes('429') || lower.includes('rate limit')) {
    return 'Voice request limit reached. Please wait a moment before trying again.'
  }

  if (lower.includes('413') || lower.includes('payload too large') || lower.includes('character limit')) {
    return 'The spoken text exceeds Deepgram payload limits. The audio response was truncated.'
  }

  if (lower.includes('bad request') || lower.includes('400')) {
    return 'Deepgram could not process this audio format. Please try recording again.'
  }

  return 'Deepgram voice service is temporarily unavailable. Please try again shortly.'
}

export function splitTextIntoTtsChunks(
  text: string,
  maxChunkLength: number = DEEPGRAM_TTS_MAX_CHUNK_CHARS
): string[] {
  if (!text || text.length <= maxChunkLength) {
    return text ? [text] : []
  }

  const chunks: string[] = []
  let remaining = text.trim()

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkLength) {
      chunks.push(remaining)
      break
    }

    const window = remaining.slice(0, maxChunkLength)

    let breakIdx = window.lastIndexOf('\n\n')

    if (breakIdx === -1 || breakIdx < maxChunkLength * 0.3) {
      const sentenceBreaks = [
        window.lastIndexOf('. '),
        window.lastIndexOf('? '),
        window.lastIndexOf('! '),
        window.lastIndexOf('.\n'),
        window.lastIndexOf(';\n'),
      ]
      breakIdx = Math.max(...sentenceBreaks)
      if (breakIdx !== -1) {
        breakIdx += 1
      }
    }

    if (breakIdx === -1 || breakIdx < maxChunkLength * 0.3) {
      breakIdx = window.lastIndexOf(' ')
    }

    if (breakIdx === -1 || breakIdx < maxChunkLength * 0.2) {
      breakIdx = maxChunkLength
    }

    const chunk = remaining.slice(0, breakIdx).trim()
    if (chunk) {
      chunks.push(chunk)
    }
    remaining = remaining.slice(breakIdx).trim()
  }

  return chunks
}

export function truncateTextForSpeech(text: string, maxLength: number = MAX_TTS_TEXT_LENGTH): string {
  if (!text || text.length <= maxLength) return text

  const slice = text.slice(0, maxLength)
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('?\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('; ')
  )

  if (lastBoundary > maxLength * 0.4) {
    return slice.slice(0, lastBoundary + 1).trim()
  }

  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > 0) {
    return slice.slice(0, lastSpace).trim() + '...'
  }

  return slice.trim()
}
