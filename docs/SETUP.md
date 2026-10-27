# FileMind — Local Development & Deployment Setup

This guide provides instructions for setting up, configuring, and running **FileMind** in local development and production environments.

---

## 📋 Prerequisites

1. **Node.js:** `v20.x` or `v22.x` (LTS recommended)
2. **Package Manager:** `npm` (version 10+)
3. **Supabase Account:** A free Supabase project with PostgreSQL and Storage enabled.
4. **Google AI Studio Key:** An API key for Gemini models (`GEMINI_API_KEY`).

---

## 🚀 Step-by-Step Installation

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jitendarswami63-ai/file-mind.git
cd file-mind
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in the required configuration keys:

```env
# Supabase Configuration (Settings -> API in Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API Key (Get from https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSy...

# Optional Model Configuration (defaults to gemini-3.6-flash)
GEMINI_MODEL=gemini-3.6-flash

# Autonomous Background Worker Secret (generate a strong random string)
CRON_SECRET=super_secret_cron_token_min_32_characters
```

> [!CAUTION]
> **Never commit `.env.local` to Git.** `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` provide privileged access and must remain strictly server-side.

---

### 3. Apply Supabase Database Migrations
Open your **Supabase Dashboard -> SQL Editor** and execute the migration scripts located in `supabase/migrations/` in order:

1. [`01_initial_schema.sql`](../supabase/migrations/01_initial_schema.sql)
2. [`02_phase1a_metadata_schema.sql`](../supabase/migrations/02_phase1a_metadata_schema.sql)
3. [`03_phase1b_vector_indexing.sql`](../supabase/migrations/03_phase1b_vector_indexing.sql)
4. [`04_storage_optimization.sql`](../supabase/migrations/04_storage_optimization.sql)
5. [`05_bulk_upload_queue.sql`](../supabase/migrations/05_bulk_upload_queue.sql)

Verify that the `documents` storage bucket was created and marked **Private**.

---

### 4. Run Automated Verification Tests
Run the test suites to verify that your environment adheres to all invariants:

```bash
# Run unit and concurrency test suites
npm test

# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

---

### 5. Launch the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Build & Deployment (Vercel)

1. **Build Verification:**
   ```bash
   npm run build
   ```
2. **Deploy to Vercel:**
   - Link the GitHub repository to Vercel.
   - Configure all environment variables in **Vercel Settings -> Environment Variables**.
   - Set up a Vercel Cron Job in `vercel.json` if autonomous multi-user background queue draining is desired:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/process-queue",
           "schedule": "*/5 * * * *"
         }
       ]
     }
     ```
   - Ensure the Vercel cron request passes `Authorization: Bearer <CRON_SECRET>`.
