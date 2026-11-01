import assert from 'node:assert/strict'

console.log('====================================================')
console.log('🧪 FILEMIND CONVERSATION PERSISTENCE SUITE')
console.log('====================================================\n')

let passedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
  }
}

function generateSensibleTitle(question) {
  const clean = question.trim().replace(/^[^a-zA-Z0-9]+/, '')
  const firstSentence = clean.split(/[.?!]\s/)[0] || clean
  const truncated = firstSentence.length > 50 ? firstSentence.slice(0, 47).trim() + '...' : firstSentence
  return (truncated.charAt(0).toUpperCase() + truncated.slice(1)) || 'New Conversation'
}

class MockConversationStore {
  constructor() {
    this.conversations = new Map()
    this.messages = new Map()
    this.documents = new Map()
  }

  seedDocument(doc) {
    this.documents.set(doc.id, doc)
  }

  createConversation({ userId, title, documentId }) {
    if (documentId) {
      const doc = this.documents.get(documentId)
      if (!doc || doc.user_id !== userId) {
        throw new Error('Document not found or access denied')
      }
    }

    const id = `conv-${Math.random().toString(36).substring(2, 9)}`
    const now = new Date().toISOString()
    const conv = {
      id,
      user_id: userId,
      title: title || 'New Conversation',
      document_id: documentId || null,
      created_at: now,
      updated_at: now,
    }
    this.conversations.set(id, conv)
    return { ...conv }
  }

  getConversations(userId) {
    return Array.from(this.conversations.values())
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  getConversation(id, userId) {
    const conv = this.conversations.get(id)
    if (!conv || conv.user_id !== userId) {
      return null
    }
    return { ...conv }
  }

  getMessages(conversationId, userId) {
    const conv = this.getConversation(conversationId, userId)
    if (!conv) {
      throw new Error('Conversation not found or access denied')
    }

    return Array.from(this.messages.values())
      .filter((m) => m.conversation_id === conversationId && m.user_id === userId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        verifiedCitations: m.verified_citations,
        hasSufficientEvidence: m.has_sufficient_evidence,
        timestamp: m.created_at,
      }))
  }

  addMessage({ conversationId, userId, role, content, sources, verifiedCitations, hasSufficientEvidence }) {
    const conv = this.getConversation(conversationId, userId)
    if (!conv) {
      throw new Error('Conversation not found or access denied')
    }

    const existingMsgs = this.getMessages(conversationId, userId)
    const lastMsg = existingMsgs[existingMsgs.length - 1]
    if (role === 'user' && lastMsg && lastMsg.role === 'user' && lastMsg.content === content) {
      return lastMsg
    }

    const id = `msg-${Math.random().toString(36).substring(2, 9)}`
    const now = new Date().toISOString()
    const msg = {
      id,
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      sources: sources || [],
      verified_citations: verifiedCitations || [],
      has_sufficient_evidence: hasSufficientEvidence ?? true,
      created_at: now,
    }
    this.messages.set(id, msg)

    conv.updated_at = now
    this.conversations.set(conversationId, conv)

    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      verifiedCitations: msg.verified_citations,
      hasSufficientEvidence: msg.has_sufficient_evidence,
      timestamp: msg.created_at,
    }
  }

  deleteConversation(id, userId) {
    const conv = this.getConversation(id, userId)
    if (!conv) {
      return false
    }

    for (const [msgId, msg] of this.messages.entries()) {
      if (msg.conversation_id === id) {
        this.messages.delete(msgId)
      }
    }
    this.conversations.delete(id)
    return true
  }
}

test('Scenario 1: Generates sensible capitalized and bounded conversation titles', () => {
  const t1 = generateSensibleTitle('What is the inflation rate in 2024?')
  assert.equal(t1, 'What is the inflation rate in 2024?')

  const t2 = generateSensibleTitle('...explain the core concepts of supply and demand in modern macroeconomics. What are the key formulas?')
  assert.equal(t2.startsWith('Explain the core concepts of supply and demand'), true)
  assert.equal(t2.endsWith('...'), true)
  assert.equal(t2.length <= 50, true)

  const t3 = generateSensibleTitle('   ')
  assert.equal(t3, 'New Conversation')
})

