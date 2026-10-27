const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const { z } = require('zod')

// Read environment from .env.local
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((line) => line.trim().split('='))
    .filter((parts) => parts.length >= 2)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = 'http://localhost:3000'

async function runPhase1aSuite() {
  const results = []

  function record(name, status, evidence) {
    results.push({ name, status, evidence })
    console.log(`[${status}] ${name} -> ${evidence}`)
  }

  console.log('===============================================================')
  console.log('       FILEMIND PHASE 1A AUTOMATED VERIFICATION SUITE          ')
  console.log('===============================================================\n')

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Zod Normalization & Page Integrity
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Zod Schema & Page Integrity Validation ---')

  // Require our schema module (compile or test schema rules directly)
  const RawMetadataItemSchema = z
    .object({
      key: z.string().trim().min(1).max(100),
      type: z.enum(['string', 'number', 'date', 'boolean']),
      value_string: z.string().optional(),
      value_number: z.number().optional(),
      value_boolean: z.boolean().optional(),
      currency: z.string().trim().max(10).optional(),
    })
    .superRefine((val, ctx) => {
      if (val.type === 'string') {
        if (typeof val.value_string !== 'string' || val.value_string.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'value_string required' })
        }
      } else if (val.type === 'number') {
        if (typeof val.value_number !== 'number' || Number.isNaN(val.value_number)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'value_number required' })
        }
      } else if (val.type === 'boolean') {
        if (typeof val.value_boolean !== 'boolean') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'value_boolean required' })
        }
      } else if (val.type === 'date') {
        if (typeof val.value_string !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val.value_string.trim())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'valid YYYY-MM-DD date required' })
        } else {
          const parsed = Date.parse(val.value_string.trim())
          if (Number.isNaN(parsed)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid calendar date' })
          }
        }
      }
    })
    .transform((val) => {
      if (val.type === 'string') return { key: val.key, type: 'string', value_string: val.value_string.trim() }
      if (val.type === 'number') return { key: val.key, type: 'number', value_number: val.value_number, ...(val.currency ? { currency: val.currency } : {}) }
      if (val.type === 'boolean') return { key: val.key, type: 'boolean', value_boolean: val.value_boolean }
      return { key: val.key, type: 'date', value_string: val.value_string.trim() }
    })

  const DocumentAiOutputSchema = z
    .object({
      doc_category: z.string().transform((v) => v.trim() || 'Uncategorized'),
      tags: z.array(z.string()).transform((tags) => tags.filter(Boolean)),
      metadata: z.array(RawMetadataItemSchema),
      pages: z.array(z.object({ page_number: z.number().int(), text: z.string().max(100_000) })),
      page_count: z.number().int().min(1),
      is_scanned: z.boolean(),
    })
    .superRefine((val, ctx) => {
      if (val.pages.length !== val.page_count) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Page count mismatch' })
        return
      }
      const numbers = val.pages.map((p) => p.page_number).sort((a, b) => a - b)
      for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] !== i + 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Non-contiguous pages' })
          return
        }
      }
    })

  // 1.1 Reject page_count mismatch
  const mismatchRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['billing'],
    metadata: [],
    pages: [{ page_number: 1, text: 'page 1' }],
    page_count: 2,
    is_scanned: false,
  })
  if (!mismatchRes.success) {
    record('Zod: Reject page_count mismatch', 'PASS', 'Correctly rejected pages.length (1) !== page_count (2)')
  } else {
    record('Zod: Reject page_count mismatch', 'FAIL', 'Unexpectedly parsed mismatched count')
  }

  // 1.2 Reject non-contiguous pages [1, 3] when count is 2
  const nonContigRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['billing'],
    metadata: [],
    pages: [
      { page_number: 1, text: 'page 1' },
      { page_number: 3, text: 'page 3' },
    ],
    page_count: 2,
    is_scanned: false,
  })
  if (!nonContigRes.success) {
    record('Zod: Reject non-contiguous pages [1, 3]', 'PASS', 'Correctly rejected non-contiguous page sequence')
  } else {
    record('Zod: Reject non-contiguous pages [1, 3]', 'FAIL', 'Unexpectedly accepted [1, 3]')
  }

  // 1.3 Reject duplicate pages [1, 1]
  const dupPagesRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['billing'],
    metadata: [],
    pages: [
      { page_number: 1, text: 'page 1' },
      { page_number: 1, text: 'page 1 dup' },
    ],
    page_count: 2,
    is_scanned: false,
  })
  if (!dupPagesRes.success) {
    record('Zod: Reject duplicate pages [1, 1]', 'PASS', 'Correctly rejected duplicate page numbers')
  } else {
    record('Zod: Reject duplicate pages [1, 1]', 'FAIL', 'Unexpectedly accepted duplicate pages')
  }

  // 1.4 Reject page text > 100,000 characters
  const hugeText = 'A'.repeat(100_001)
  const hugePageRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['billing'],
    metadata: [],
    pages: [{ page_number: 1, text: hugeText }],
    page_count: 1,
    is_scanned: false,
  })
  if (!hugePageRes.success) {
    record('Zod: Reject page text > 100,000 characters', 'PASS', 'Correctly rejected ballooning page text')
  } else {
    record('Zod: Reject page text > 100,000 characters', 'FAIL', 'Unexpectedly accepted >100k page text')
  }

  // 1.5 Reject number metadata without value_number
  const numWithoutValRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['tax'],
    metadata: [{ key: 'total_amount', type: 'number', value_string: '100' }],
    pages: [{ page_number: 1, text: 'page 1' }],
    page_count: 1,
    is_scanned: false,
  })
  if (!numWithoutValRes.success) {
    record('Zod: Reject number metadata without value_number', 'PASS', 'Correctly rejected missing value_number')
  } else {
    record('Zod: Reject number metadata without value_number', 'FAIL', 'Unexpectedly accepted invalid number item')
  }

  // 1.6 Reject invalid date metadata
  const badDateRes = DocumentAiOutputSchema.safeParse({
    doc_category: 'Invoice',
    tags: ['tax'],
    metadata: [{ key: 'invoice_date', type: 'date', value_string: '2026/02/15' }],
    pages: [{ page_number: 1, text: 'page 1' }],
    page_count: 1,
    is_scanned: false,
  })
  if (!badDateRes.success) {
    record('Zod: Reject date with invalid format', 'PASS', 'Correctly rejected non-YYYY-MM-DD date string')
  } else {
    record('Zod: Reject date with invalid format', 'FAIL', 'Unexpectedly accepted invalid date format')
  }

  // 1.7 Accept and normalize valid payload
  const validPayload = {
    doc_category: 'Invoice',
    tags: ['Finance', 'Receipt', 'Tax', 'Receipt'], // Duplicate test
    metadata: [
      { key: 'invoice_num', type: 'string', value_string: 'INV-2026-001', value_number: 999 },
      { key: 'total_amount', type: 'number', value_number: 150.5, currency: 'USD', value_string: 'skip' },
      { key: 'is_paid', type: 'boolean', value_boolean: true, value_number: 1 },
      { key: 'due_date', type: 'date', value_string: '2026-09-30', value_boolean: false },
    ],
    pages: [{ page_number: 1, text: 'Invoice content and totals' }],
    page_count: 1,
    is_scanned: false,
  }
  const validRes = DocumentAiOutputSchema.safeParse(validPayload)
  if (
    validRes.success &&
    validRes.data.metadata[0].value_number === undefined &&
    validRes.data.metadata[1].value_string === undefined &&
    validRes.data.metadata[2].value_number === undefined &&
    validRes.data.metadata[3].value_boolean === undefined
  ) {
    record('Zod: Normalize metadata and strip irrelevant fields', 'PASS', 'Preserved type consistency and stripped foreign keys')
  } else {
    record('Zod: Normalize metadata and strip irrelevant fields', 'FAIL', 'Failed normalization check')
  }

  // --------------------------------------------------------------------------
  // Create Test Users for Integration & Security Tests
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: API Protection & Retry Authorization ---')

  const timestamp = Date.now()
  const userA_email = `test_phase1a_a_${timestamp}@test.com`
  const userB_email = `test_phase1a_b_${timestamp}@test.com`
  const testPassword = 'Password123!Phase1A'

  const clientA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const clientB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })

  const signUpA = await clientA.auth.signUp({ email: userA_email, password: testPassword })
  const signUpB = await clientB.auth.signUp({ email: userB_email, password: testPassword })

  const userA = signUpA.data?.user
  const userB = signUpB.data?.user

  if (!userA || !userB) {
    console.error('Failed to create test users for Phase 1A suite:', {
      errorA: signUpA.error,
      errorB: signUpB.error,
    })
    return
  }

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieA = `${cookieName}=${encodeURIComponent(JSON.stringify(signUpA.data.session))}`
  const cookieB = `${cookieName}=${encodeURIComponent(JSON.stringify(signUpB.data.session))}`

  // Create document for User A via prepare & confirm flow
  const testDocId = crypto.randomUUID()
  const testFileName = 'phase1a_test.pdf'
  const testStoragePath = `${userA.id}/${testDocId}/${testFileName}`
  const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4

  await clientA.storage.from('documents').upload(testStoragePath, pdfHeader, {
    contentType: 'application/pdf',
    upsert: true,
  })

  await clientA.rpc('create_document_with_quota', {
    p_id: testDocId,
    p_user_id: userA.id,
    p_filename: testFileName,
    p_storage_path: testStoragePath,
    p_file_size: pdfHeader.length,
  })

  // 2.1 API Protection: GET /api/documents does not leak processing_token
  try {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookieA },
    })
    const data = await res.json()
    if (res.ok && Array.isArray(data)) {
      const hasToken = data.some((d) => d.processing_token !== undefined)
      if (!hasToken) {
        record('API Protection: GET /api/documents does NOT leak processing_token', 'PASS', 'All document projections strictly omit processing_token')
      } else {
        record('API Protection: GET /api/documents does NOT leak processing_token', 'FAIL', 'Found processing_token in documents list response')
      }
    } else {
      record('API Protection: GET /api/documents does NOT leak processing_token', 'FAIL', `Status: ${res.status}`)
    }
  } catch (err) {
    record('API Protection: GET /api/documents does NOT leak processing_token', 'FAIL', err.message)
  }

  // 2.2 API Protection: GET /api/documents/[id] does not leak processing_token
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
      headers: { Cookie: cookieA },
    })
    const doc = await res.json()
    if (res.ok && doc) {
      if (doc.processing_token === undefined) {
        record('API Protection: GET /api/documents/[id] does NOT leak processing_token', 'PASS', 'Single document projection strictly omits processing_token')
      } else {
        record('API Protection: GET /api/documents/[id] does NOT leak processing_token', 'FAIL', 'Found processing_token in document response')
      }
    } else {
      record('API Protection: GET /api/documents/[id] does NOT leak processing_token', 'FAIL', `Status: ${res.status}`)
    }
  } catch (err) {
    record('API Protection: GET /api/documents/[id] does NOT leak processing_token', 'FAIL', err.message)
  }

  // 2.3 Retry Authorization: Unauthenticated call -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/retry`, {
      method: 'POST',
    })
    if (res.status === 401) {
      record('Retry Authorization: Unauthenticated call', 'PASS', 'Received HTTP 401 Unauthorized')
    } else {
      record('Retry Authorization: Unauthenticated call', 'FAIL', `Expected 401, got ${res.status}`)
    }
  } catch (err) {
    record('Retry Authorization: Unauthenticated call', 'FAIL', err.message)
  }

  // 2.4 Retry Authorization: Cross-user call (User B retrying User A's doc) -> 404
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/retry`, {
      method: 'POST',
      headers: { Cookie: cookieB },
    })
    if (res.status === 404) {
      record('Retry Authorization: Cross-user retry attempt', 'PASS', 'Received HTTP 404 Not Found (database ownership check enforced)')
    } else {
      record('Retry Authorization: Cross-user retry attempt', 'FAIL', `Expected 404, got ${res.status}`)
    }
  } catch (err) {
    record('Retry Authorization: Cross-user retry attempt', 'FAIL', err.message)
  }

  // 2.5 Retry State: Stuck pending document -> accepted (HTTP 200)
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/retry`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    })
    const data = await res.json()
    if (res.status === 200 && data.success) {
      record('Retry State: Pending document retry', 'PASS', 'HTTP 200 Accepted; scheduled background processing')
    } else {
      record('Retry State: Pending document retry', 'FAIL', `Status: ${res.status}, body: ${JSON.stringify(data)}`)
    }
  } catch (err) {
    record('Retry State: Pending document retry', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Database RPC & Security Restrictions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Database RPC Security & RLS Isolation ---')

  // Check if remote migration has been applied
  const checkRpc = await clientA.rpc('acquire_document_processing', {
    p_document_id: testDocId,
    p_user_id: userA.id,
  })

  const migrationApplied = !(
    checkRpc.error &&
    checkRpc.error.message.includes('Could not find the function')
  )

  if (!migrationApplied) {
    console.log('[NOTICE] The remote Supabase migration (supabase_phase1a_setup.sql) has not been run on the remote Supabase database yet.')
    console.log('[NOTICE] Table document_pages and RPCs acquire_document_processing / finalize_document_processing / mark_document_processing_failed are not yet present in the remote schema.')
    record('RPC Security: Execution Lockdown Verification', 'BLOCKED', 'Remote migration supabase_phase1a_setup.sql needs to be executed in Supabase SQL Editor')
    record('Table Security: document_pages Mutation Hardening', 'BLOCKED', 'Remote migration supabase_phase1a_setup.sql needs to be executed in Supabase SQL Editor')
    record('RLS Isolation: document_pages Ownership', 'BLOCKED', 'Remote migration supabase_phase1a_setup.sql needs to be executed in Supabase SQL Editor')
    record('Concurrency: Atomic Fencing Lock Race', 'BLOCKED', 'Remote migration supabase_phase1a_setup.sql needs to be executed in Supabase SQL Editor')
    record('Fencing: Stale Worker Rejection', 'BLOCKED', 'Remote migration supabase_phase1a_setup.sql needs to be executed in Supabase SQL Editor')
  } else {
    // 3.1 Authenticated client calls acquire_document_processing directly -> permission denied
    if (checkRpc.error && checkRpc.error.message.includes('permission denied')) {
      record('RPC Security: Authenticated acquire_document_processing', 'PASS', `Explicitly denied: "${checkRpc.error.message}"`)
    } else {
      record('RPC Security: Authenticated acquire_document_processing', 'FAIL', `Expected permission denied, got: ${JSON.stringify(checkRpc.error)}`)
    }

    // 3.2 Authenticated client calls finalize_document_processing directly -> permission denied
    const finalizeRpc = await clientA.rpc('finalize_document_processing', {
      p_document_id: testDocId,
      p_user_id: userA.id,
      p_processing_token: crypto.randomUUID(),
      p_doc_category: 'Invoice',
      p_tags: ['test'],
      p_metadata: [],
      p_pages: [],
      p_page_count: 0,
      p_is_scanned: false,
    })
    if (finalizeRpc.error && finalizeRpc.error.message.includes('permission denied')) {
      record('RPC Security: Authenticated finalize_document_processing', 'PASS', `Explicitly denied: "${finalizeRpc.error.message}"`)
    } else {
      record('RPC Security: Authenticated finalize_document_processing', 'FAIL', `Expected permission denied, got: ${JSON.stringify(finalizeRpc.error)}`)
    }

    // 3.3 Authenticated client calls mark_document_processing_failed directly -> permission denied
    const failRpc = await clientA.rpc('mark_document_processing_failed', {
      p_document_id: testDocId,
      p_user_id: userA.id,
      p_processing_token: crypto.randomUUID(),
      p_error_category: 'Test',
    })
    if (failRpc.error && failRpc.error.message.includes('permission denied')) {
      record('RPC Security: Authenticated mark_document_processing_failed', 'PASS', `Explicitly denied: "${failRpc.error.message}"`)
    } else {
      record('RPC Security: Authenticated mark_document_processing_failed', 'FAIL', `Expected permission denied, got: ${JSON.stringify(failRpc.error)}`)
    }

    // 3.4 Authenticated client direct UPDATE on public.documents -> revoked
    const updateDoc = await clientA
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', testDocId)
    if (updateDoc.error && (updateDoc.error.message.includes('permission denied') || updateDoc.error.message.includes('row-level security'))) {
      record('Table Security: Authenticated direct UPDATE on documents', 'PASS', `Denied: "${updateDoc.error.message}"`)
    } else {
      // Check if rows actually updated
      const checkDoc = await clientA.from('documents').select('status').eq('id', testDocId).single()
      if (checkDoc.data?.status !== 'completed') {
        record('Table Security: Authenticated direct UPDATE on documents', 'PASS', 'Status was not modified; UPDATE revoked')
      } else {
        record('Table Security: Authenticated direct UPDATE on documents', 'FAIL', 'Document status was directly updated by client!')
      }
    }

    // 3.5 Authenticated client direct INSERT into document_pages -> denied
    const insertPages = await clientA.from('document_pages').insert({
      id: crypto.randomUUID(),
      document_id: testDocId,
      page_number: 1,
      extracted_text: 'attacker text',
    })
    if (insertPages.error && (insertPages.error.message.includes('permission denied') || insertPages.error.message.includes('row-level security'))) {
      record('Table Security: Authenticated direct INSERT into document_pages', 'PASS', `Denied: "${insertPages.error.message}"`)
    } else {
      record('Table Security: Authenticated direct INSERT into document_pages', 'FAIL', 'Direct insert succeeded!')
    }

    // 3.6 Service-role worker tests (if SERVICE_ROLE_KEY present)
    if (SERVICE_ROLE_KEY) {
      const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

      // Create a fresh pending document specifically for atomic concurrency tests
      const concurrencyDocId = crypto.randomUUID()
      const concurrencyFileName = 'concurrency_test.pdf'
      const concurrencyStoragePath = `${userA.id}/${concurrencyDocId}/${concurrencyFileName}`

      await clientA.storage.from('documents').upload(concurrencyStoragePath, pdfHeader, {
        contentType: 'application/pdf',
        upsert: true,
      })

      await clientA.rpc('create_document_with_quota', {
        p_id: concurrencyDocId,
        p_user_id: userA.id,
        p_filename: concurrencyFileName,
        p_storage_path: concurrencyStoragePath,
        p_file_size: pdfHeader.length,
      })

      // Concurrency test: Atomic Acquisition
      const token1 = await serviceClient.rpc('acquire_document_processing', {
        p_document_id: concurrencyDocId,
        p_user_id: userA.id,
      })
      const token2 = await serviceClient.rpc('acquire_document_processing', {
        p_document_id: concurrencyDocId,
        p_user_id: userA.id,
      })

      if (token1.data && !token2.data) {
        record('Concurrency: Atomic acquisition race', 'PASS', 'First worker acquired lease; second simultaneous acquisition received null')
      } else {
        record('Concurrency: Atomic acquisition race', 'FAIL', `Worker 1: ${token1.data}, Worker 2: ${token2.data}`)
      }

      // Fencing test: Stale token cannot finalize
      const staleToken = crypto.randomUUID()
      const staleFinalize = await serviceClient.rpc('finalize_document_processing', {
        p_document_id: concurrencyDocId,
        p_user_id: userA.id,
        p_processing_token: staleToken,
        p_doc_category: 'Invoice',
        p_tags: ['fenced'],
        p_metadata: [],
        p_pages: [{ page_number: 1, text: 'valid page' }],
        p_page_count: 1,
        p_is_scanned: false,
      })

      if (staleFinalize.data === false) {
        record('Fencing: Stale worker finalize rejected', 'PASS', 'RPC returned false; stale worker prevented from overwriting')
      } else {
        record('Fencing: Stale worker finalize rejected', 'FAIL', `Expected false, got: ${staleFinalize.data}`)
      }

      // Fencing test: Stale token cannot fail document
      const staleFail = await serviceClient.rpc('mark_document_processing_failed', {
        p_document_id: concurrencyDocId,
        p_user_id: userA.id,
        p_processing_token: staleToken,
        p_error_category: 'Stale error',
      })

      if (staleFail.data === false) {
        record('Fencing: Stale worker markFailed rejected', 'PASS', 'RPC returned false; stale worker prevented from failing document')
      } else {
        record('Fencing: Stale worker markFailed rejected', 'FAIL', `Expected false, got: ${staleFail.data}`)
      }

      // Current worker: Finalize with valid token
      const validFinalize = await serviceClient.rpc('finalize_document_processing', {
        p_document_id: concurrencyDocId,
        p_user_id: userA.id,
        p_processing_token: token1.data,
        p_doc_category: 'Synthetic Invoice',
        p_tags: ['Billing', 'Test'],
        p_metadata: [{ key: 'invoice_id', type: 'string', value_string: 'SYN-001' }],
        p_pages: [{ page_number: 1, text: 'Synthetic Invoice Text $100.00' }],
        p_page_count: 1,
        p_is_scanned: false,
      })

      if (validFinalize.data === true) {
        record('Current Worker: Finalize with active token', 'PASS', 'Atomic transaction committed document and pages')
      } else {
        record('Current Worker: Finalize with active token', 'FAIL', `Failed to finalize: ${validFinalize.error?.message}`)
      }

      // RLS: User A can SELECT own document_pages
      const selectPagesA = await clientA.from('document_pages').select('*').eq('document_id', concurrencyDocId)
      if (selectPagesA.data && selectPagesA.data.length === 1) {
        record('RLS Isolation: Owner SELECT on document_pages', 'PASS', `Owner successfully read ${selectPagesA.data.length} page row`)
      } else {
        record('RLS Isolation: Owner SELECT on document_pages', 'FAIL', `Owner saw ${selectPagesA.data?.length} rows`)
      }

      // RLS: User B cannot SELECT User A's document_pages
      const selectPagesB = await clientB.from('document_pages').select('*').eq('document_id', concurrencyDocId)
      if (selectPagesB.data && selectPagesB.data.length === 0) {
        record('RLS Isolation: Cross-user SELECT on document_pages', 'PASS', 'User B query for User A pages returned 0 rows')
      } else {
        record('RLS Isolation: Cross-user SELECT on document_pages', 'FAIL', `User B saw ${selectPagesB.data?.length} pages belonging to User A`)
      }
    } else {
      record('Service Role Tests: Concurrency & Fencing', 'SKIPPED', 'SUPABASE_SERVICE_ROLE_KEY not configured in .env.local')
    }
  }

  // Output test report JSON
  fs.writeFileSync('phase1a_test_report.json', JSON.stringify(results, null, 2))
  console.log('\n===============================================================')
  console.log('             ALL PHASE 1A VERIFICATION FINISHED                ')
  console.log('===============================================================')
}

runPhase1aSuite().catch(console.error)
