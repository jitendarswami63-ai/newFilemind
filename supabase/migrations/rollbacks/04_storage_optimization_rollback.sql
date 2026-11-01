DROP FUNCTION IF EXISTS public.update_document_optimized_size(uuid, uuid, text, text, bigint, bigint, bigint, numeric, text);

DROP INDEX IF EXISTS public.documents_user_opt_status_idx;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS original_file_size,
  DROP COLUMN IF EXISTS optimization_status,
  DROP COLUMN IF EXISTS optimization_saved_bytes,
  DROP COLUMN IF EXISTS optimization_savings_percent,
  DROP COLUMN IF EXISTS optimization_error;
