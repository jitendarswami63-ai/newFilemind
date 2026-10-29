export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type FilterStatus = 'all' | 'ready' | 'processing' | 'failed'

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
  created_at: string
  file_size: number | null
  original_file_size?: number | null
  storage_path?: string | null
  doc_category?: string | null
  tags?: string[] | null
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
}

export interface AskAIQuestionOptions {
  question: string
  documentId?: string
  conversationId?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface AskAIResult {
  answer: string
  sources: AskAISource[]
  hasSufficientEvidence: boolean
  verifiedCitations?: VerifiedCitation[]
}

export interface AskAIRequest {
  question: string
  documentId?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface AskAIResponse {
  success: boolean
  conversationId?: string
  answer: string
  sources: AskAISource[]
  hasSufficientEvidence: boolean
  question: string
  verifiedCitations?: VerifiedCitation[]
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
