-- Migration: 11_r2_storage_migration.sql
-- Description: Track storage provider ('r2' | 'supabase') for seamless migration

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'supabase';

CREATE INDEX IF NOT EXISTS idx_documents_storage_provider ON public.documents(storage_provider);

COMMENT ON COLUMN public.documents.storage_provider IS 'Binary storage location: supabase (legacy) or r2 (Cloudflare R2)';
