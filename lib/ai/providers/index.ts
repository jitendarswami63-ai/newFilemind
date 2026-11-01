import 'server-only'
import type {
  LLMProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from './types.ts'
import {
  generateWithNvidiaNim,
  getNvidiaApiKey,
} from './nvidia-nim.ts'
import {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_NIM_BASE_URL,
  CANDIDATE_NVIDIA_MODELS,
  isNvidiaConfigured,
  sanitizeNvidiaError,
  getActiveProvider,
  normalizeNvidiaModel,
} from './provider-utils.ts'
import {
  generateWithGemini,
  getGeminiClient,
  isQuotaExhaustedError,
  isTransientError,
} from './gemini.ts'

export * from './types.ts'
export {
  generateWithNvidiaNim,
  getNvidiaApiKey,
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_NIM_BASE_URL,
  CANDIDATE_NVIDIA_MODELS,
  isNvidiaConfigured,
  sanitizeNvidiaError,
  getActiveProvider,
  normalizeNvidiaModel,
  generateWithGemini,
  getGeminiClient,
  isQuotaExhaustedError,
  isTransientError,
}

/**
 * Unified generation entry point for Ask AI.
 * Routes requests to the active provider (Gemini or NVIDIA NIM) with automatic failover resilience.
 */
export async function generateAnswerWithProvider(
  options: ProviderGenerateOptions & { preferredProvider?: LLMProvider }
): Promise<ProviderGenerateResult> {
  const primaryProvider = options.preferredProvider || getActiveProvider()

  if (primaryProvider === 'nvidia') {
    if (!isNvidiaConfigured()) {
      console.warn(
        '[AI Provider] NVIDIA NIM requested via configuration, but NVIDIA_API_KEY is not set. Gracefully falling back to Gemini.'
      )
      return generateWithGemini(options)
    }

    try {
      return await generateWithNvidiaNim(options)
    } catch (nvidiaErr: unknown) {
      console.warn(
        '[AI Provider] NVIDIA NIM generation failed. Evaluating fallback to Gemini:',
        nvidiaErr instanceof Error ? nvidiaErr.message : nvidiaErr
      )

      if (process.env.GEMINI_API_KEY) {
        console.log('[AI Provider] Executing fallback to Gemini provider.')
        return generateWithGemini(options)
      }

      throw nvidiaErr
    }
  }

  // Default: Gemini provider
  try {
    return await generateWithGemini(options)
  } catch (geminiErr: unknown) {
    if (isQuotaExhaustedError(geminiErr) && isNvidiaConfigured()) {
      console.warn(
        '[AI Provider] Gemini quota exhausted. Automatically routing request to NVIDIA NIM fallback.'
      )
      return generateWithNvidiaNim(options)
    }

    throw geminiErr
  }
}