test('Scenario 2: Persisting user questions and assistant responses with metadata', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Economics Overview' })
  assert.ok(conv.id)
  assert.equal(conv.title, 'Economics Overview')

  const userMsg = store.addMessage({
    conversationId: conv.id,
    userId,
    role: 'user',
    content: 'What is microeconomics?',
  })
  assert.equal(userMsg.role, 'user')
  assert.equal(userMsg.content, 'What is microeconomics?')

  const assistantMsg = store.addMessage({
    conversationId: conv.id,
    userId,
    role: 'assistant',
    content: 'Microeconomics studies individual agents [Document: "Econ.pdf", Page: 2].',
    sources: [{ document_id: 'doc-1', filename: 'Econ.pdf', page_start: 2, page_end: 2, snippet: 'text', score: 0.8 }],
    verifiedCitations: [{ filename: 'Econ.pdf', pageStart: 2, verified: true }],
    hasSufficientEvidence: true,
  })

  assert.equal(assistantMsg.role, 'assistant')
  assert.equal(assistantMsg.sources.length, 1)
  assert.equal(assistantMsg.verifiedCitations.length, 1)
  assert.equal(assistantMsg.hasSufficientEvidence, true)

  const messages = store.getMessages(conv.id, userId)
  assert.equal(messages.length, 2)
  assert.equal(messages[0].role, 'user')
  assert.equal(messages[1].role, 'assistant')
  assert.equal(messages[1].verifiedCitations.length, 1)
})

test('Scenario 3: Messages are ordered by created_at ASC and conversations by updated_at DESC', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const c1 = store.createConversation({ userId, title: 'Chat 1' })
  const c2 = store.createConversation({ userId, title: 'Chat 2' })

  store.addMessage({ conversationId: c1.id, userId, role: 'user', content: 'Recent question' })

  const convs = store.getConversations(userId)
  assert.equal(convs[0].id, c1.id, 'Most recently updated conversation must appear first')
  assert.equal(convs[1].id, c2.id)

  store.addMessage({ conversationId: c1.id, userId, role: 'assistant', content: 'Response' })
  store.addMessage({ conversationId: c1.id, userId, role: 'user', content: 'Follow up' })

  const msgs = store.getMessages(c1.id, userId)
  assert.equal(msgs.length, 3)
  assert.equal(msgs[0].content, 'Recent question')
  assert.equal(msgs[1].content, 'Response')
  assert.equal(msgs[2].content, 'Follow up')
})

test('Scenario 4: Restoring conversation messages after simulated navigation/unmount', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Legal Contract Review' })
  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'What are the termination clauses?' })
  store.addMessage({ conversationId: conv.id, userId, role: 'assistant', content: 'Clause 8 allows 30-day notice.' })

  let clientState = { currentConvId: null, messages: [] }

  clientState.currentConvId = conv.id
  clientState.messages = store.getMessages(clientState.currentConvId, userId)

  assert.equal(clientState.messages.length, 2)
  assert.equal(clientState.messages[0].content, 'What are the termination clauses?')
  assert.equal(clientState.messages[1].content, 'Clause 8 allows 30-day notice.')
})

test('Scenario 5: URL query param conversationId rehydrates state without starting new chat', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Quarterly Earnings' })
  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'What was net income?' })

  const urlSearchParams = new URLSearchParams(`conversationId=${conv.id}`)
  const restoredConvId = urlSearchParams.get('conversationId')
  assert.equal(restoredConvId, conv.id)

  const restoredConv = store.getConversation(restoredConvId, userId)
  assert.ok(restoredConv)
  assert.equal(restoredConv.title, 'Quarterly Earnings')

  const restoredMessages = store.getMessages(restoredConvId, userId)
  assert.equal(restoredMessages.length, 1)
  assert.equal(restoredMessages[0].content, 'What was net income?')
})

test('Scenario 6: Continuing conversation resolves follow-up questions with antecedent context', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Neural Networks' })
  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'What is Backpropagation?' })
  store.addMessage({ conversationId: conv.id, userId, role: 'assistant', content: 'Backpropagation computes the gradient of the loss function.' })

  const followUp = 'What are its main mathematical steps?'
  const history = store.getMessages(conv.id, userId)

  const lastUser = [...history].reverse().find((m) => m.role === 'user')
  let enrichedQuery = followUp
  if (/\b(it|its|their|these|why|how so)\b/i.test(followUp)) {
    enrichedQuery = `${lastUser.content} ${followUp}`
  }

  assert.ok(enrichedQuery.includes('Backpropagation'))
  assert.ok(enrichedQuery.includes('main mathematical steps'))

  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: followUp })
  store.addMessage({ conversationId: conv.id, userId, role: 'assistant', content: '1. Forward pass, 2. Error derivative, 3. Weight update.' })

  assert.equal(store.getMessages(conv.id, userId).length, 4)
})

