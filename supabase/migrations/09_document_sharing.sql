-- ============================================================================
-- Migration: 09_document_sharing.sql
-- Description: Complete document sharing schema supporting both public link
--              sharing and restricted authenticated user sharing with strict RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_mode text NOT NULL CHECK (sharing_mode IN ('public', 'restricted')),
  token_hash text NULL,
  recipient_email text NULL,
  recipient_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  allow_download boolean NOT NULL DEFAULT true,
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS document_shares_updated_at ON public.document_shares;
CREATE TRIGGER document_shares_updated_at
  BEFORE UPDATE ON public.document_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance & quick authorization lookups
CREATE INDEX IF NOT EXISTS idx_document_shares_doc_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_owner_id ON public.document_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_recipient_email ON public.document_shares(lower(recipient_email));
CREATE INDEX IF NOT EXISTS idx_document_shares_recipient_user ON public.document_shares(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token_hash ON public.document_shares(token_hash) WHERE token_hash IS NOT NULL;

-- Unique partial index: At most ONE active public share per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_public_share
  ON public.document_shares(document_id)
  WHERE sharing_mode = 'public' AND revoked_at IS NULL;

-- Unique partial index: At most ONE active restricted share per recipient per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_restricted_share
  ON public.document_shares(document_id, lower(recipient_email))
  WHERE sharing_mode = 'restricted' AND revoked_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- 1. Document owner has full CRUD access to their document shares
DROP POLICY IF EXISTS "document_shares_owner_all" ON public.document_shares;
CREATE POLICY "document_shares_owner_all" ON public.document_shares
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 2. Authorized restricted recipients can view shares granted to them
DROP POLICY IF EXISTS "document_shares_recipient_select" ON public.document_shares;
CREATE POLICY "document_shares_recipient_select" ON public.document_shares
  FOR SELECT USING (
    sharing_mode = 'restricted'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      recipient_user_id = auth.uid()
      OR lower(recipient_email) = lower(auth.jwt()->>'email')
    )
  );

-- Helper function: Check if an authenticated user is an authorized recipient of a document
CREATE OR REPLACE FUNCTION public.is_document_recipient(p_user_id uuid, p_doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
BEGIN
  IF p_user_id IS NULL OR p_doc_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  RETURN EXISTS (
    SELECT 1 FROM public.document_shares
    WHERE document_id = p_doc_id
      AND sharing_mode = 'restricted'
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        recipient_user_id = p_user_id
        OR (v_email IS NOT NULL AND lower(recipient_email) = lower(v_email))
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_document_recipient(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_document_recipient(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_document_recipient(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_document_recipient(uuid, uuid) TO service_role;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO service_role;
REVOKE ALL ON public.document_shares FROM anon;
