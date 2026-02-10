
-- Fix 1: Profiles - restrict direct table access, create public view
-- Drop the overly permissive SELECT policy
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Users can only view their own full profile (includes email, wallet)
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Create a public-safe view excluding sensitive fields
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT
    user_id,
    display_name,
    company_name,
    avatar_url,
    created_at
  FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Fix 2: Audit logs - require user_id on insert
DROP POLICY "Users can insert audit logs" ON public.blockchain_audit_logs;

CREATE POLICY "Users can insert their own audit logs"
  ON public.blockchain_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
