import 'server-only'
import type {
  ProviderGenerateOptions,
  ProviderGenerateResult,
  ProviderChatMessage,
} from './types.ts'
import {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_NIM_BASE_URL,
  CANDIDATE_NVIDIA_MODELS,
  isNvidiaConfigured,
  sanitizeNvidiaError,
  normalizeNvidiaModel,
} from './provider-utils.ts'

export {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_NIM_BASE_URL,
  CANDIDATE_NVIDIA_MODELS,
  isNvidiaConfigured,
  sanitizeNvidiaError,
  normalizeNvidiaModel,
}

export function getNvidiaApiKey(): string {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'NVIDIA_API_KEY is not configured on the server. Please set NVIDIA_API_KEY in your .env.local file to use NVIDIA NIM models.'
    )
  }
  return apiKey.trim()
}

export async function generateWithNvidiaNim(
  options: ProviderGenerateOptions
): Promise<ProviderGenerateResult> {
  const apiKey = getNvidiaApiKey()
  const timeoutMs = options.timeoutMs || 45000
  const temperature = options.temperature ?? 0.2
  const maxTokens = Math.max(options.maxTokens ?? 3072, 4096)

  const primaryModel = normalizeNvidiaModel(
    options.model || process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL
  )

  const modelsToTry = Array.from(
    new Set([primaryModel, ...CANDIDATE_NVIDIA_MODELS.map(normalizeNvidiaModel)])
  )

  const messages: ProviderChatMessage[] = []

  const baseInstruction = options.systemInstruction || ''
  const systemContent = baseInstruction
    ? `${baseInstruction}\n\nIMPORTANT: Provide your final answer directly to the user. Do not include your internal thinking processes or meta-planning.`
    : 'Provide your final answer directly to the user. Do not include your internal thinking processes or meta-planning.'

  messages.push({
    role: 'system',
    content: systemContent,
  })

  if (options.history && options.history.length > 0) {
    for (const turn of options.history) {
      messages.push({
        role: turn.role,
        content: turn.content,
      })
    }
  }

  messages.push({
    role: 'user',
    content: options.prompt,
  })

  let lastError: unknown = null

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const startTime = Date.now()
      try {
        const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p: 0.95,
            stream: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        })

        const latencyMs = Date.now() - startTime

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          const status = response.status

          if ((status === 429 || status === 503) && attempt === 0) {
            console.warn(
              `[NVIDIA NIM] Model ${model} returned HTTP ${status}. Retrying in 1.5s...`
            )
            await new Promise((r) => setTimeout(r, 1500))
            continue
          }

          if (status === 404) {
            console.warn(
              `[NVIDIA NIM] Model ${model} returned 404 Not Found. Trying fallback model...`
            )
            break
          }

          throw new Error(
            `NVIDIA NIM returned HTTP ${status}: ${errorText.slice(0, 200)}`
          )
        }

        const data = await response.json()
        const choice = data.choices?.[0]
        let text = choice?.message?.content

        if (!text || typeof text !== 'string' || !text.trim()) {
          if (choice?.message?.reasoning_content && typeof choice.message.reasoning_content === 'string') {
            text = choice.message.reasoning_content
          } else {
            throw new Error('NVIDIA NIM returned an empty response.')
          }
        }

        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        if (text.startsWith("Here's a thinking process:")) {
          const parts = text.split(/\n\s*---\s*\n|\n\s*###\s+|\n\n(?=[A-Z][a-z]+|\*\*)/)
          if (parts.length > 1) {
            text = parts.slice(1).join('\n\n').trim()
          }
        }

        return {
          text: text.trim(),
          model,
          provider: 'nvidia',
          latencyMs,
        }
      } catch (err: unknown) {
        lastError = err
        const isTimeout =
          err instanceof Error &&
          (err.name === 'TimeoutError' || err.name === 'AbortError')

        console.warn(
          `[NVIDIA NIM] Model ${model} attempt ${attempt + 1}/2 failed:`,
          err instanceof Error ? err.message : String(err).slice(0, 150)
        )

        if (isTimeout && attempt === 0) {
          continue
        }
      }
    }
  }

  throw (
    lastError ||
    new Error('Failed to generate answer from NVIDIA NIM models.')
  )
}
