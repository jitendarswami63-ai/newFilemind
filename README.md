# FileMind — AI-Powered PDF Vault

> **Find answers, not just files.**  
> FileMind transforms passive, unsearchable PDF archives into an active, intelligent document vault using multimodal AI, atomic batch processing, and hybrid semantic search.

---

## 🌟 Highlights & Key Capabilities

- 📄 **150-PDF Batch Ingestion:** Ingest mixed batches of invoices, research papers, contracts, and scans up to **49 MiB** per file with sliding-window upload concurrency (max 4 concurrent).
- 🧠 **Multimodal AI Understanding:** Deep page-by-page analysis powered by Google Gemini (`gemini-3.6-flash` / `3.8-flash`), automatically extracting document categories, semantic tags, and structured key-value pairs.
- ⚡ **Sub-200 ms Hybrid Search:** Combines dense 768-dimensional vector embeddings (`gemini-embedding-2` with pgvector) and PostgreSQL full-text search using **Reciprocal Rank Fusion (RRF)** for unmatched accuracy.
- 🔒 **Database-Level Privacy & Isolation:** Row-Level Security (RLS) ensures every user's documents, pages, metadata, and embeddings remain strictly isolated.
- 🛡️ **Fault-Tolerant Queue Worker:** Fencing-token leases prevent double processing; automated recovery claims stale jobs; autonomous cron draining operates independently of browser sessions.
- 💾 **Safe PDF Storage Optimization:** Non-destructive object stream compression (`pdf-lib`) with byte-preservation guardrails skipping digitally signed or encrypted PDFs.
- 🎨 **Futuristic Cyber-Dark UI:** Built with Next.js 16, React 19, and Tailwind CSS v4 featuring cyan/pink neon accents, split-screen viewing, and fast-path signed URL caching.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org) (App Router, Turbopack), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev) |
| **Backend API** | Next.js Serverless Route Handlers, Next.js 16 Proxy (`proxy.ts`), Zod 4 |
| **Multimodal AI** | [Google Gemini 3.6 & 3.8 Flash](https://ai.google.dev), Google Gen AI SDK (`@google/genai`) |
| **Embeddings & Vector** | `gemini-embedding-2` (768-dim), [pgvector](https://github.com/pgvector/pgvector) on PostgreSQL |
| **Database & Auth** | [Supabase](https://supabase.com) (PostgreSQL 15+, Row-Level Security, Auth, Storage) |
| **PDF Engineering** | [pdf-lib](https://pdf-lib.js.org) |

---

## 👥 Project Team & University

- **Jitendar (Team Lead)** — Roll No: `25001011024` (Information Technology)
- **Kaushal Verma** — Roll No: `25001011027` (Information Technology)
- **Vishal** — Roll No: `25001015070` (Electronics & Computer Engineering)
- **University:** J.C. Bose University of Science and Technology, YMCA, Faridabad

---

## 🚀 Quickstart

### 1. Installation
```bash
git clone https://github.com/jitendarswami63-ai/file-mind.git
cd file-mind
npm install
```

### 2. Configure Environment
Create `.env.local` based on `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
CRON_SECRET=your_secure_cron_secret
```

### 3. Apply Database Migrations
Run the SQL scripts in `supabase/migrations/` (`01` through `05`) in your Supabase SQL Editor. See [supabase/README.md](supabase/README.md) for details.

### 4. Run Automated Test Suites
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📚 Documentation Links

- 🏛️ [System Architecture & Data Flows](docs/ARCHITECTURE.md)
- 📂 [Codebase Structure Guide](docs/PROJECT_STRUCTURE.md)
- 🔧 [Setup & Deployment Guide](docs/SETUP.md)
- ⚠️ [Known Issues & Pre-Deployment Checklist](docs/KNOWN_ISSUES.md)
- 🗄️ [Database Migrations & Rollbacks](supabase/README.md)
- 🧪 [Automated Test Suites](tests/README.md)
- 📊 [Presentation Decks & Deliverables](presentation/README.md)
