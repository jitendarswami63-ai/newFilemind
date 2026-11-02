'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  History,
  MessageSquare,
  Plus,
  Trash2,
  X,
  Cpu,
  Lock,
  Unlock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AskAIMessage, AskAISource, Conversation } from '@/types'
import { VoiceInputButton } from '@/components/audio/VoiceInputButton'
import { ReadAloudButton } from '@/components/audio/ReadAloudButton'
import { useAudioRecorder } from '@/lib/audio/use-audio-recorder'
import { useAudioPlayer } from '@/lib/audio/use-audio-player'
import { VaultMfaUnlockChallenge } from '@/components/auth/VaultMfaUnlockChallenge'

interface UserDocItem {
  id: string
  filename: string
  embedding_status?: string | null
}

function normalizeDocName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.pdf$/i, '').replace(/[^a-z0-9]/g, '')
}

function renderInlineTextWithCitations(text: string, sources?: AskAISource[]) {
  if (!text) return null

  const citationRegex = /(\[(?:(?:Document|Doc):\s*)?["']?([^,"'\n\]]+?)["']?,\s*(?:Pages?|p\.?|pp\.?):?\s*(\d+)(?:\s*[–-]\s*(\d+))?(?:\s*\((?:Unverified Citation|Unverified)\))?\])/gi

  const parts = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    const rawMatch = match[1]
    const rawFilename = match[2]
    const pageStart = parseInt(match[3], 10)
    const isUnverified = rawMatch.toLowerCase().includes('unverified')

    const cleanName = normalizeDocName(rawFilename)
    const matchedSource = sources?.find((s) => {
      const sClean = normalizeDocName(s.filename)
      return sClean === cleanName || (sClean.length > 5 && (sClean.includes(cleanName) || cleanName.includes(sClean)))
    })

    parts.push({
      type: 'citation',
      raw: rawMatch,
      filename: rawFilename,
      pageStart,
      matchedSource,
      isUnverified,
    })

    lastIndex = match.index + rawMatch.length
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return parts.map((part, pIdx) => {
    if (part.type === 'citation') {
      if (part.matchedSource && !part.isUnverified) {
        return (
          <Link
            key={pIdx}
            href={`/documents/${part.matchedSource.document_id}?page=${part.pageStart}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 rounded-full text-xs font-semibold bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1] hover:bg-[#F8F4EA] hover:border-[#C5A878] transition-all align-baseline shadow-2xs"
            title={`View ${part.matchedSource.filename} on Page ${part.pageStart}`}
          >
            <FileText className="h-3 w-3 inline text-[#9C7D47]" />
            <span>Page {part.pageStart}</span>
            <ArrowRight className="h-2.5 w-2.5 inline text-[#9C7D47]/70" />
          </Link>
        )
      } else {
        return (
          <span
            key={pIdx}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 rounded-full text-xs font-semibold bg-[#FEF8EC] text-[#B45309] border border-[#FDE68A] align-baseline shadow-2xs"
            title={part.isUnverified ? 'Citation could not be verified against retrieved passages' : 'Document not found in vault'}
          >
            <span>{part.filename}, p. {part.pageStart}</span>
            {part.isUnverified && <span className="text-[9px] font-semibold text-[#B45309]">(Unverified)</span>}
          </span>
        )
      }
    }

    const textSegments = (part.content || '').split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g)
    return (
      <React.Fragment key={pIdx}>
        {textSegments.map((seg, sIdx) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return (
              <strong key={sIdx} className="font-semibold text-[#292720]">
                {seg.slice(2, -2)}
              </strong>
            )
          }
          if (seg.startsWith('`') && seg.endsWith('`')) {
            return (
              <code key={sIdx} className="px-1 py-0.5 rounded bg-[#F8F4EA] font-mono text-[12px] text-[#292720] border border-[#E5DED1]">
                {seg.slice(1, -1)}
              </code>
            )
          }
          return seg
        })}
      </React.Fragment>
    )
  })
}

function FormattedAssistantMessage({ content, sources }: { content: string; sources?: AskAISource[] }) {
  if (!content) return null

  const blocks = content.split(/\n\n+/)

  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        const lines = trimmed.split('\n')
        const isList = lines.length > 1 && lines.every((l) => /^[-*•]\s+|^\d+\.\s+/.test(l.trim()))

        if (isList) {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-4 list-disc marker:text-[#9C7D47]">
              {lines.map((line, lIdx) => {
                const itemContent = line.replace(/^[-*•]\s+|^\d+\.\s+/, '')
                return (
                  <li key={lIdx} className="text-sm leading-relaxed text-[#292720]">
                    {renderInlineTextWithCitations(itemContent, sources)}
                  </li>
                )
              })}
            </ul>
          )
        }

        if (/^###\s+/.test(trimmed)) {
          return (
            <h4 key={bIdx} className="text-sm font-bold text-[#292720] mt-3 mb-1">
              {renderInlineTextWithCitations(trimmed.replace(/^###\s+/, ''), sources)}
            </h4>
          )
        }

        if (/^##\s+/.test(trimmed)) {
          return (
            <h3 key={bIdx} className="text-base font-bold text-[#292720] mt-4 mb-1.5">
              {renderInlineTextWithCitations(trimmed.replace(/^##\s+/, ''), sources)}
            </h3>
          )
        }

        return (
          <p key={bIdx} className="text-sm leading-relaxed text-[#292720]">
            {renderInlineTextWithCitations(trimmed, sources)}
          </p>
        )
      })}
    </div>
  )
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

const STARTER_PROMPTS = [
  'Summarize the core topics and conclusions across my documents.',
  'What are the key terms, financial figures, or metrics mentioned?',
  'List any critical dates, deadlines, or schedules specified.',
  'What obligations, requirements, or rules are outlined?',
]

const LOCAL_STORAGE_CONVERSATIONS_KEY = 'filemind_chat_conversations_v1'
const LOCAL_STORAGE_MESSAGES_PREFIX = 'filemind_chat_msgs_'

function getLocalConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalConversations(convs: Conversation[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(convs))
  } catch {}
}

function getLocalMessages(convId: string): AskAIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${convId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalMessages(convId: string, msgs: AskAIMessage[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${convId}`, JSON.stringify(msgs))
  } catch {}
}

function deleteLocalConversation(convId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${convId}`)
    const existing = getLocalConversations()
    const filtered = existing.filter((c) => c.id !== convId)
    saveLocalConversations(filtered)
  } catch {}
}

export default function AskAiPage() {
  const searchParams = useSearchParams()
  const initialDocId = searchParams.get('documentId') || undefined
  const initialDocName = searchParams.get('docName') || undefined
  const initialQuery = searchParams.get('q') || undefined
  const initialConvId = searchParams.get('conversationId') || undefined

  const [question, setQuestion] = useState(initialQuery || '')
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(initialDocId)
  const [selectedDocName, setSelectedDocName] = useState<string | undefined>(initialDocName)
  const [userDocs, setUserDocs] = useState<UserDocItem[]>([])

  const [messages, setMessages] = useState<AskAIMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVaultLocked, setIsVaultLocked] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(initialConvId)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageCounterRef = useRef(0)
  const lastQuestionRef = useRef<string>('')

  const audioPlayer = useAudioPlayer()

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setQuestion((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return transcript
      return `${trimmed} ${transcript}`
    })
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }, [])

  const audioRecorder = useAudioRecorder(handleVoiceTranscript)

  const updateUrlParams = useCallback((convId?: string, docId?: string, docName?: string) => {
    try {
      const params = new URLSearchParams()
      const effDocId = docId !== undefined ? docId : selectedDocId
      const effDocName = docName !== undefined ? docName : selectedDocName

      if (effDocId) params.set('documentId', effDocId)
      if (effDocName) params.set('docName', effDocName)
      if (convId) params.set('conversationId', convId)

      const qs = params.toString()
      const newUrl = qs ? `/ask?${qs}` : '/ask'
      window.history.replaceState(null, '', newUrl)
    } catch {}
  }, [selectedDocId, selectedDocName])

  useEffect(() => {
    async function loadConversations() {
      setLoadingConversations(true)
      try {
        const localList = getLocalConversations()
        let combined = [...localList]

        try {
          const res = await fetch('/api/conversations')
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.conversations) && data.conversations.length > 0) {
              const serverIds = new Set(data.conversations.map((c: Conversation) => c.id))
              const localOnly = localList.filter((c) => !serverIds.has(c.id))
              combined = [...data.conversations, ...localOnly]
              saveLocalConversations(combined)
            }
          }
        } catch {}

        combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        setConversations(combined)
      } catch {} finally {
        setLoadingConversations(false)
      }
    }
    loadConversations()
  }, [])

  useEffect(() => {
    if (!currentConversationId) return
    let isMounted = true

    async function loadConversationData() {
      if (!currentConversationId) return
      setLoadingMessages(true)
      setError(null)
      try {
        let loaded = false
        try {
          const res = await fetch(`/api/conversations/${currentConversationId}`)
          if (res.ok) {
            const data = await res.json()
            if (isMounted && Array.isArray(data.messages) && data.messages.length > 0) {
              setMessages(data.messages)
              saveLocalMessages(currentConversationId, data.messages)
              loaded = true
              if (data.conversation?.document_id) {
                setSelectedDocId(data.conversation.document_id)
                if (data.conversation.document?.filename) {
                  setSelectedDocName(data.conversation.document.filename)
                }
              }
            }
          }
        } catch {}

        if (!loaded) {
          const localMsgs = getLocalMessages(currentConversationId)
          if (isMounted && localMsgs.length > 0) {
            setMessages(localMsgs)
          }
        }
      } catch {} finally {
        if (isMounted) setLoadingMessages(false)
      }
    }

    loadConversationData()
    return () => {
      isMounted = false
    }
  }, [currentConversationId, updateUrlParams])

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch('/api/documents')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.documents)) {
            const completed: UserDocItem[] = data.documents
              .filter((d: { status: string }) => d.status === 'completed')
              .map((d: { id: string; filename: string; embedding_status?: string | null }) => ({
                id: d.id,
                filename: d.filename,
                embedding_status: d.embedding_status,
              }))
            setUserDocs(completed)

            if (initialDocId) {
              const match = completed.find((d) => d.id === initialDocId)
              if (match) setSelectedDocName(match.filename)
            }
          }
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => ({}))
          if (errData.mfaRequired || errData.code === 'MFA_REQUIRED') {
            setIsVaultLocked(true)
          }
        }
      } catch {}
    }
    fetchDocs()
  }, [initialDocId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const toggleSourceExpand = (key: string) => {
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleNewChat = () => {
    audioPlayer.stopAudio()
    audioRecorder.cancelRecording()
    setCurrentConversationId(undefined)
    setMessages([])
    setError(null)
    setQuestion('')
    updateUrlParams(undefined)
    setShowHistoryPanel(false)
  }

  const handleSelectConversation = (conv: Conversation) => {
    if (conv.id === currentConversationId) {
      setShowHistoryPanel(false)
      return
    }
    setCurrentConversationId(conv.id)
    if (conv.document_id) {
      setSelectedDocId(conv.document_id)
      setSelectedDocName(conv.document?.filename)
    }
    updateUrlParams(conv.id, conv.document_id || undefined, conv.document?.filename)
    setShowHistoryPanel(false)
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this conversation? This will remove all associated messages.')) {
      return
    }

    setDeletingConvId(convId)
    try {
      deleteLocalConversation(convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (currentConversationId === convId) {
        handleNewChat()
      }
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE' }).catch(() => {})
    } catch {} finally {
      setDeletingConvId(null)
    }
  }

  const handleSend = async (qToSend?: string) => {
    audioPlayer.stopAudio()
    const text = (qToSend !== undefined ? qToSend : question).trim()
    if (!text || loading) return

    lastQuestionRef.current = text
    setError(null)
    messageCounterRef.current += 1
    const userMsgId = `user-msg-${messageCounterRef.current}`

    const userMessage: AskAIMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: 'Just now',
    }

    const updatedWithUser = [...messages, userMessage]
    setMessages(updatedWithUser)
    setQuestion('')
    setLoading(true)

    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role,
      content: (m.content || '').slice(0, 3000),
    }))

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: text,
          documentId: selectedDocId,
          conversationId: currentConversationId,
          history: historyPayload,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && (data.mfaRequired || data.code === 'MFA_REQUIRED')) {
          setIsVaultLocked(true)
          setShowUnlockModal(true)
          throw new Error('Two-factor authentication (AAL2) required to access Private Vault documents. Unlock your vault to continue.')
        }
        throw new Error(data.error || 'Failed to generate answer')
      }

      const activeConvId =
        currentConversationId ||
        data.conversationId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'local-chat-session')

      if (!currentConversationId || currentConversationId !== activeConvId) {
        setCurrentConversationId(activeConvId)
        updateUrlParams(activeConvId)
      }

      const title = text.length > 45 ? text.slice(0, 42) + '...' : text
      const newConvItem: Conversation = {
        id: activeConvId,
        user_id: '',
        title,
        document_id: selectedDocId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document: selectedDocName ? { id: selectedDocId!, filename: selectedDocName } : null,
      }

      setConversations((prev) => {
        const next = [newConvItem, ...prev.filter((c) => c.id !== activeConvId)]
        saveLocalConversations(next)
        return next
      })

      // Sync with server in background to keep conversations updated
      fetch('/api/conversations')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.conversations) && d.conversations.length > 0) {
            setConversations((current) => {
              const serverIds = new Set(d.conversations.map((c: Conversation) => c.id))
              const localUnsynced = current.filter((c) => !serverIds.has(c.id))
              const merged = [...d.conversations, ...localUnsynced]
              saveLocalConversations(merged)
              return merged
            })
          }
        })
        .catch(() => {})

      messageCounterRef.current += 1
      const assistantMsgId = `assistant-msg-${messageCounterRef.current}`

      const assistantMessage: AskAIMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        hasSufficientEvidence: data.hasSufficientEvidence ?? true,
        verifiedCitations: data.verifiedCitations,
        timestamp: 'Just now',
        provider: data.provider,
        model: data.model,
        latencyMs: data.latencyMs,
      }

      const updatedWithAssistant = [...updatedWithUser, assistantMessage]
      setMessages(updatedWithAssistant)
      saveLocalMessages(activeConvId, updatedWithAssistant)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-6xl mx-auto w-full gap-4 relative">
      {showHistoryPanel && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setShowHistoryPanel(false)}
        />
      )}

      <aside
        className={`${
          showHistoryPanel ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          showHistoryPanel ? 'flex' : 'hidden md:flex'
        } fixed md:static inset-y-0 left-0 z-40 md:z-auto w-72 md:w-64 flex-col bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-md md:shadow-2xs p-3.5 transition-transform duration-200 ease-in-out flex-shrink-0 h-full`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DED1]">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#9C7D47]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#292720]">Conversations</h2>
            {conversations.length > 0 && (
              <span className="text-[10px] font-medium bg-[#FAF5EC] text-[#777064] px-1.5 py-0.5 rounded-full border border-[#E5DED1]">
                {conversations.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowHistoryPanel(false)}
            className="md:hidden p-1 rounded-md text-[#777064] hover:text-[#292720]"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="pt-3 pb-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-9 rounded-xl shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 mt-1">
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-[#777064]">
              <Loader2 className="h-4 w-4 animate-spin text-[#9C7D47] mb-2" />
              <span className="text-xs">Loading history...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#777064] px-2">
              <MessageSquare className="h-6 w-6 text-[#DDD5C7] mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-[#292720]">No conversations yet</p>
              <p className="text-[11px] text-[#777064] mt-1">
                Your past chats and answers will be saved here automatically.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === currentConversationId
              const isDeleting = deletingConvId === conv.id

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#FAF5EC] text-[#292720] font-semibold border-l-2 border-[#9C7D47] shadow-2xs'
                      : 'text-[#777064] hover:bg-[#F8F4EA] hover:text-[#292720]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-6">
                    <span className="truncate leading-snug">{conv.title}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#777064] font-normal">
                      <span>{formatRelativeTime(conv.updated_at)}</span>
                      {conv.document && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[100px] text-[#9C7D47]" title={conv.document.filename}>
                            {conv.document.filename}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FDF2F2] text-[#777064] hover:text-[#B91C1C] transition-all absolute right-2"
                    title="Delete conversation"
                    aria-label={`Delete ${conv.title}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B91C1C]" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs relative overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="p-2 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] hover:bg-[#FAF5EC] text-[#292720] transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
              title={showHistoryPanel ? 'Hide conversation history' : 'Show conversation history'}
              aria-label="Toggle conversation history"
            >
              <History className="h-4 w-4 text-[#9C7D47]" />
              <span className="text-xs font-semibold hidden sm:inline">History</span>
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#292720] tracking-tight flex items-center gap-2 truncate">
                <span>Ask AI Assistant</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] uppercase tracking-wider hidden lg:inline-block">
                  Grounded Citations
                </span>
              </h1>
              <p className="text-[11px] text-[#777064] truncate hidden sm:block">
                Ask questions across documents with verified citations and automatic history persistence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <select
                value={selectedDocId || ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (val) {
                    setSelectedDocId(val)
                    const found = userDocs.find((d) => d.id === val)
                    setSelectedDocName(found?.filename)
                    updateUrlParams(currentConversationId, val, found?.filename)
                  } else {
                    setSelectedDocId(undefined)
                    setSelectedDocName(undefined)
                    updateUrlParams(currentConversationId, undefined, undefined)
                  }
                }}
                className="w-48 sm:w-56 h-8 sm:h-9 px-2.5 text-xs bg-[#FFFCF5] border border-[#E5DED1] rounded-xl text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:ring-1 focus:ring-[#C5A878]/30 cursor-pointer shadow-2xs"
              >
                <option value="">All Documents in Vault</option>
                {userDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename} {doc.embedding_status === 'completed' ? '' : '(Indexing Pending)'}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="h-8 sm:h-9 px-2.5 text-xs rounded-xl flex items-center gap-1.5 text-[#292720] bg-[#FFFCF5] border border-[#E5DED1] hover:bg-[#FAF5EC]"
              title="Start a new chat"
            >
              <Plus className="h-3.5 w-3.5 text-[#9C7D47]" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </div>

        {selectedDocId && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs text-[#9C7D47] w-fit flex-shrink-0">
            <BookOpen className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>Restricted to: <strong>{selectedDocName || 'Selected Document'}</strong></span>
            <button
              onClick={() => {
                setSelectedDocId(undefined)
                setSelectedDocName(undefined)
                updateUrlParams(currentConversationId, undefined, undefined)
              }}
              className="text-[#777064] hover:text-[#292720] ml-1 text-xs cursor-pointer"
              title="Clear scope restriction"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-1 sm:px-2 space-y-4 rounded-xl min-h-0">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-[#777064]">
              <Loader2 className="h-6 w-6 animate-spin text-[#9C7D47] mb-2" />
              <p className="text-xs font-medium text-[#292720]">Restoring conversation messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-3 shadow-2xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#292720] mb-1.5">How can I assist with your documents?</h2>
              <p className="text-xs sm:text-sm text-[#777064] max-w-lg mb-6 leading-relaxed">
                Ask questions about your uploaded documents. Answers are grounded in verified passages with direct page references, and saved automatically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl text-left">
                {STARTER_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(promptText)}
                    className="p-3 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] hover:border-[#C5A878] hover:bg-[#FAF5EC] text-xs text-[#292720] transition-all shadow-2xs group cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span>{promptText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#DDD5C7] group-hover:text-[#9C7D47] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1 w-full text-[11px] text-[#777064] px-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {message.role === 'user' ? (
                      <span className="font-semibold text-[#292720]">You</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#9C7D47] font-semibold">
                        <Sparkles className="h-3 w-3" />
                        <span>FileMind AI</span>
                      </span>
                    )}
                    {message.model && (
                      <span
                        title={`Provider: ${message.provider || 'unknown'} | Model: ${message.model}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47]"
                      >
                        <Cpu className="h-2.5 w-2.5 text-[#9C7D47]" />
                        <span>{message.model.replace(/^(nvidia|meta)\//, '')}</span>
                        {typeof message.latencyMs === 'number' && (
                          <span className="text-[#777064] font-sans">• {(message.latencyMs / 1000).toFixed(1)}s</span>
                        )}
                      </span>
                    )}
                    {message.timestamp && <span>• {message.timestamp}</span>}
                  </div>
                  {message.role === 'assistant' && (
                    <ReadAloudButton
                      messageId={message.id}
                      content={message.content}
                      activeMessageId={audioPlayer.activeMessageId}
                      status={audioPlayer.status}
                      playerError={audioPlayer.playerError}
                      onPlay={audioPlayer.playMessageSpeech}
                      onPause={audioPlayer.pauseAudio}
                      onResume={audioPlayer.resumeAudio}
                      onStop={audioPlayer.stopAudio}
                      onClearError={audioPlayer.clearError}
                    />
                  )}
                </div>

                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-2xs ${
                    message.role === 'user'
                      ? 'bg-[#24262B] text-[#F5F1E9] border border-[#3E4149]'
                      : 'bg-[#FFFCF5] border border-[#E5DED1] text-[#292720]'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  ) : (
                    <FormattedAssistantMessage content={message.content} sources={message.sources} />
                  )}

                  {message.role === 'assistant' && message.hasSufficientEvidence === false && (
                    <div className="mt-3.5 p-2.5 rounded-xl bg-[#FEF8EC] border border-[#FDE68A] flex items-start gap-2 text-[#B45309] text-xs">
                      <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B45309]" />
                      <div>
                        <span className="font-semibold">Notice: Insufficient Document Grounding.</span>
                        <p className="mt-0.5 text-[#B45309]/90">
                          The current indexed documents do not contain direct evidence for all parts of this question.
                        </p>
                      </div>
                    </div>
                  )}

                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (() => {
                    const citedCount = message.sources.filter((s) => s.isCited).length
                    return (
                      <div className="mt-4 pt-3 border-t border-[#E5DED1] space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#777064]">
                          <span className="font-semibold flex items-center gap-1.5 text-[#292720]">
                            <ShieldCheck className={`h-3.5 w-3.5 ${citedCount > 0 ? 'text-[#9C7D47]' : 'text-[#777064]'}`} />
                            <span>
                              {citedCount > 0
                                ? `Evidence Sources (${citedCount} verified citation${citedCount > 1 ? 's' : ''}, ${message.sources.length} retrieved)`
                                : `Retrieved Document Evidence (${message.sources.length})`}
                            </span>
                          </span>
                          <span className="text-[10px] text-[#777064]">Click source to view page</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {message.sources.map((src, idx) => {
                            const pageLabel =
                              src.page_start === src.page_end
                                ? `Page ${src.page_start}`
                                : `Pages ${src.page_start}–${src.page_end}`
                            const expandKey = `${message.id}-${src.chunk_id || idx}`
                            const isExpanded = !!expandedSources[expandKey]

                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl bg-[#FAF5EC] border transition-all flex flex-col justify-between gap-1.5 shadow-2xs ${
                                  src.isCited ? 'border-[#C5A878]/60 hover:border-[#9C7D47]' : 'border-[#E5DED1] hover:border-[#DDD5C7]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${src.isCited ? 'text-[#9C7D47]' : 'text-[#777064]'}`} />
                                    <span className="text-xs font-semibold text-[#292720] truncate" title={src.filename}>
                                      {src.filename}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {src.isCited ? (
                                      <span className="text-[10px] font-semibold text-[#9C7D47] bg-[#FFFCF5] border border-[#E5DED1] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                        <CheckCircle2 className="h-3 w-3 text-[#9C7D47]" />
                                        <span>Cited</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-[#777064] bg-[#FFFCF5] border border-[#E5DED1] px-1.5 py-0.5 rounded-md">
                                        Context
                                      </span>
                                    )}
                                    <span className="text-[10px] font-semibold text-[#777064] bg-[#FFFCF5] border border-[#E5DED1] px-1.5 py-0.5 rounded-md">
                                      {pageLabel}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-[11px] text-[#777064] italic line-clamp-2">
                                  &ldquo;{src.snippet.slice(0, 150)}&hellip;&rdquo;
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-[#E5DED1] text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => toggleSourceExpand(expandKey)}
                                    className="text-[#777064] hover:text-[#292720] flex items-center gap-1 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <span>Hide passage</span>
                                        <ChevronUp className="h-3 w-3" />
                                      </>
                                    ) : (
                                      <>
                                        <span>Read passage</span>
                                        <ChevronDown className="h-3 w-3" />
                                      </>
                                    )}
                                  </button>

                                  <Link
                                    href={`/documents/${src.document_id}?page=${src.page_start}`}
                                    target="_blank"
                                    className="text-[#9C7D47] hover:underline font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span>Open Page {src.page_start}</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </div>

                                {isExpanded && (
                                  <div className="mt-2 p-2 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] text-[11px] text-[#292720] font-mono leading-relaxed whitespace-pre-wrap">
                                    {src.snippet}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] w-fit text-[#292720] text-xs shadow-2xs">
              <Loader2 className="h-4 w-4 animate-spin text-[#9C7D47]" />
              <div className="flex flex-col">
                <span className="font-semibold text-[#292720]">Analyzing documents & synthesizing verified citations...</span>
                <span className="text-[10px] text-[#777064]">Grounded via FileMind Neural Retrieval Engine</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-center justify-between gap-3 text-xs text-[#B91C1C]">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSend(lastQuestionRef.current)}
                className="text-xs h-7 px-2.5 rounded-lg border-[#F8D7DA] text-[#B91C1C] hover:bg-[#FDF2F2]"
              >
                Retry
              </Button>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {isVaultLocked && (
          <div className="p-3 mb-2 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] flex items-center justify-between gap-3 text-xs text-[#B45309] shadow-2xs">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#B45309] shrink-0" />
              <span>Private Vault is locked with 2FA. Unlock with Google Authenticator to ask questions about your documents.</span>
            </div>
            <Button
              size="sm"
              onClick={() => setShowUnlockModal(true)}
              className="bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] text-xs h-7 px-3 shrink-0"
            >
              <Unlock className="h-3.5 w-3.5 mr-1" />
              Unlock Vault
            </Button>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs relative flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedDocName
                    ? `Ask a question grounded in ${selectedDocName}...`
                    : 'Ask a question about any topic across your uploaded documents...'
                }
                maxLength={1000}
                disabled={loading}
                className="w-full bg-[#F8F4EA] border border-[#E5DED1] rounded-xl p-2.5 text-xs sm:text-sm text-[#292720] placeholder-[#777064]/70 focus:outline-none focus:border-[#9C7D47] focus:ring-1 focus:ring-[#C5A878]/30 resize-none transition-all"
              />
              <div className="absolute right-2.5 bottom-2 text-[10px] text-[#777064] font-mono">
                {question.length}/1000
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <VoiceInputButton
                isRecording={audioRecorder.isRecording}
                isTranscribing={audioRecorder.isTranscribing}
                recordingDuration={audioRecorder.recordingDuration}
                maxDuration={audioRecorder.maxDuration}
                error={audioRecorder.error}
                disabled={loading}
                onStart={audioRecorder.startRecording}
                onStop={audioRecorder.stopAndTranscribe}
                onCancel={audioRecorder.cancelRecording}
                onClearError={audioRecorder.clearError}
              />

              <Button
                type="submit"
                disabled={loading || !question.trim() || audioRecorder.isRecording || audioRecorder.isTranscribing}
                className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs border border-[#856837] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Ask AI</span>
              </Button>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] text-[#777064] mt-2 px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="flex items-center gap-1 text-[#9C7D47]">
              <CheckCircle2 className="h-3 w-3 text-[#9C7D47]" />
              <span>Grounded in your vault</span>
            </span>
          </div>
        </div>

        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1D21]/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="absolute top-4 right-4 z-10 p-1 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <VaultMfaUnlockChallenge
                onUnlocked={async () => {
                  setIsVaultLocked(false)
                  setShowUnlockModal(false)
                  setError(null)
                  try {
                    const res = await fetch('/api/documents')
                    if (res.ok) {
                      const data = await res.json()
                      if (Array.isArray(data.documents)) {
                        const completed: UserDocItem[] = data.documents
                          .filter((d: { status: string }) => d.status === 'completed')
                          .map((d: { id: string; filename: string; embedding_status?: string | null }) => ({
                            id: d.id,
                            filename: d.filename,
                            embedding_status: d.embedding_status,
                          }))
                        setUserDocs(completed)
                      }
                    }
                  } catch {}
                  try {
                    const convRes = await fetch('/api/conversations')
                    if (convRes.ok) {
                      const convData = await convRes.json()
                      if (Array.isArray(convData.conversations)) {
                        setConversations(convData.conversations)
                      }
                    }
                  } catch {}
                  if (lastQuestionRef.current) {
                    handleSend(lastQuestionRef.current)
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
