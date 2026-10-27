# FileMind — Known Issues, Limitations & Pre-Deployment Checklist

This document tracks known limitations, external service dependencies, and operational steps required for production deployment of **FileMind — AI-Powered PDF Vault**.

---

## ⚠️ Known Limitations & Operational Considerations

### 1. Remote Supabase Migrations Execution
- **Context:** Database migrations (`01` through `05` in `supabase/migrations/`) must be manually executed in the remote Supabase SQL Editor.
- **Impact if omitted:** If `05_bulk_upload_queue.sql` is not applied on the remote database, calling `claim_next_pending_document` will fall back to direct table queries. Similarly, vector indexing requires `03_phase1b_vector_indexing.sql` (`extensions.vector`).
- **Action Required:** Apply the 5 SQL scripts sequentially in the Supabase SQL editor prior to production launch.

### 2. Supabase Storage Bucket Size Quota
- **Context:** Supabase free-tier projects default to a 50 MiB per-file upload limit on Storage buckets unless configured otherwise in the Supabase Dashboard.
- **Safety in FileMind:** FileMind strictly enforces `MAX_FILE_SIZE_BYTES = 51_380_224` (49.0 MiB) on the client, in pre-flight preparation, and during upload confirmation. This guarantees that all uploads stay safely under Supabase's 50 MiB ceiling.
- **Recommendation:** Do not increase `MAX_FILE_SIZE_MB` beyond 49 without verifying the configured limit in your Supabase Dashboard under Storage -> Configuration.

### 3. Serverless Execution Duration (Vercel Free Tier)
- **Context:** Free-tier Vercel serverless functions have a maximum timeout of 60 seconds (`maxDuration = 60`).
- **Mitigation in FileMind:**
  - AI processing utilizes `after()` background execution where supported.
  - The autonomous cron worker (`/api/cron/process-queue`) caps its execution at **45 seconds** or **3 documents per invocation**, cleanly terminating the batch before reaching the 60-second limit.
  - Documents that take longer or hit serverless limits are safely protected by the 10-minute lease window and can be claimed by subsequent invocations or manually retried.

### 4. Remote Supabase Auth Email Rate Limits
- **Context:** Supabase free-tier Auth limits confirmation emails to 3–4 per hour.
- **Mitigation in FileMind:** The login UI detects unconfirmed email states and provides a rate-limited "Resend confirmation email" button. For local development or hackathon evaluations, you can disable "Confirm email" in Supabase Auth Settings to permit instant login.

### 5. Gemini API Transient Availability
- **Context:** Gemini preview models can occasionally return `503 Service Unavailable` or `429 Resource Exhausted` under peak regional load.
- **Mitigation in FileMind:** The processor defaults to verified stable `gemini-3.6-flash`, implements bounded exponential backoff with jitter (up to 3 retries), and cascades gracefully to `gemini-3.8-flash`.

---

## ✅ Pre-Hackathon Verification Checklist

- [x] ESLint validation passes with 0 errors and 0 warnings (`npm run lint`).
- [x] TypeScript compiler passes with 0 errors (`npx tsc --noEmit`).
- [x] Production build completes successfully with Turbopack (`npm run build`).
- [x] 150-file bulk upload and concurrency unit tests pass 8/8 (`npm run test:bulk`).
- [x] PDF optimization, LRU cache, and search deduplication unit tests pass 20/20 (`npm run test:opt`).
- [x] Presentation decks (`FileMind_Project_Presentation_Final.pptx` & `.pdf`) verified with 3 team members, roll numbers, and university details.
- [ ] Execute `01`–`05` SQL migrations in the Supabase SQL Editor.
- [ ] Configure `CRON_SECRET` on Vercel environment variables.
