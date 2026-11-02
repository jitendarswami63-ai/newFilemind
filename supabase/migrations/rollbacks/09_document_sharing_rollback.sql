-- ============================================================================
-- Migration Rollback: 09_document_sharing_rollback.sql
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_document_recipient(uuid, uuid);
DROP TABLE IF EXISTS public.document_shares CASCADE;
