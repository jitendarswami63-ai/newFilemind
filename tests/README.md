# FileMind Automated Test Suites

This directory contains automated verification suites for the FileMind application.

---

## 🏃 Running Tests

```bash
# Run all unit and invariant test suites
npm test

# Run the 150-PDF bulk upload and AI concurrency suite
npm run test:bulk

# Run the system optimization and LRU cache suite
npm run test:opt
```

---

## 📋 Test Suites Overview

### 1. Bulk Upload & Concurrency Suite (`test_bulk_upload_suite.mjs`)
- **49 MiB Limits:** Validates file size boundaries and rejection of oversized files.
- **Batch Queuing:** Tests batch queuing with up to 150 files, max 4 concurrent uploads, and max 2 concurrent AI workers.
- **Partial Failure Isolation:** Verifies that a failure on an individual PDF does not block or terminate the remaining batch.
- **Model Cascade & Backoff:** Simulates transient 503 and 429 errors to verify automatic retry and fallback.
- **Fencing Token Continuity:** Validates that the processing token remains identical across claim, finalization, and failure transitions.
- **Exhausted Job Handling:** Asserts that jobs exceeding 3 attempts transition to `failed` and can be manually retried.

### 2. System Optimization Suite (`test_optimization_suite.js`)
- **Safe PDF Optimization:** Verifies that non-standard, signed, or encrypted PDFs skip reserialization to preserve byte integrity.
- **Search Query Embedding LRU Cache:** Tests SHA-256 key normalization, hit/miss semantics, and 500-capacity LRU eviction.
- **Result Deduplication & Coalescing:** Validates grouping of chunk results by document ID, preserving top scores and combining page ranges.
- **Fast-Path Signed URL Cache:** Tests in-memory caching and in-flight request collapsing.
- **Storage Quota Integrity:** Validates quota calculation and atomic fallback if optimization fails.

### 3. Integration Tests (`tests/integration/`)
Integration suites designed for testing against live remote Supabase instances and Gemini API when live credentials and migrations are applied:
- `test_phase1a_suite.js`: Phase 1A structured extraction and Zod schema validation.
- `test_phase1b_suite.js`: Phase 1B vector indexing and match RPC verification.
- `test_security_suite.js`: User isolation and Row-Level Security checks.
- `test_e2e_gemini.ts`: Live end-to-end Gemini API extraction test.
