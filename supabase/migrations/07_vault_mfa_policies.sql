-- ============================================================================
-- Migration: 07_vault_mfa_policies.sql
-- Description: Enforces AAL2 Multi-Factor Authentication (TOTP) for Private Vault
--              document operations on public.documents and storage.objects
-- ============================================================================

-- Function to check if a user has at least one verified MFA factor enrolled
CREATE OR REPLACE FUNCTION public.user_has_verified_mfa(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.mfa_factors
    WHERE user_id = p_user_id
      AND status = 'verified'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.user_has_verified_mfa(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_verified_mfa(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_verified_mfa(uuid) TO authenticated;

-- Function to verify whether the current session is authorized to access Private Vault
-- Rules:
-- 1. If user has NOT enrolled in MFA -> baseline authentication (AAL1) is authorized
-- 2. If user HAS enrolled in verified MFA -> current session MUST be at AAL2
CREATE OR REPLACE FUNCTION public.is_vault_authorized(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt_claims jsonb;
  v_aal text;
BEGIN
  -- If user has not enrolled in verified MFA, standard access is granted
  IF NOT public.user_has_verified_mfa(p_user_id) THEN
    RETURN true;
  END IF;

  -- For MFA-enrolled users, verify that the current session has completed AAL2
  BEGIN
    v_jwt_claims := pg_catalog.current_setting('request.jwt.claims', true)::jsonb;
    v_aal := v_jwt_claims ->> 'aal';
    RETURN v_aal = 'aal2';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_vault_authorized(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_vault_authorized(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_vault_authorized(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- Update Row Level Security Policies on public.documents
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;

CREATE POLICY "documents_select_own" ON public.documents FOR SELECT
  USING (auth.uid() = user_id AND public.is_vault_authorized(auth.uid()));

CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_vault_authorized(auth.uid()));

CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE
  USING (auth.uid() = user_id AND public.is_vault_authorized(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_vault_authorized(auth.uid()));

CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE
  USING (auth.uid() = user_id AND public.is_vault_authorized(auth.uid()));

-- ----------------------------------------------------------------------------
-- Update Row Level Security Policies on public.document_pages
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "document_pages_select_own" ON public.document_pages;

CREATE POLICY "document_pages_select_own" ON public.document_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_pages.document_id
      AND d.user_id = auth.uid()
      AND public.is_vault_authorized(auth.uid())
  ));

-- ----------------------------------------------------------------------------
-- Update Storage Object Policies for the 'documents' bucket
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;

CREATE POLICY "storage_select_own" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_vault_authorized(auth.uid())
  );

CREATE POLICY "storage_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_vault_authorized(auth.uid())
  );

CREATE POLICY "storage_delete_own" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_vault_authorized(auth.uid())
  );
