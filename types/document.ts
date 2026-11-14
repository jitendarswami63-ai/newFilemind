export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type FilterStatus = 'all' | 'ready' | 'processing' | 'failed' | 'locked'

export interface DocumentRecord {
  id: string
  user_id: string
  filename: string
  mime_type: string
  file_size: number | null
  original_file_size?: number | null
  storage_path: string
  status: DocumentStatus
  doc_category?: string | null
  tags?: string[] | null
  page_count?: number | null
  is_scanned?: boolean | null
  is_locked?: boolean | null
  locked_at?: string | null
  error_message?: string | null
  processing_locked_at?: string | null
  processing_token?: string | null
  processing_attempts?: number
  created_at: string
  updated_at: string
}

export interface DocumentItem {
  id: string
  filename: string
  status: DocumentStatus
  processing_stage?: string | null
  embedding_status?: 'pending' | 'processing' | 'completed' | 'failed' | null
  extracted_data?: Record<string, unknown> | null
  created_at: string
  file_size: number | null
  original_file_size?: number | null
  storage_path?: string | null
  doc_category?: string | null
  tags?: string[] | null
  is_locked?: boolean | null
  locked_at?: string | null
}

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

export interface SearchResultItem {
  document_id: string
  filename: string
  doc_category?: string
  chunk_id: string
  page_start: number
  page_end: number
  matching_pages?: number[]
  snippet: string
  score: number
  content?: string
}

export interface VerifiedCitation {
  raw: string
  filename: string
  pageStart: number
  pageEnd: number
  verified: boolean
  matchedDocumentId?: string
  unverifiedReason?: string
}

export interface AskAISource {
  document_id: string
  filename: string
  doc_category?: string
  chunk_id: string
  page_start: number
  page_end: number
  matching_pages: number[]
  snippet: string
  score: number
  isCited?: boolean
  verified?: boolean
  verifiedCitationCount?: number
}

export interface AskAIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: AskAISource[]
  hasSufficientEvidence?: boolean
  verifiedCitations?: VerifiedCitation[]
  timestamp: string
  provider?: 'gemini' | 'nvidia'
  model?: string
  latencyMs?: number
}

export interface AskAIQuestionOptions {
  question: string
  documentId?: string
  conversationId?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  provider?: 'gemini' | 'nvidia'
  model?: string
}

export interface AskAIResult {
  answer: string
  sources: AskAISource[]
  hasSufficientEvidence: boolean
  verifiedCitations?: VerifiedCitation[]
  provider?: 'gemini' | 'nvidia'
  model?: string
  latencyMs?: number
}

export interface AskAIRequest {
  question: string
  documentId?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  provider?: 'gemini' | 'nvidia'
  model?: string
}

export interface AskAIResponse {
  success: boolean
  conversationId?: string
  answer: string
  sources: AskAISource[]
  hasSufficientEvidence: boolean
  question: string
  verifiedCitations?: VerifiedCitation[]
  provider?: 'gemini' | 'nvidia'
  model?: string
  latencyMs?: number
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  document_id: string | null
  created_at: string
  updated_at: string
  document?: {
    id: string
    filename: string
  } | null
  message_count?: number
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: AskAISource[]
  verified_citations?: VerifiedCitation[]
  has_sufficient_evidence?: boolean
  created_at: string
}

export interface ConversationWithMessages extends Conversation {
  messages: AskAIMessage[]
}

export interface CreateConversationRequest {
  title?: string
  documentId?: string
}

export interface BiometricCredential {
  id: string
  credential_id: string
  device_name: string
  authenticator_type: string
  aaguid?: string | null
  created_at: string
  last_used_at?: string | null
}

export interface BiometricStatusResponse {
  isSupported: boolean
  hasEnrolledAuthenticator: boolean
  credentials: BiometricCredential[]
  activeLeasesCount: number
}
