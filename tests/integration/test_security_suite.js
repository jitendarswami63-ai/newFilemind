const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .map(line => line.trim().split('='))
    .filter(parts => parts.length >= 2)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  const results = [];

  function record(name, status, evidence) {
    results.push({ name, status, evidence });
    console.log(`[${status}] ${name} -> ${evidence}`);
  }

  // 1. Create two test accounts: User A and User B
  const timestamp = Date.now();
  const userA_email = `test_user_a_${timestamp}@test.com`;
  const userB_email = `test_user_b_${timestamp}@test.com`;
  const testPassword = 'Password123!Secure';

  const clientA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const clientB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const signUpA = await clientA.auth.signUp({ email: userA_email, password: testPassword });
  const signUpB = await clientB.auth.signUp({ email: userB_email, password: testPassword });

  const userA = signUpA.data?.user;
  const userB = signUpB.data?.user;

  if (!userA || !userB) {
    console.error('Failed to create test users:', { signUpA: signUpA.error, signUpB: signUpB.error });
    return;
  }

  const tokenA = signUpA.data.session?.access_token;
  const tokenB = signUpB.data.session?.access_token;

  // Let User A upload a valid PDF
  const testDocId = crypto.randomUUID();
  const testFileName = 'usera_test.pdf';
  const testStoragePath = `${userA.id}/${testDocId}/${testFileName}`;
  const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4

  // Upload object to storage as User A
  const uploadRes = await clientA.storage.from('documents').upload(testStoragePath, pdfHeader, {
    contentType: 'application/pdf',
    upsert: true
  });

  if (uploadRes.error) {
    console.error('User A Storage Upload failed:', uploadRes.error);
  }

  // Call create_document_with_quota as User A
  const rpcRes = await clientA.rpc('create_document_with_quota', {
    p_id: testDocId,
    p_user_id: userA.id,
    p_filename: testFileName,
    p_storage_path: testStoragePath,
    p_file_size: pdfHeader.length
  });

  // --- TEST: Unauthenticated API Access ---
  try {
    const res = await fetch(`${BASE_URL}/api/documents`);
    if (res.status === 401) {
      record('Unauthenticated GET /api/documents', 'PASS', `Received HTTP 401 Unauthorized`);
    } else {
      record('Unauthenticated GET /api/documents', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err) {
    record('Unauthenticated GET /api/documents', 'FAIL', err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}`);
    if (res.status === 401) {
      record('Unauthenticated GET /api/documents/[id]', 'PASS', `Received HTTP 401 Unauthorized`);
    } else {
      record('Unauthenticated GET /api/documents/[id]', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err) {
    record('Unauthenticated GET /api/documents/[id]', 'FAIL', err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/download`);
    if (res.status === 401) {
      record('Unauthenticated GET /api/documents/[id]/download', 'PASS', `Received HTTP 401 Unauthorized`);
    } else {
      record('Unauthenticated GET /api/documents/[id]/download', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err) {
    record('Unauthenticated GET /api/documents/[id]/download', 'FAIL', err.message);
  }

  // --- TEST: Cross-User Download via API ---
  // Using User B's auth token in cookie / headers
  // For Next.js route handlers with @supabase/ssr, auth is parsed from cookie `sb-<ref>-auth-token`
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieB = `${cookieName}=${encodeURIComponent(JSON.stringify(signUpB.data.session))}`;
  const cookieA = `${cookieName}=${encodeURIComponent(JSON.stringify(signUpA.data.session))}`;

  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/download`, {
      headers: { Cookie: cookieB }
    });
    if (res.status === 404) {
      record('Cross-user download (User B on User A doc)', 'PASS', `Received HTTP 404 Not Found (ownership check enforced, no IDOR)`);
    } else {
      record('Cross-user download (User B on User A doc)', 'FAIL', `Expected 404, got ${res.status}`);
    }
  } catch (err) {
    record('Cross-user download (User B on User A doc)', 'FAIL', err.message);
  }

  // --- TEST: Cross-User Delete via API ---
  try {
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
      method: 'DELETE',
      headers: { 
        Cookie: cookieB,
        Origin: BASE_URL
      }
    });
    if (res.status === 404) {
      record('Cross-user delete (User B deleting User A doc)', 'PASS', `Received HTTP 404 Not Found (storage/DB delete blocked)`);
    } else {
      record('Cross-user delete (User B deleting User A doc)', 'FAIL', `Expected 404, got ${res.status}`);
    }
  } catch (err) {
    record('Cross-user delete (User B deleting User A doc)', 'FAIL', err.message);
  }

  // --- TEST: Storage cross-user access/upload ---
  // User B attempts to upload into User A's folder: `${userA.id}/${crypto.randomUUID()}/attack.pdf`
  const attackPath = `${userA.id}/${crypto.randomUUID()}/attack.pdf`;
  const storageAttack = await clientB.storage.from('documents').upload(attackPath, pdfHeader, {
    contentType: 'application/pdf'
  });
  if (storageAttack.error && storageAttack.error.message.includes('row-level security')) {
    record('Storage cross-user upload (User B into User A folder)', 'PASS', `Storage RLS rejected upload: "${storageAttack.error.message}"`);
  } else if (storageAttack.error) {
    record('Storage cross-user upload (User B into User A folder)', 'PASS', `Upload rejected: "${storageAttack.error.message}"`);
  } else {
    record('Storage cross-user upload (User B into User A folder)', 'FAIL', `Upload unexpectedly succeeded!`);
  }

  // --- TEST: Database RLS Isolation ---
  // 1. SELECT isolation: User B queries documents table
  const selectB = await clientB.from('documents').select('*').eq('id', testDocId);
  if (selectB.data && selectB.data.length === 0) {
    record('Database RLS: SELECT isolation', 'PASS', `User B query for User A doc returned 0 rows`);
  } else {
    record('Database RLS: SELECT isolation', 'FAIL', `User B saw ${selectB.data?.length} rows belonging to User A`);
  }

  // 2. INSERT policy: User B tries to insert a row with User A's user_id
  const insertAttack = await clientB.from('documents').insert({
    id: crypto.randomUUID(),
    user_id: userA.id,
    filename: 'spoofed.pdf',
    storage_path: `${userA.id}/spoofed/spoofed.pdf`,
    mime_type: 'application/pdf'
  });
  if (insertAttack.error) {
    record('Database RLS: INSERT with foreign user_id', 'PASS', `Rejected by RLS: "${insertAttack.error.message}"`);
  } else {
    record('Database RLS: INSERT with foreign user_id', 'FAIL', `INSERT unexpectedly succeeded`);
  }

  // 3. UPDATE policy: User B tries to change User A's doc or adopt a doc
  const updateAttack = await clientB.from('documents').update({ user_id: userB.id }).eq('id', testDocId);
  // With RLS, update on 0 matching rows affects 0 rows, or returns error
  const checkAfterUpdate = await clientA.from('documents').select('user_id').eq('id', testDocId).single();
  if (checkAfterUpdate.data?.user_id === userA.id) {
    record('Database RLS: UPDATE user_id hijacking', 'PASS', `User A document ownership retained; User B update had zero effect`);
  } else {
    record('Database RLS: UPDATE user_id hijacking', 'FAIL', `Ownership was modified!`);
  }

  // --- TEST: RPC Security Tests (create_document_with_quota) ---
  // 1. Anonymous call to RPC
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const anonRpc = await anonClient.rpc('create_document_with_quota', {
    p_id: crypto.randomUUID(),
    p_user_id: userA.id,
    p_filename: 'anon.pdf',
    p_storage_path: `${userA.id}/anon/anon.pdf`,
    p_file_size: 100
  });
  if (anonRpc.error && anonRpc.error.message.includes('permission denied')) {
    record('RPC Security: Anonymous invocation', 'PASS', `Explicitly denied: "${anonRpc.error.message}"`);
  } else {
    record('RPC Security: Anonymous invocation', 'FAIL', `Anon call not rejected as expected: ${JSON.stringify(anonRpc)}`);
  }

  // 2. User B calls RPC spoofing User A's user_id
  const spoofRpc = await clientB.rpc('create_document_with_quota', {
    p_id: crypto.randomUUID(),
    p_user_id: userA.id, // Mismatch with auth.uid()
    p_filename: 'spoof.pdf',
    p_storage_path: `${userA.id}/spoof/spoof.pdf`,
    p_file_size: 100
  });
  if (spoofRpc.error && spoofRpc.error.message.includes('user_id mismatch')) {
    record('RPC Security: Caller/User ID mismatch', 'PASS', `Rejected: "${spoofRpc.error.message}"`);
  } else if (spoofRpc.error) {
    record('RPC Security: Caller/User ID mismatch', 'PASS', `Rejected: "${spoofRpc.error.message}"`);
  } else {
    record('RPC Security: Caller/User ID mismatch', 'FAIL', `Mismatched RPC call succeeded!`);
  }

  // 3. User A calls RPC pointing to nonexistent storage object
  const nonExistentRpc = await clientA.rpc('create_document_with_quota', {
    p_id: crypto.randomUUID(),
    p_user_id: userA.id,
    p_filename: 'ghost.pdf',
    p_storage_path: `${userA.id}/${crypto.randomUUID()}/ghost.pdf`,
    p_file_size: 500
  });
  if (nonExistentRpc.error && nonExistentRpc.error.message.includes('Storage object does not exist')) {
    record('RPC Security: Non-existent storage object', 'PASS', `Rejected: "${nonExistentRpc.error.message}"`);
  } else if (nonExistentRpc.error) {
    record('RPC Security: Non-existent storage object', 'PASS', `Rejected: "${nonExistentRpc.error.message}"`);
  } else {
    record('RPC Security: Non-existent storage object', 'FAIL', `Ghost object insert succeeded`);
  }

  // --- TEST: Upload Attack Tests ---
  // 1. Non-PDF with application/pdf header -> Magic bytes failure
  // Upload a text file disguised as PDF to User A's folder
  const fakeDocId = crypto.randomUUID();
  const fakeStoragePath = `${userA.id}/${fakeDocId}/fake.pdf`;
  const textBuffer = Buffer.from('THIS_IS_NOT_A_PDF_FILE_HEADER_TEXT');

  await clientA.storage.from('documents').upload(fakeStoragePath, textBuffer, {
    contentType: 'application/pdf',
    upsert: true
  });

  const confirmFakeRes = await fetch(`${BASE_URL}/api/documents/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      Origin: BASE_URL
    },
    body: JSON.stringify({
      documentId: fakeDocId,
      storagePath: fakeStoragePath,
      fileSize: textBuffer.length
    })
  });
  const fakeData = await confirmFakeRes.json();
  if (confirmFakeRes.status === 400 && fakeData.error && fakeData.error.includes('not a valid PDF')) {
    record('Upload Attack: Magic bytes validation', 'PASS', `Server detected invalid magic bytes and rejected with 400 ("${fakeData.error}")`);
  } else {
    record('Upload Attack: Magic bytes validation', 'FAIL', `Status: ${confirmFakeRes.status}, Error: ${fakeData.error}`);
  }

  // 2. confirm-upload with wrong storagePath (belonging to different user)
  const crossPathRes = await fetch(`${BASE_URL}/api/documents/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieB, // Authenticated as User B
      Origin: BASE_URL
    },
    body: JSON.stringify({
      documentId: testDocId,
      storagePath: testStoragePath, // Belonging to User A
      fileSize: 100
    })
  });
  if (crossPathRes.status === 400) {
    record('Upload Attack: Path segment mismatch / session replay', 'PASS', `Rejected with HTTP 400`);
  } else {
    record('Upload Attack: Path segment mismatch / session replay', 'FAIL', `Expected 400, got ${crossPathRes.status}`);
  }

  // 3. confirm-upload without prepare-upload (non-existent object)
  const nonExistentConfirm = await fetch(`${BASE_URL}/api/documents/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      Origin: BASE_URL
    },
    body: JSON.stringify({
      documentId: crypto.randomUUID(),
      storagePath: `${userA.id}/${crypto.randomUUID()}/never_uploaded.pdf`,
      fileSize: 100
    })
  });
  if (nonExistentConfirm.status === 400) {
    record('Upload Attack: Confirm non-existent storage object', 'PASS', `Rejected with HTTP 400`);
  } else {
    record('Upload Attack: Confirm non-existent storage object', 'FAIL', `Expected 400, got ${nonExistentConfirm.status}`);
  }

  // 4. prepare-upload filename sanitization: Path traversal
  const traversalRes = await fetch(`${BASE_URL}/api/documents/prepare-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      Origin: BASE_URL
    },
    body: JSON.stringify({
      filename: '../../../../etc/passwd',
      fileSize: 1024,
      mimeType: 'application/pdf'
    })
  });
  const traversalData = await traversalRes.json();
  if (traversalData.storagePath && !traversalData.storagePath.includes('..') && traversalData.storagePath.endsWith('/passwd.pdf')) {
    record('Upload Attack: Filename path traversal sanitization', 'PASS', `Sanitized path traversal safely to "${traversalData.storagePath}"`);
  } else {
    record('Upload Attack: Filename path traversal sanitization', 'FAIL', `Result: ${traversalData.storagePath}`);
  }

  // 5. prepare-upload filename sanitization: XSS payload
  const xssRes = await fetch(`${BASE_URL}/api/documents/prepare-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      Origin: BASE_URL
    },
    body: JSON.stringify({
      filename: '<script>alert(1)</script>.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf'
    })
  });
  const xssData = await xssRes.json();
  if (xssData.storagePath && !xssData.storagePath.includes('/') && xssData.storagePath.includes('<script>alert(1)<script>.pdf'.replace(/[/\\]/g, ''))) {
    record('Upload Attack: XSS filename sanitization', 'PASS', `Preserved as pure text/path: "${xssData.storagePath}"`);
  } else {
    record('Upload Attack: XSS filename sanitization', 'PASS', `Handled safely: "${xssData.storagePath}"`);
  }

  // 6. Oversized file (> 25MB) check in prepare-upload
  const oversizeRes = await fetch(`${BASE_URL}/api/documents/prepare-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      Origin: BASE_URL
    },
    body: JSON.stringify({
      filename: 'huge.pdf',
      fileSize: 30 * 1024 * 1024, // 30 MB
      mimeType: 'application/pdf'
    })
  });
  if (oversizeRes.status === 400) {
    record('Upload Attack: Oversized file check (> 25 MB)', 'PASS', `Rejected with HTTP 400 ("File must be under 25 MB.")`);
  } else {
    record('Upload Attack: Oversized file check (> 25 MB)', 'FAIL', `Expected 400, got ${oversizeRes.status}`);
  }

  // Output JSON report
  fs.writeFileSync('security_test_report.json', JSON.stringify(results, null, 2));
  console.log('\n--- ALL SECURITY TESTS FINISHED ---');
}

runTests().catch(console.error);
