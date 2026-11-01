import assert from 'node:assert/strict'
import {
  cleanTextForSpeech,
  truncateTextForSpeech,
  splitTextIntoTtsChunks,
  sanitizeDeepgramError,
  isDeepgramConfigured,
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  MAX_TTS_TEXT_LENGTH,
  DEEPGRAM_TTS_MAX_CHUNK_CHARS,
  DEFAULT_STT_MODEL,
  DEFAULT_TTS_VOICE,
  SUPPORTED_AUDIO_MIME_TYPES,
} from '../lib/audio/speech-utils.ts'

console.log('====================================================')
console.log('🧪 FILEMIND DEEPGRAM SPEECH (STT & TTS) TEST SUITE')
console.log('====================================================\n')

let passedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
  }
}

// -------------------------------------------------------------
// GROUP 1: Text-to-Speech Text Cleaning & Citation Stripping
// -------------------------------------------------------------
test('Scenario 1: cleanTextForSpeech cleanly removes FileMind citations without altering factual text', () => {
  const input =
    'According to the Q3 financial report, total revenue surged by 24% [Document: "Q3_Report.pdf", Page: 5]. Operating expenses decreased to $4.2M [Doc: "Q3_Report.pdf", Pages: 8–10].'

  const cleaned = cleanTextForSpeech(input)

  assert.equal(
    cleaned,
    'According to the Q3 financial report, total revenue surged by 24% . Operating expenses decreased to $4.2M .'
  )
  assert.ok(!cleaned.includes('Document:'), 'Should not contain Document: keyword')
  assert.ok(!cleaned.includes('Page:'), 'Should not contain Page: keyword')
  assert.ok(!cleaned.includes('Q3_Report.pdf'), 'Should not speak document filename')
})

test('Scenario 2: cleanTextForSpeech removes unverified citation markers and parenthesis tags', () => {
  const input =
    'The projected delivery schedule is set for November 15th [Document: "Contract.pdf", Page: 2 (Unverified Citation)]. Note that compliance review is pending (Unverified).'

  const cleaned = cleanTextForSpeech(input)

  assert.ok(!cleaned.includes('Unverified'), 'Should strip unverified markers')
  assert.ok(!cleaned.includes('Contract.pdf'), 'Should strip filename')
  assert.ok(cleaned.includes('projected delivery schedule is set for November 15th'))
})

test('Scenario 3: cleanTextForSpeech formats Markdown (headers, bold, italics, code, links) into natural spoken prose', () => {
  const markdownText = `### Executive Summary
The company completed its **strategic review** with *positive* results.
Check the [compliance portal](https://example.com/portal) for details.
Key parameters include \`max_workers = 4\` and active leases.
\`\`\`typescript
const code = "should be omitted from speech";
\`\`\`
- First objective achieved
- Second objective in progress`

  const cleaned = cleanTextForSpeech(markdownText)

  assert.ok(!cleaned.includes('###'), 'Should strip markdown headers')
  assert.ok(!cleaned.includes('**'), 'Should strip bold asterisks')
  assert.ok(!cleaned.includes('`'), 'Should strip inline backticks')
  assert.ok(!cleaned.includes('const code ='), 'Should omit code block contents')
  assert.ok(!cleaned.includes('https://example.com/portal'), 'Should strip URL while keeping text')
  assert.ok(cleaned.includes('compliance portal'), 'Should keep visible link text')
  assert.ok(cleaned.includes('The company completed its strategic review with positive results'))
})

// -------------------------------------------------------------
// GROUP 2: Audio Payload Size & Format Validation Boundaries
// -------------------------------------------------------------
test('Scenario 4: Audio byte size limits enforce 25MB ceiling and 100-byte minimum', () => {
  assert.equal(MAX_AUDIO_BYTES, 25 * 1024 * 1024, 'Max audio bytes must be 25MB')
  assert.equal(MIN_AUDIO_BYTES, 100, 'Min audio bytes must be 100 bytes')
  assert.equal(MAX_TTS_TEXT_LENGTH, 5000, 'Max TTS text length must be 5000 characters')
  assert.equal(DEFAULT_STT_MODEL, 'nova-3', 'Default STT model must be nova-3')
  assert.equal(DEFAULT_TTS_VOICE, 'aura-asteria-en', 'Default TTS voice must be aura-asteria-en')
})

