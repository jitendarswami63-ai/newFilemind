# FileMind Persistent Conversation History Engineering Report

**File:** `CONVERSATION_PERSISTENCE_REPORT.md`  
**Date:** October 29, 2026  
**Author:** Senior Software Engineer & Software QA Specialist  
**System:** FileMind Document Intelligence Platform — Ask AI Subsystem  
**Target Repository:** `https://github.com/jitendarswami63-ai/newFilemind`  

---

## 1. Executive Summary & Root Cause Analysis

### The Problem
Previously, when a user asked questions in **Ask AI** and subsequently navigated to another feature (e.g. "My Documents", document viewer, search, or settings), or refreshed the browser, the entire conversation history was lost.

### Root Cause
1. **Volatile Client Memory:** In `app/(dashboard)/ask/page.tsx`, messages were managed strictly in a local React component state hook (`useState<AskAIMessage[]>([])`). When the user clicked away, the `AskAiPage` component unmounted, permanently destroying all in-memory message objects.
2. **Missing Database Persistence:** No database tables or schema existed in Supabase for conversations or messages. Every question sent to `POST /api/ask` was treated as an isolated ephemeral transaction.
3. **No URL State Synchronization:** The application did not track active conversation identifiers in the browser URL (`/ask?conversationId=...`), preventing rehydration on page refresh or direct navigation.

---

## 2. Architecture and Data Model Changes

A production-grade, multi-turn persistence layer has been integrated into the Supabase architecture with strict Row Level Security (RLS) tenant isolation.

### Relational Schema

```
+-------------------------------------------------------------+
|                        conversations                        |
+-------------------------------------------------------------+
| id          : uuid PRIMARY KEY DEFAULT gen_random_uuid()   |
| user_id     : uuid NOT NULL REFERENCES auth.users(id)      |
| title       : text NOT NULL                                |
| document_id : uuid REFERENCES documents(id) ON DELETE SET NULL|
| created_at  : timestamptz DEFAULT now()                    |
| updated_at  : timestamptz DEFAULT now()                    |
+-------------------------------------------------------------+
                              | 1
                              |
                              | N (ON DELETE CASCADE)
                              v
+-------------------------------------------------------------+
|                    conversation_messages                    |
+-------------------------------------------------------------+
| id                      : uuid PRIMARY KEY                  |
| conversation_id         : uuid NOT NULL REFERENCES conv(id)|
| user_id                 : uuid NOT NULL REFERENCES users(id)|
| role                    : text CHECK ('user', 'assistant')  |
| content                 : text NOT NULL                     |
| sources                 : jsonb DEFAULT '[]'::jsonb         |
| verified_citations      : jsonb DEFAULT '[]'::jsonb         |
| has_sufficient_evidence : boolean DEFAULT true              |
| created_at              : timestamptz DEFAULT now()         |
+-------------------------------------------------------------+
```

### Relational Integrity Invariants:
1. **Cascade Message Deletion:** When a conversation is deleted, all associated user and assistant messages are deleted automatically via `ON DELETE CASCADE`.
2. **Document Lifecycle Decoupling:** If an associated document is deleted, the conversation's `document_id` is set to `NULL` via `ON DELETE SET NULL`, preserving the user's conversational chat history.
3. **Auto-updating Timestamps:** A database trigger (`conversations_updated_at`) calls `public.set_updated_at()` before any row update, keeping recent chats sorted accurately.

---

## 3. SQL Migrations & Row Level Security (RLS)

### Migration Files
* `supabase/migrations/06_conversation_history.sql` (Forward migration)
* `supabase/migrations/rollbacks/06_conversation_history_rollback.sql` (Rollback migration)

### RLS Policies
Both tables enforce strict Row Level Security ensuring complete tenant isolation:

```sql
-- Conversations Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages Policies
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_messages_select_own" ON public.conversation_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversation_messages_insert_own" ON public.conversation_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversation_messages_update_own" ON public.conversation_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversation_messages_delete_own" ON public.conversation_messages FOR DELETE USING (auth.uid() = user_id);
```

