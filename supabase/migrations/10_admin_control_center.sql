-- ============================================================================
-- FileMind Migration 10: Admin Control Center Schema
-- Tables: admin_audit_logs, admin_user_activity, admin_subscription_grants, website_content
-- ============================================================================

-- 1. ADMIN AUDIT LOGS (Immutable record of all administrative operations)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action_type text NOT NULL,
  target_id text,
  target_email text,
  details jsonb DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all direct modifications from anon/authenticated clients (service-role only)
CREATE POLICY "admin_audit_logs_service_only" ON public.admin_audit_logs
  FOR ALL
  USING (false);

-- 2. ADMIN USER ACTIVITY (Sign-in, sign-up and authentication events)
CREATE TABLE IF NOT EXISTS public.admin_user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  event_type text NOT NULL,
  auth_method text DEFAULT 'password',
  session_status text DEFAULT 'success',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_activity_user_id ON public.admin_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_activity_created_at ON public.admin_user_activity(created_at DESC);

ALTER TABLE public.admin_user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_user_activity_service_only" ON public.admin_user_activity
  FOR ALL
  USING (false);

-- 3. ADMIN SUBSCRIPTION GRANTS (Manual Pro/Elite grants separate from paid Razorpay orders)
CREATE TABLE IF NOT EXISTS public.admin_subscription_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  granted_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_by_email text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('pro', 'elite')),
  duration_days integer, -- null means lifetime
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- null means lifetime
  reason text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_subscription_grants_user_id ON public.admin_subscription_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_subscription_grants_status ON public.admin_subscription_grants(status);
CREATE INDEX IF NOT EXISTS idx_admin_subscription_grants_expires_at ON public.admin_subscription_grants(expires_at);

ALTER TABLE public.admin_subscription_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_subscription_grants_service_only" ON public.admin_subscription_grants
  FOR ALL
  USING (false);

-- 4. WEBSITE CONTENT (CMS drafts and published site content)
CREATE TABLE IF NOT EXISTS public.website_content (
  id text PRIMARY KEY,
  draft_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published content
CREATE POLICY "website_content_public_read" ON public.website_content
  FOR SELECT
  USING (true);
