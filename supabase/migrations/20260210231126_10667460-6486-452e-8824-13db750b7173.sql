
-- Recreate profiles_public view with security_invoker to enforce RLS
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  company_name,
  avatar_url,
  created_at
FROM public.profiles;
