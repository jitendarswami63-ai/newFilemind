import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local before importing any internal modules
const envLines = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n');
envLines.forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;




const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function runE2E() {
  console.log('====================================================');
  console.log('   FILEMIND PHASE 1A LIVE GEMINI E2E VERIFICATION    ');
  console.log('====================================================');

  // Minimal valid 1-page PDF
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
    '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
    '3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj\n' +
    '4 0 obj <</Length 180>> stream\n' +
    'BT\n' +
    '/F1 20 Tf\n' +
    '72 720 Td\n' +
    '(INVOICE)\n' +
    '0 -30 Td\n' +
    '/F1 12 Tf\n' +
    '(Invoice Number: INV-99882) Tj\n' +
    '0 -20 Td\n' +
    '(Vendor: Global Cloud Technologies Inc.) Tj\n' +
    '0 -20 Td\n' +
    '(Issue Date: 2026-03-15) Tj\n' +
    '0 -20 Td\n' +
    '(Total Amount: $4,500.00 USD) Tj\n' +
    'ET\n' +
    'endstream\n' +
    'endobj\n' +
    '5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n' +
    'xref\n' +
    '0 6\n' +
    '0000000000 65535 f \n' +
    '0000000009 00000 n \n' +
    '0000000058 00000 n \n' +
    '0000000115 00000 n \n' +
    '0000000244 00000 n \n' +
    '0000000476 00000 n \n' +
    'trailer <</Size 6 /Root 1 0 R>>\n' +
    'startxref\n' +
    '553\n' +
    '%%EOF'
  );

  // 1. Create and authenticate test user
  const timestamp = Date.now();
  const testEmail = `gemini_e2e_${timestamp}@test.com`;
  const testPassword = 'Password123!GeminiTest';
  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authErr } = await anonClient.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (authErr || !authData.user) {
    throw new Error('Failed to create test user: ' + authErr?.message);
  }
  const testUser = authData.user;
  console.log(`[E2E] Created test user: ${testUser.id} (${testEmail})`);

  // 2. Upload PDF into user storage using authenticated user client
  const fileId = crypto.randomUUID();
  const storagePath = `${testUser.id}/${fileId}/invoice_sample.pdf`;
  console.log(`[E2E] Uploading sample invoice to storage: ${storagePath}`);
  const { error: storageErr } = await anonClient.storage
    .from('documents')
    .upload(storagePath, minimalPdf, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (storageErr) throw new Error('Storage upload failed: ' + storageErr.message);

  // 3. Register document via RPC using authenticated user client
  console.log('[E2E] Registering document via create_document_with_quota RPC...');
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('create_document_with_quota', {
    p_id: fileId,
    p_user_id: testUser.id,
    p_filename: 'invoice_sample.pdf',
    p_storage_path: storagePath,
    p_file_size: minimalPdf.length,
  });
  if (rpcErr) throw new Error('Document creation failed: ' + rpcErr?.message);
  const docId = fileId;
  console.log(`[E2E] Document registered with ID: ${docId}, status: pending`);

  // 4. Run processor directly (this executes the exact background job)
  console.log('[E2E] Executing processDocument() with gemini-3.8-flash...');
  const { processDocument } = await import('@/lib/ai/processor');
  await processDocument(docId);

  // 5. Inspect final state in DB
  const { data: docRecord, error: fetchErr } = await serviceClient
    .from('documents')
    .select('id, status, error_message, doc_category, tags, extracted_data, page_count, is_scanned, processing_locked_at')
    .eq('id', docId)
    .single();

  if (fetchErr || !docRecord) throw new Error('Failed to fetch processed document: ' + fetchErr?.message);

  console.log(`[E2E] Final Document Status: ${docRecord.status}`);
  console.log(`[E2E] Document Category: ${docRecord.doc_category}`);
  console.log(`[E2E] Document Tags:`, docRecord.tags);
  console.log(`[E2E] Page Count: ${docRecord.page_count}, Scanned: ${docRecord.is_scanned}`);
  console.log('[E2E] Extracted Metadata:', JSON.stringify(docRecord.extracted_data, null, 2));

  const { data: pages, error: pagesErr } = await serviceClient
    .from('document_pages')
    .select('page_number, extracted_text')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });

  if (pagesErr) throw new Error('Failed to fetch pages: ' + pagesErr.message);

  console.log(`[E2E] Saved Document Pages (${pages?.length || 0}):`);
  pages?.forEach(p => {
    console.log(`  Page ${p.page_number} (${p.extracted_text.length} chars): ${p.extracted_text.slice(0, 80)}...`);
  });

  // Verification assertions
  if (docRecord.status !== 'completed') {
    throw new Error(`Expected status 'completed', but got '${docRecord.status}'`);
  }
  if (!pages || pages.length === 0) {
    throw new Error('Expected at least 1 document page in document_pages table');
  }
  if (!docRecord.doc_category) {
    throw new Error('Expected doc_category to be set');
  }
  if (!docRecord.tags || docRecord.tags.length === 0) {
    throw new Error('Expected tags to be non-empty');
  }

  console.log('\n>>> SUCCESS: Full Phase 1A Gemini multimodal AI pipeline verified end-to-end! <<<');
}

runE2E().catch(err => {
  console.error('[E2E FAIL]', err);
  process.exit(1);
});