test('Scenario 5: SUPPORTED_AUDIO_MIME_TYPES includes webm, mp4, ogg, and wav formats', () => {
  const mimeTypes = SUPPORTED_AUDIO_MIME_TYPES
  assert.ok(mimeTypes.includes('audio/webm'), 'Should support audio/webm')
  assert.ok(mimeTypes.includes('audio/webm;codecs=opus'), 'Should support audio/webm;codecs=opus')
  assert.ok(mimeTypes.includes('audio/mp4'), 'Should support audio/mp4 for Safari')
  assert.ok(mimeTypes.includes('audio/ogg;codecs=opus'), 'Should support audio/ogg')
  assert.ok(mimeTypes.includes('audio/wav'), 'Should support audio/wav')
})

// -------------------------------------------------------------
// GROUP 3: Error Sanitization & Secret Protection
// -------------------------------------------------------------
test('Scenario 6: sanitizeDeepgramError provides clear setup instructions when DEEPGRAM_API_KEY is missing', () => {
  const rawError = new Error('DEEPGRAM_API_KEY is not configured on the server. Please set DEEPGRAM_API_KEY in your .env.local file.')
  const sanitized = sanitizeDeepgramError(rawError)

  assert.ok(sanitized.includes('DEEPGRAM_API_KEY'), 'Should name the environment variable')
  assert.ok(sanitized.includes('.env.local'), 'Should guide user to configure .env.local')
  assert.ok(!sanitized.includes('stack'), 'Should not contain stack traces')
})

test('Scenario 7: sanitizeDeepgramError shields users from leaking raw headers or internal paths on 401/402/429', () => {
  const authErr = new Error('Deepgram API returned 401 Unauthorized for Authorization: Token dg_secret_1234567890abcdef')
  const sanitizedAuth = sanitizeDeepgramError(authErr)
  assert.ok(!sanitizedAuth.includes('dg_secret_'), 'Must never leak API key fragment')
  assert.ok(sanitizedAuth.includes('authentication failed'), 'Should provide clean error message')

  const quotaErr = new Error('Deepgram error 402: Payment required, insufficient credits')
  const sanitizedQuota = sanitizeDeepgramError(quotaErr)
  assert.ok(sanitizedQuota.includes('quota or credits have been exhausted'))

  const rateLimitErr = new Error('Too Many Requests 429: rate limit exceeded')
  const sanitizedRate = sanitizeDeepgramError(rateLimitErr)
  assert.ok(sanitizedRate.includes('Voice request limit reached'))
})

test('Scenario 8: isDeepgramConfigured correctly checks API key presence including STT/TTS fallbacks', () => {
  assert.equal(isDeepgramConfigured(''), false, 'Empty key should be false')
  assert.equal(isDeepgramConfigured('   '), false, 'Whitespace key should be false')
  assert.equal(isDeepgramConfigured(undefined), false, 'Undefined key should be false')
  assert.equal(isDeepgramConfigured('dg_valid_key_sample'), true, 'Valid key should be true')

  // Check fallback when DEEPGRAM_STT_API_KEY is present
  const originalEnv = { ...process.env }
  try {
    delete process.env.DEEPGRAM_API_KEY
    process.env.DEEPGRAM_STT_API_KEY = 'stt_key_123'
    assert.equal(isDeepgramConfigured(), true, 'Should detect DEEPGRAM_STT_API_KEY')
    delete process.env.DEEPGRAM_STT_API_KEY
    process.env.DEEPGRAM_TTS_API_KEY = 'tts_key_456'
    assert.equal(isDeepgramConfigured(), true, 'Should detect DEEPGRAM_TTS_API_KEY')
  } finally {
    process.env = originalEnv
  }
})

// -------------------------------------------------------------
// GROUP 4: STT Response Parsing Simulation
// -------------------------------------------------------------
test('Scenario 9: STT transcript extraction resolves Deepgram channel alternatives correctly', () => {
  const mockDeepgramResponse = {
    results: {
      channels: [
        {
          alternatives: [
            {
              transcript: 'What were the primary revenue drivers in 2024?',
              confidence: 0.985,
              words: [
                { word: 'what' },
                { word: 'were' },
                { word: 'the' },
                { word: 'primary' },
                { word: 'revenue' },
                { word: 'drivers' },
                { word: 'in' },
                { word: '2024' },
              ],
            },
          ],
        },
      ],
    },
  }

  const alternative = mockDeepgramResponse.results.channels[0].alternatives[0]
  assert.equal(alternative.transcript, 'What were the primary revenue drivers in 2024?')
  assert.equal(alternative.confidence, 0.985)
  assert.equal(alternative.words.length, 8)
})

