-- Step 1 - Shared trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $BODY$
BEGIN
  new.updated_at = pg_catalog.now();
  RETURN new;
END;
$BODY$;

-- Step 2 - Profiles table
CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3 - Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN new;
END;
$BODY$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Step 4 - Documents table
CREATE TABLE public.documents (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename              text        NOT NULL,
  storage_path          text        NOT NULL UNIQUE,
  file_size             bigint      CHECK (file_size IS NULL OR file_size > 0),
  mime_type             text        NOT NULL DEFAULT 'application/pdf',
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message         text,
  doc_category          text,
  tags                  text[]      DEFAULT '{}',
  extracted_data        jsonb       DEFAULT '{}'::jsonb,
  page_count            integer,
  is_scanned            boolean     DEFAULT false,
  processing_attempts   integer     NOT NULL DEFAULT 0,
  processing_stage      text,
  processing_locked_at  timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step 5 - Documents indexes
CREATE INDEX documents_user_id_idx ON public.documents(user_id);
CREATE INDEX documents_status_idx ON public.documents(status);
CREATE INDEX documents_user_status_idx ON public.documents(user_id, status);
CREATE INDEX documents_user_created_idx ON public.documents(user_id, created_at desc);

-- Step 6 - Documents RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Step 7 - create_document_with_quota function
CREATE OR REPLACE FUNCTION public.create_document_with_quota(
  p_id uuid,
  p_user_id uuid,
  p_filename text,
  p_storage_path text,
  p_file_size bigint
) RETURNS TABLE(result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
DECLARE
  v_count int;
  v_rate_limit int := 20;
  v_actual_size bigint;
  v_owner text;
BEGIN
  IF pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub' IS NULL OR 
     (pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch or not authenticated';
  END IF;

  IF pg_catalog.split_part(p_storage_path, '/', 1) != p_user_id::text THEN
    RAISE EXCEPTION 'Unauthorized: storage_path does not belong to user';
  END IF;

  SELECT (metadata->>'size')::bigint, owner_id 
  INTO v_actual_size, v_owner
  FROM storage.objects
  WHERE bucket_id = 'documents' AND name = p_storage_path;

  IF v_actual_size IS NULL THEN
    RAISE EXCEPTION 'Storage object does not exist';
  END IF;
  IF v_actual_size != p_file_size THEN
    RAISE EXCEPTION 'Storage object size mismatch';
  END IF;
  IF v_owner != p_user_id::text THEN
    RAISE EXCEPTION 'Storage object not owned by user';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text));

  SELECT count(*) INTO v_count
    FROM public.documents
    WHERE user_id = p_user_id
      AND created_at > pg_catalog.now() - INTERVAL '1 hour';

  IF v_count >= v_rate_limit THEN
    RETURN QUERY SELECT 'rate_limited'::text;
    RETURN;
  END IF;

  INSERT INTO public.documents (
    id, user_id, filename, storage_path, file_size, mime_type, status
  ) VALUES (
    p_id, p_user_id, p_filename, p_storage_path, p_file_size, 'application/pdf', 'pending'
  );

  RETURN QUERY SELECT 'ok'::text;
END;
$BODY$;
REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) TO authenticated;

-- Storage RLS (Make sure bucket is created first manually)
-- INSERT
create policy "storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT
create policy "storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE
create policy "storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
