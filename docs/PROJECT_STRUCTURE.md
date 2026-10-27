# FileMind — Codebase Structure & Directory Layout

This document details the architectural layout, directory responsibilities, and file organization of **FileMind — AI-Powered PDF Vault**.

---

## 🏗️ Top-Level Overview

```
FileMind/
├── app/                        # Next.js 16 App Router (Pages, Layouts, API Route Handlers)
├── components/                 # React UI Components organized by feature & domain
├── docs/                       # Architecture, project structure, setup, and known issues
├── lib/                        # Core backend business logic, AI, storage, and Supabase services
├── presentation/               # Slide decks, generators, synopsis, and academic deliverables
├── public/                     # Static assets (logo, icons, SVGs)
├── scripts/                    # Maintenance and operational scripts (e.g. index backfill)
├── supabase/                   # PostgreSQL migrations, RLS policies, RPCs, and rollbacks
├── tests/                      # Automated unit, concurrency, security, and integration tests
├── types/                      # Shared canonical TypeScript definitions
├── proxy.ts                    # Next.js 16 Proxy (Edge session refresh & route protection)
├── package.json                # Project dependencies, scripts, and build metadata
├── next.config.ts              # Next.js 16 configuration (Turbopack root, CSP headers)
├── tsconfig.json               # TypeScript compiler configuration
└── eslint.config.mjs           # Flat ESLint configuration with Next.js rules
```

---

## 📂 Detailed Directory Responsibilities

### 1. `app/` — Application Routing & API Endpoints
Follows the Next.js 16 App Router conventions:
- **`app/(auth)/`**: Route group for unauthenticated flows.
  - `login/page.tsx`: Sign-in view with email/password and Google OAuth.
  - `signup/page.tsx`: Account registration with validation.
  - `layout.tsx`: Centered auth card layout with cyber dual-glow background.
- **`app/(dashboard)/`**: Authenticated workspace route group with persistent sidebar and session validation.
  - `dashboard/page.tsx`: Workspace intelligence overview, quick upload, and recent activity.
  - `documents/page.tsx`: Full document vault with batch upload zone and paginated library.
  - `documents/[id]/page.tsx`: Split-screen PDF viewer, structured metadata inspection, and download.
  - `search/page.tsx`: Semantic and hybrid vector search interface with real-time snippet highlighting.
  - `settings/page.tsx`: Account profile and security parameter inspection.
  - `layout.tsx`: Authenticated shell with `Sidebar`, `TopBar`, and `MobileNav`.
- **`app/api/`**: Serverless Route Handlers:
  - `api/documents/route.ts`: List documents with user isolation, pagination, and status filters.
  - `api/documents/prepare-upload/route.ts`: Validate file size (<=49 MiB), MIME type, and generate storage path.
  - `api/documents/confirm-upload/route.ts`: Verify storage object, magic bytes (`%PDF`), register in DB, and trigger processing.
  - `api/documents/process-queue/route.ts`: User queue worker endpoint supporting explicit document ID or atomic RPC claims.
  - `api/documents/[id]/route.ts`: Document metadata lookup and permanent deletion.
  - `api/documents/[id]/download/route.ts`: Generate signed Supabase Storage URLs (viewer: 5 min, download: 2 min).
  - `api/documents/[id]/reindex/route.ts`: Force vector re-indexing for an existing document.
  - `api/documents/[id]/retry/route.ts`: Manual retry handler for failed or stale documents.
  - `api/cron/process-queue/route.ts`: Multi-user background queue draining secured via dedicated `CRON_SECRET`.
  - `api/search/route.ts`: Hybrid vector + keyword search endpoint.
- **`app/auth/callback/route.ts`**: OAuth PKCE exchange handler for Google sign-in.

---

### 2. `components/` — UI Component Architecture
Separated strictly by responsibility:
- **`components/ui/`**: Reusable primitive components styling the cyan/pink cyber-dark aesthetic:
  - `Button.tsx`: Variant-driven button (`primary`, `secondary`, `outline`, `ghost`, `danger`).
  - `Card.tsx`: Glass-panel card containers (`CardHeader`, `CardTitle`, `CardContent`, `CardFooter`).
  - `Badge.tsx`: Pill indicators for categories, tags, and states.
  - `LoadingSpinner.tsx`: Accessible animated spinner with custom labels.
- **`components/auth/`**: Authentication forms (`LoginForm.tsx`, `SignupForm.tsx`, `GoogleSignInButton.tsx`).
- **`components/documents/`**: Document management components:
  - `UploadZone.tsx`: 150-file drag-and-drop batch upload manager with reactive progress reporting.
  - `DocumentList.tsx`: Grid view with pagination, status filtering, and empty/error states.
  - `DocumentCard.tsx`: Individual document card with hover prefetching and quick actions.
  - `StatusBadge.tsx`: Reactive document state indicator (`pending`, `processing`, `completed`, `failed`).
  - `UploadButton.tsx`: Compact standalone upload trigger.