test('Scenario 7: Starting a separate conversation preserves previous chats untouched', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv1 = store.createConversation({ userId, title: 'Chat One' })
  store.addMessage({ conversationId: conv1.id, userId, role: 'user', content: 'Question in Chat 1' })

  const conv2 = store.createConversation({ userId, title: 'Chat Two' })
  store.addMessage({ conversationId: conv2.id, userId, role: 'user', content: 'Question in Chat 2' })

  assert.equal(store.getConversations(userId).length, 2)
  assert.equal(store.getMessages(conv1.id, userId).length, 1)
  assert.equal(store.getMessages(conv2.id, userId).length, 1)
  assert.equal(store.getMessages(conv1.id, userId)[0].content, 'Question in Chat 1')
  assert.equal(store.getMessages(conv2.id, userId)[0].content, 'Question in Chat 2')
})

test('Scenario 8: Deleting a conversation cascades deletion to all associated messages', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Temporary Chat' })
  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'Temp 1' })
  store.addMessage({ conversationId: conv.id, userId, role: 'assistant', content: 'Temp 2' })

  assert.equal(store.getMessages(conv.id, userId).length, 2)

  const deleted = store.deleteConversation(conv.id, userId)
  assert.equal(deleted, true)

  assert.equal(store.getConversation(conv.id, userId), null)
  assert.throws(() => store.getMessages(conv.id, userId), /Conversation not found/)
  assert.equal(store.getConversations(userId).length, 0)
})

test('Scenario 9: Failed AI request does not lose user question, retry succeeds', () => {
  const store = new MockConversationStore()
  const userId = 'user-1'
  const conv = store.createConversation({ userId, title: 'Retry Test' })

  let clientQuestion = 'Why does gradient descent oscillate?'
  let lastQuestionRef = clientQuestion
  let errorState = null

  try {
    store.addMessage({ conversationId: conv.id, userId, role: 'user', content: clientQuestion })
    throw new Error('503 Service Unavailable: Gemini overloaded')
  } catch (err) {
    errorState = err.message
  }

  assert.equal(errorState, '503 Service Unavailable: Gemini overloaded')
  assert.equal(lastQuestionRef, 'Why does gradient descent oscillate?')

  store.addMessage({ conversationId: conv.id, userId, role: 'user', content: lastQuestionRef })
  const msgsAfterRetry = store.getMessages(conv.id, userId)
  assert.equal(msgsAfterRetry.length, 1, 'Retry must not duplicate the user question')

  store.addMessage({ conversationId: conv.id, userId, role: 'assistant', content: 'High learning rates cause oscillation.' })
  assert.equal(store.getMessages(conv.id, userId).length, 2)
})

test('Scenario 10: User A cannot read, modify, or delete User B conversations', () => {
  const store = new MockConversationStore()
  const userA = 'user-alice'
  const userB = 'user-bob'

  const bobConv = store.createConversation({ userId: userB, title: 'Bob Private Financials' })
  store.addMessage({ conversationId: bobConv.id, userId: userB, role: 'user', content: 'What is my secret bonus?' })

  const aliceView = store.getConversation(bobConv.id, userA)
  assert.equal(aliceView, null, 'Alice must not be able to fetch Bob conversation')

  assert.throws(() => store.getMessages(bobConv.id, userA), /Conversation not found or access denied/)

  const deleted = store.deleteConversation(bobConv.id, userA)
  assert.equal(deleted, false, 'Alice must not be able to delete Bob conversation')

  assert.equal(store.getMessages(bobConv.id, userB).length, 1)
})

test('Scenario 11: Scoping conversation to another user document is rejected', () => {
  const store = new MockConversationStore()
  const userA = 'user-alice'
  const userB = 'user-bob'

  store.seedDocument({ id: 'doc-bob-private', user_id: userB, filename: 'Tax_Return.pdf' })

  assert.throws(
    () => {
      store.createConversation({ userId: userA, title: 'Alice Hack', documentId: 'doc-bob-private' })
    },
    /Document not found or access denied/
  )
})

test('Scenario 12: Empty conversation loads cleanly and handles concurrent messages', async () => {
  const store = new MockConversationStore()
  const userId = 'user-1'

  const conv = store.createConversation({ userId, title: 'Empty Chat' })
  const initialMsgs = store.getMessages(conv.id, userId)
  assert.deepEqual(initialMsgs, [], 'Fresh conversation must return empty messages array')

  const promises = [
    Promise.resolve(store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'Parallel 1' })),
    Promise.resolve(store.addMessage({ conversationId: conv.id, userId, role: 'user', content: 'Parallel 2' })),
  ]

  await Promise.all(promises)
  const msgs = store.getMessages(conv.id, userId)
  assert.equal(msgs.length, 2)
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')
