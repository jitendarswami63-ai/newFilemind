DROP TABLE IF EXISTS public.biometric_leases CASCADE;
DROP TABLE IF EXISTS public.biometric_credentials CASCADE;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS is_locked,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS key_version,
  DROP COLUMN IF EXISTS encrypted_dek,
  DROP COLUMN IF EXISTS dek_iv,
  DROP COLUMN IF EXISTS dek_tag,
  DROP COLUMN IF EXISTS file_iv,
  DROP COLUMN IF EXISTS file_tag;

DROP FUNCTION IF EXISTS public.has_active_biometric_lease(uuid, uuid);