- **`components/pdf/`**: Document viewing & inspection:
  - `PDFViewer.tsx`: Canvas/embedded PDF rendering, category tags, structured metadata table, and fullscreen toggle.
- **`components/layout/`**: Workspace shells:
  - `Sidebar.tsx`: Fixed desktop navigation bar with user profile.
  - `MobileNav.tsx`: Responsive slide-out drawer for mobile viewports.
  - `TopBar.tsx`: Document header with breadcrumb navigation, download, and delete triggers.
  - `nav-items.ts`: Centralized navigation links and icons.

---

### 3. `lib/` — Backend Services & Core Business Logic
Enforces a strict boundary between server and client code:
- **`lib/ai/`**: Gemini multimodal & indexing services:
  - `processor.ts`: Multimodal PDF analysis, structured JSON extraction, Gemini model cascade, and retry logic. (`server-only`)
  - `service-role-worker.ts`: Privileged Supabase service-role client, atomic claim RPC calls, and fencing token validation. (`server-only`)
  - `index-document.ts`: Page-aware deterministic chunking and vector embedding orchestration. (`server-only`)
  - `embeddings.ts`: 768-dim `gemini-embedding-2` embedding generator with 500-capacity LRU query cache. (`server-only`)
  - `chunker.ts`: Deterministic token-bounded text segmentation with overlap.
  - `schema.ts`: Zod validation schemas for AI output, page integrity, and metadata normalization.
- **`lib/search/`**:
  - `hybrid-search.ts`: Reciprocal Rank Fusion (RRF) combining dense vector similarity with full-text keyword matching. (`server-only`)
- **`lib/storage/`**:
  - `optimizer.ts`: Safe PDF stream optimizer (`pdf-lib`) with byte-preservation guardrails for digital signatures.
- **`lib/upload/`**:
  - `batch-upload-manager.ts`: Client-side sliding-window upload controller (max 150 files, 4 concurrent uploads, 2 concurrent AI workers).
- **`lib/viewer/`**:
  - `signed-url-cache.ts`: Client-side in-memory signed URL cache with in-flight request collapsing.
- **`lib/supabase/`**:
  - `client.ts`: Browser-side Supabase client (`@supabase/ssr`).
  - `server.ts`: Server Component and Route Handler Supabase client with cookie forwarding.
  - `proxy.ts`: Session token updater for Next.js 16 Proxy.
- **`lib/validation/`**:
  - `filename.ts`: Path-traversal defense and filename sanitization.
  - `upload.ts`: File size (<=49 MiB) and MIME type validation.
  - `origin.ts`: Centralized CSRF / same-origin validation for API routes.
- **`lib/constants.ts`**: Shared limits (49 MiB, 150 files, 4 uploads, 2 workers, timeouts).
- **`lib/utils.ts`**: Shared date and file-size formatters.

---

### 4. `types/` — Canonical TypeScript Definitions
Centralizes shared interfaces across the stack:
- `document.ts`: `DocumentStatus`, `DocumentItem`, `DocumentRecord`, `PaginationMeta`, `SearchResultItem`, `FilterStatus`.
- `index.ts`: Re-exports canonical types.

---

### 5. `supabase/` — Database Migrations & Safety
- `migrations/`: Chronologically ordered SQL migrations (`01` through `05`).
- `migrations/rollbacks/`: Matching idempotent rollback scripts.
- `README.md`: Migration guide detailing tables, RPC signatures, and security policies.

---

### 6. `tests/` — Automated Verification Suites
- `test_bulk_upload_suite.mjs`: Tests 150-file batch limits, concurrency, model fallback, and fencing tokens.
- `test_optimization_suite.js`: Tests PDF optimization, LRU embedding cache, search deduplication, and signed URL caching.
- `integration/`: End-to-end integration tests for remote database and AI endpoints.
- `reports/`: Machine-readable JSON test reports.

---

### 7. `presentation/` — Academic & Hackathon Deliverables
- `deliverables/`: Completed presentation decks (`FileMind_Project_Presentation_Final.pptx` & `.pdf`).
- `slides/`: Exported 1080p slide images for Slide 1 through 13.
- `synopsis/`: Capstone project synopsis and university documentation.
- `notes/`: Comprehensive speaker notes and hackathon defense Q&A guide.
- `generators/`: Python automation scripts used to assemble presentations.
