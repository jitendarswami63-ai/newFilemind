import 'server-only'
import { GoogleGenAI } from '@google/genai'
import type {
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from './types.ts'

let geminiClient: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (geminiClient) {
    return geminiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server')
  }

  geminiClient = new GoogleGenAI({ apiKey })
  return geminiClient
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
]

export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false
  const msg = String(err instanceof Error ? err.message : err).toLowerCase()
  return (
    msg.includes('exceeded your current quota') ||
    msg.includes('per day limit') ||
    msg.includes('generate_content_free_tier_requests') ||
    msg.includes('daily limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429')
  )
}

export function isTransientError(err: unknown): boolean {
  if (!err) return false
  const msg = String(err instanceof Error ? err.message : err).toLowerCase()
  return (
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('deadline exceeded')
  )
}

/**
 * Generates an answer using Google Gemini models with model cascade and backoff.
 */
export async function generateWithGemini(
  options: ProviderGenerateOptions
): Promise<ProviderGenerateResult> {
  const client = getGeminiClient()
  const candidateModels = Array.from(
    new Set(
      [
        options.model,
        process.env.GEMINI_MODEL,
        ...CANDIDATE_GEMINI_MODELS,
        process.env.GEMINI_FALLBACK_MODEL,
      ].filter(Boolean) as string[]
    )
  )

  let lastError: unknown = null

  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const startTime = Date.now()
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [{ text: options.prompt }],
          config: {
            systemInstruction: options.systemInstruction,
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        })

        const latencyMs = Date.now() - startTime

        if (response && response.text) {
          return {
            text: response.text.trim(),
            model: modelName,
            provider: 'gemini',
            latencyMs,
          }
        }
      } catch (err: unknown) {
        lastError = err
        const isQuota = isQuotaExhaustedError(err)
        const isTransient = isTransientError(err)

        console.warn(
          `[Gemini Provider] Model ${modelName} attempt ${attempt + 1}/3 error:`,
          err instanceof Error ? err.message : String(err).slice(0, 150)
        )

        if (isQuota) {
          break
        }

        if (isTransient && attempt < 2) {
          const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 400
          await new Promise((r) => setTimeout(r, delayMs))
        } else {
          break
        }
      }
    }
  }

  throw (
    lastError ||
    new Error('Failed to generate answer from Gemini models. Please try again.')
  )
}
