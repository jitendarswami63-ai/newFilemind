import type { LLMProvider } from './types.ts'

export const DEFAULT_NVIDIA_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct'
export const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'

export const CANDIDATE_NVIDIA_MODELS = [
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  DEFAULT_NVIDIA_MODEL,
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
]

/**
 * Normalizes an NVIDIA NIM model identifier. If the namespace is omitted
 * (e.g. 'nemotron-3.5-lightning-30b-a3b'), prepends the appropriate vendor prefix.
 */
export function normalizeNvidiaModel(model?: string): string {
  if (!model || !model.trim()) return DEFAULT_NVIDIA_MODEL
  const trimmed = model.trim()
  if (trimmed.includes('/')) return trimmed
  if (trimmed.toLowerCase().startsWith('nemotron')) return `nvidia/${trimmed}`
  if (trimmed.toLowerCase().startsWith('llama-3.1-nemotron')) return `nvidia/${trimmed}`
  if (trimmed.toLowerCase().startsWith('llama')) return `meta/${trimmed}`
  return `nvidia/${trimmed}`
}

/**
 * Checks whether an NVIDIA API key is configured.
 */
export function isNvidiaConfigured(key?: string): boolean {
  const apiKey =
    key !== undefined
      ? key
      : process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY
  return Boolean(apiKey && apiKey.trim().length > 0)
}

/**
 * Returns the currently active AI provider from environment settings.
 * Defaults to 'gemini' unless AI_PROVIDER is explicitly set to 'nvidia'.
 */
export function getActiveProvider(): LLMProvider {
  const configured = (process.env.AI_PROVIDER || '').trim().toLowerCase()
  if (configured === 'nvidia' || configured === 'nvidia-nim' || configured === 'nim') {
    return 'nvidia'
  }
  return 'gemini'
}

/**
 * Sanitizes errors originating from NVIDIA NIM calls to protect API credentials and internal details.
 */
export function sanitizeNvidiaError(err: unknown): string {
  if (!err) return 'NVIDIA NIM service encountered an unexpected error.'

  const rawMsg = err instanceof Error ? err.message : String(err)
  const lower = rawMsg.toLowerCase()

  if (lower.includes('nvidia_api_key is not configured')) {
    return 'NVIDIA NIM is not configured. Please add NVIDIA_API_KEY to your .env.local file to enable NVIDIA models.'
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('forbidden') ||
    lower.includes('403') ||
    lower.includes('invalid api key')
  ) {
    return 'NVIDIA NIM authentication failed. Please check that your NVIDIA_API_KEY is active and valid.'
  }

  if (
    lower.includes('quota exceeded') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('too many requests')
  ) {
    return 'NVIDIA NIM request limit reached. Please wait a moment before trying again.'
  }

  if (lower.includes('timeout') || lower.includes('aborted')) {
    return 'NVIDIA NIM generation timed out. Please try asking a more focused question.'
  }

  if (lower.includes('503') || lower.includes('502') || lower.includes('service unavailable')) {
    return 'NVIDIA NIM service is temporarily unavailable. Please retry in a few moments.'
  }

  return 'NVIDIA NIM service encountered an error while analyzing documents. Please try again.'
}
