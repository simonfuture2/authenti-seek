
-- Fix the security definer view issue by recreating with security_invoker=on
DROP VIEW IF EXISTS public.certificates_public;

CREATE VIEW public.certificates_public
WITH (security_invoker=on) AS
SELECT
  id,
  serial_number,
  product_name,
  product_description,
  product_category,
  product_images,
  physical_attributes,
  unique_identifiers,
  metadata,
  status,
  issued_at,
  created_at,
  updated_at,
  qr_code_data,
  issuer_id,
  solana_signature,
  solana_account
FROM public.certificates
WHERE status = 'active';

-- Also fix profiles_public view if it has the same issue
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