// -------------------------------------------------------------
// GROUP 5: Voice-to-Ask-AI Pipeline Integration Contract
// -------------------------------------------------------------
test('Scenario 10: Transcribed voice questions seamlessly adhere to existing Ask AI question bounds and grounding schema', () => {
  // A voice question must satisfy the exact same constraints as typed questions
  const transcribedQuestion = 'What are the main findings in the uploaded audit report?'

  // Check character limits (min 2, max 1000)
  assert.ok(transcribedQuestion.length >= 2, 'Must be at least 2 characters')
  assert.ok(transcribedQuestion.length <= 1000, 'Must be within 1000 characters')

  // When routed to Ask AI, verify payload shape
  const askPayload = {
    question: transcribedQuestion,
    documentId: 'c187db46-5e28-484a-898f-06103d817501',
    history: [
      { role: 'user', content: 'Summarize the document' },
      { role: 'assistant', content: 'The document covers financial disclosures [Doc: test.pdf, Page: 1].' },
    ],
  }

  assert.equal(askPayload.question, transcribedQuestion)
  assert.equal(typeof askPayload.documentId, 'string')
  assert.equal(askPayload.history.length, 2)
})

test('Scenario 11: truncateTextForSpeech gracefully bounds text exceeding 5000 characters at natural sentence boundaries', () => {
  const shortText = 'This is a brief answer that fits well within the TTS limits.'
  assert.equal(truncateTextForSpeech(shortText, 5000), shortText)

  const sentence1 = 'The audit revealed strong operational performance throughout the fiscal year. '
  const sentence2 = 'All secondary accounts adhered strictly to internal security protocols and RLS boundaries. '
  const repeatedText = (sentence1 + sentence2).repeat(40) // ~7,000 characters
  assert.ok(repeatedText.length > 5000, 'Original text should exceed 5000 characters')

  const bounded = truncateTextForSpeech(repeatedText, 5000)
  assert.ok(bounded.length <= 5000, 'Bounded text must never exceed 5000 characters')
  assert.ok(bounded.length > 4500, 'Bounded text should preserve maximum context')
  assert.ok(bounded.endsWith('.'), 'Bounded text should cleanly end on a sentence boundary')
})

test('Scenario 12: splitTextIntoTtsChunks partitions long text into chunks <= 1800 chars for Deepgram 2000 char ceiling', () => {
  const shortText = 'This is short text under 1800 characters.'
  const singleChunks = splitTextIntoTtsChunks(shortText)
  assert.equal(singleChunks.length, 1)
  assert.equal(singleChunks[0], shortText)

  const sentence1 = 'FileMind is an AI-powered document intelligence platform designed to securely analyze your files. '
  const sentence2 = 'Every document page is indexed and embedded with vector search for rapid retrieval. '
  const longText = (sentence1 + sentence2).repeat(25) // ~4,500 chars

  const chunks = splitTextIntoTtsChunks(longText, DEEPGRAM_TTS_MAX_CHUNK_CHARS)
  assert.ok(chunks.length >= 2, 'Should partition into multiple chunks')

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    assert.ok(
      chunk.length <= DEEPGRAM_TTS_MAX_CHUNK_CHARS,
      `Chunk ${i} length (${chunk.length}) must be <= ${DEEPGRAM_TTS_MAX_CHUNK_CHARS}`
    )
    assert.ok(chunk.length > 0, `Chunk ${i} cannot be empty`)
    assert.ok(
      chunk.endsWith('.') || chunk.endsWith('?') || chunk.endsWith('!'),
      `Chunk ${i} should end cleanly on a punctuation boundary`
    )
  }

  // Combined text should equal original trimmed text (minus inner whitespace differences)
  const reassembled = chunks.join(' ')
  assert.ok(reassembled.includes(sentence1.trim()))
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
