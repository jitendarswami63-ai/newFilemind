import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local if available
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const r2AccountId = process.env.CLOUDFLARE_ACCOUNT_ID
const r2AccessKey = process.env.R2_ACCESS_KEY_ID
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY
const r2Bucket = process.env.R2_BUCKET_NAME || 'filemind-documents'
const r2Endpoint = process.env.R2_ENDPOINT || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : null)

console.log('--- FileMind Cloudflare R2 Document Migration Tool ---')

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

if (!r2AccessKey || !r2SecretKey || !r2Endpoint) {
  console.error('Error: Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT/CLOUDFLARE_ACCOUNT_ID) must be configured.')
  console.log('Configuration check:')
  console.log(`- Supabase URL: ${supabaseUrl ? 'Configured' : 'Missing'}`)
  console.log(`- R2 Endpoint: ${r2Endpoint ? r2Endpoint : 'Missing'}`)
  console.log(`- R2 Access Key: ${r2AccessKey ? 'Configured' : 'Missing'}`)
  console.log(`- R2 Secret Key: ${r2SecretKey ? 'Configured' : 'Missing'}`)
  console.log(`- R2 Bucket: ${r2Bucket}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
})

async function runMigration() {
  console.log('Fetching documents to migrate from Supabase...')

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, filename, storage_path, file_size, storage_provider, is_locked')
    .or('storage_provider.is.null,storage_provider.neq.r2')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching documents from database:', error)
    process.exit(1)
  }

  if (!documents || documents.length === 0) {
    console.log('No unmigrated documents found. All documents are already on Cloudflare R2!')
    return
  }

  console.log(`Found ${documents.length} document(s) to migrate to Cloudflare R2.\n`)

  let successCount = 0
  let failureCount = 0
  let skippedCount = 0

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]
    const idx = `[${i + 1}/${documents.length}]`

    if (!doc.storage_path) {
      console.warn(`${idx} Doc ${doc.id}: Missing storage_path, skipping.`)
      skippedCount++
      continue
    }

    console.log(`${idx} Migrating: "${doc.filename || doc.id}" (${doc.storage_path})...`)

    try {
      // 1. Download from Supabase Storage
      const { data: fileBlob, error: dlError } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (dlError || !fileBlob) {
        console.error(`  -> Failed to download from Supabase Storage:`, dlError?.message || 'Empty file')
        failureCount++
        continue
      }

      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())

      // 2. Upload to Cloudflare R2
      const isEncrypted = doc.storage_path.endsWith('.enc') || doc.is_locked
      const contentType = isEncrypted ? 'application/octet-stream' : 'application/pdf'

      await r2.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: doc.storage_path,
          Body: fileBuffer,
          ContentType: contentType,
        })
      )

      // 3. Verify upload in R2 via HeadObject
      const headRes = await r2.send(
        new HeadObjectCommand({
          Bucket: r2Bucket,
          Key: doc.storage_path,
        })
      )

      if (headRes.ContentLength !== fileBuffer.length) {
        throw new Error(`Size mismatch: original=${fileBuffer.length}b, R2=${headRes.ContentLength}b`)
      }

      // 4. Update database storage_provider
      const { error: updateError } = await supabase
        .from('documents')
        .update({ storage_provider: 'r2' })
        .eq('id', doc.id)

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`)
      }

      console.log(`  -> SUCCESS: Migrated and verified (${fileBuffer.length} bytes)`)
      successCount++
    } catch (err) {
      console.error(`  -> FAILED:`, err instanceof Error ? err.message : String(err))
      failureCount++
    }
  }

  console.log('\n--- Migration Summary ---')
  console.log(`Total scanned: ${documents.length}`)
  console.log(`Migrated:      ${successCount}`)
  console.log(`Failed:        ${failureCount}`)
  console.log(`Skipped:       ${skippedCount}`)
  console.log('Notice: Original Supabase Storage files have been safely kept as non-destructive backup.')
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err)
  process.exit(1)
})