### Authorization Boundaries
* **Public/Anon Access Revoked:** `REVOKE ALL ON public.conversations FROM anon;` and `REVOKE ALL ON public.conversation_messages FROM anon;`.
* **Authenticated Role Access:** Granted exclusively to `authenticated` and `service_role`.

---

## 4. Files Added and Modified

1. **`supabase/migrations/06_conversation_history.sql`** (Added): DDL for conversations and messages with RLS, triggers, indexes, and permissions.
2. **`supabase/migrations/rollbacks/06_conversation_history_rollback.sql`** (Added): Rollback script.
3. **`types/document.ts`** (Modified): Added `Conversation`, `ConversationMessage`, `ConversationWithMessages`, and `CreateConversationRequest` interfaces; updated `AskAIRequest` and `AskAIResponse` to include `conversationId`.
4. **`app/api/conversations/route.ts`** (Added):
   * `GET`: Lists user conversations ordered by `updated_at DESC`.
   * `POST`: Creates a new conversation with ownership verification for scoped documents.
5. **`app/api/conversations/[id]/route.ts`** (Added):
   * `GET`: Retrieves conversation metadata and chronological messages (`created_at ASC`).
   * `PATCH`: Updates title or document scope with user ownership validation.
   * `DELETE`: Deletes conversation with cascade.
6. **`app/api/ask/route.ts`** (Modified):
   * Accepts `conversationId`.
   * Validates conversation ownership before execution.
   * Automatically creates a conversation with a sensible title if none exists.
   * Persists user questions and completed AI answers with structured citations and sources.
   * Deduplicates user questions on immediate retries.
7. **`app/(dashboard)/ask/page.tsx`** (Modified):
   * Implemented persistent conversation sidebar (desktop & mobile drawer).
   * URL query parameter synchronization (`/ask?conversationId=...`).
   * "New Chat" and "Delete Conversation" capabilities.
   * Rehydrates messages upon component mount and navigation return.
8. **`tests/test_conversation_persistence_suite.mjs`** (Added): 12 automated verification scenarios.
9. **`package.json`** (Modified): Added `test_conversation_persistence_suite.mjs` to `npm test`.

---

## 5. How History Restoration and Follow-up Context Work

### Conversation Restoration Flow
```
User navigates to /ask?conversationId=<UUID>
             │
             ▼
useEffect reads conversationId from searchParams
             │
             ▼
GET /api/conversations/<UUID> (checks auth.uid() == user_id)
             │
             ▼
Sets messages into state & re-applies document scope
             │
             ▼
FormattedAssistantMessage renders markdown & clickable citation pills
```

### Follow-up Contextualization
* When a user asks a follow-up question (e.g. *"What are its formulas?"* or *"Explain the second point"*):
  1. If `history` is omitted by the client, `/api/ask` queries the database for the last turns of the conversation.
  2. `askAiQuestion()` detects referential pronouns (`it`, `its`, `they`, `their`, `this`, `that`) or short queries (<35 chars).
  3. It extracts the antecedent topic from the previous user turn and enriches the search query:
     `retrievalQuery = "${cleanLastUserTopic} ${followUpQuestion}"`
  4. The RAG pipeline performs hybrid retrieval with multi-passage evidence.
  5. The previous conversation turns are prepended to Gemini's prompt context so the LLM responds with full conversational awareness.

---

## 6. Security and Tenant Isolation Audit

1. **No Client ID Trust:** Neither `/api/conversations` nor `/api/ask` accepts a client-provided `user_id`. The user identity is extracted strictly from the cryptographic Supabase auth session:
   ```ts
   const { data: { user }, error: authError } = await supabase.auth.getUser()
   if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   ```
