export type LLMProvider = 'gemini' | 'nvidia'

export interface ProviderChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ProviderGenerateOptions {
  prompt: string
  systemInstruction?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature?: number
  maxTokens?: number
  model?: string
  timeoutMs?: number
}

export interface ProviderGenerateResult {
  text: string
  model: string
  provider: LLMProvider
  latencyMs: number
}
