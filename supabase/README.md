# FileMind Database Schema & Migration Guide

This directory contains the authoritative PostgreSQL database migrations and rollback scripts for **FileMind — AI-Powered PDF Vault**.

---

## 🗄️ Migration Sequence

When provisioning a new Supabase database or deploying updates, apply the migration scripts sequentially in the Supabase SQL Editor:

| # | Migration File | Description | Core Tables / RPCs Added |
|---|----------------|-------------|--------------------------|
| **01** | [`01_initial_schema.sql`](./migrations/01_initial_schema.sql) | Baseline schema: users, documents table, basic RLS policies, and private storage bucket | `public.documents`, `storage.buckets` (`documents`), `handle_new_user()` |
| **02** | [`02_phase1a_metadata_schema.sql`](./migrations/02_phase1a_metadata_schema.sql) | Phase 1A AI extraction: page storage, structured key-value metadata, atomic lease tokens | `public.document_pages`, `public.document_metadata`, `acquire_document_processing()`, `finalize_document_processing()` |
| **03** | [`03_phase1b_vector_indexing.sql`](./migrations/03_phase1b_vector_indexing.sql) | Phase 1B Semantic Search: pgvector extension, 768-dim embeddings, chunking, and hybrid search | `extensions.vector`, `public.document_chunks`, `acquire_document_indexing()`, `finalize_document_indexing()`, `match_document_chunks()` |
| **04** | [`04_storage_optimization.sql`](./migrations/04_storage_optimization.sql) | Safe client-side and server-side PDF storage optimization tracking | `original_file_size` column in `public.documents` |
| **05** | [`05_bulk_upload_queue.sql`](./migrations/05_bulk_upload_queue.sql) | Bulk PDF upload queue: atomic claim RPCs, retry counters, hourly rate limiting, and system worker support | `claim_next_pending_document()`, `claim_next_system_pending_document()`, hourly quota invariants |

---

## ↩️ Rollback Scripts

If a rollback is needed, run the matching script from [`supabase/migrations/rollbacks/`](./migrations/rollbacks/):

- `05_bulk_upload_rollback.sql`: Restores original `acquire_document_processing()` and drops bulk queue RPCs.
- `04_storage_optimization_rollback.sql`: Drops `original_file_size` tracking column.
- `03_phase1b_rollback.sql`: Removes vector indexing tables and hybrid search functions while preserving raw document texts and metadata.

---

## 🔒 Security & Isolation Model

- **Row-Level Security (RLS):** Enabled on `documents`, `document_pages`, `document_metadata`, and `document_chunks`. Every user can only read and write their own rows (`auth.uid() = user_id`).
- **Atomic Fencing Tokens:** Processing workers acquire leases with unique UUID tokens. Finalization RPCs check the token to reject stale workers and double-processing races.
- **Service-Role Lockdown:** RPCs that modify processing tokens, chunks, or system-wide pending queues are locked down strictly to `service_role` execution.