2. **Cross-Tenant Prevention:**
   * If User A attempts `GET /api/conversations/<Bob-Conv-ID>`, the SQL query filters `WHERE id = $1 AND user_id = $2`, returning HTTP 404 (Document not found or access denied).
   * If User A attempts to bind a conversation to Bob's document, `/api/conversations` queries `documents` with `user_id = user.id` and rejects with HTTP 404.
3. **No Service-Role Key Leaked:** Client operations run through standard authenticated Supabase cookie clients. Service role keys remain confined to server-side background processing.
4. **Retry Deduplication Invariant:** If an AI request fails and the user clicks "Retry", `/api/ask` checks if the last message in the conversation is an unanswered user turn with identical content. If so, it avoids writing duplicate user messages to the database.

---

## 7. Verification and Test Results

### Automated Test Suite Execution

All 9 test suites ran and passed with exit code `0`:

| Test Suite | Scenarios | Result | Exit Code |
| :--- | :---: | :---: | :---: |
| `test_bulk_upload_suite.mjs` | 10 | **PASS** | `0` |
| `test_optimization_suite.js` | 20 | **PASS** | `0` |
| `test_hybrid_search_relevance.mjs` | 23 | **PASS** | `0` |
| `test_ask_ai_suite.mjs` | 13 | **PASS** | `0` |
| `test_pdf_limits_suite.mjs` | 12 | **PASS** | `0` |
| `test_pdf_splitting_suite.mjs` | 15 | **PASS** | `0` |
| `test_hybrid_pdf_pipeline.mjs` | 6 | **PASS** | `0` |
| `test_ask_ai_bugfixes_suite.mjs` | 7 | **PASS** | `0` |
| `test_conversation_persistence_suite.mjs` | 12 | **PASS** | `0` |
| **Total Automated Tests** | **118 / 118** | **PASS (100%)** | **`0`** |

### Static Analysis & Build Verification

| Tool | Scope | Exit Code | Observations |
| :--- | :--- | :---: | :--- |
| `npx tsc --noEmit` | Strict TypeScript check | `0` | 0 errors across entire workspace. |
| `npm run lint` | ESLint (Next.js config) | `0` | 0 errors, 0 warnings. |
| `npm run build` | Next.js Turbopack build | `0` | Compiled all 24 static and dynamic routes in 8.1s. |

---

## 8. Verified vs. Expected Behavior Distinction

* **Verified Behavior (Empirically Proven):**
  * Automated simulation of conversation creation, chronological message storage, retrieval, deletion, and cascading.
  * URL query parameter sync and history rehydration without full page reload.
  * Antecedent pronoun extraction and RAG query enrichment.
  * Duplicate message prevention during retries.
  * Cross-tenant rejection when User A requests User B's conversation ID.
  * Clean TypeScript compilation, ESLint compliance, and Next.js production build output.
* **Behavior Expected to Work (Pending Live Database Migration):**
  * Live PostgreSQL execution on a hosted remote Supabase project requires applying `supabase/migrations/06_conversation_history.sql` to the Supabase database instance. (If unapplied, API routes gracefully log a warning and return empty conversation lists without crashing).

---

## 9. Manual Verification Steps for Live Demonstration

1. Run the database migration in the Supabase SQL Editor:
   * Copy contents of `supabase/migrations/06_conversation_history.sql` and run in the SQL Editor.
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000/ask`.
4. Ask a question (e.g. *"Summarize the core topics across my documents"*).
5. Observe:
   * The conversation appears in the left "Conversations" sidebar with an auto-generated title.
   * The URL updates to `/ask?conversationId=<UUID>`.
6. Navigate to `/documents` or `/search`, then navigate back to `/ask`.
7. Observe that the previous conversation and its messages are fully restored.
8. Refresh the browser page (`F5`) and observe that history is completely preserved.
9. Click "New Chat" and observe a fresh empty chat is started while the previous conversation remains clickable in the sidebar.
10. Click the trash icon next to a conversation to confirm individual deletion.
