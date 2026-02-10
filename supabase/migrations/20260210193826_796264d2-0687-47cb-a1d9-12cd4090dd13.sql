
-- Fix 1: Replace the overly permissive "System can insert versions" policy on certificate_metadata_versions
-- The WITH CHECK (true) allows any user to insert versions for any certificate
DROP POLICY IF EXISTS "System can insert versions" ON public.certificate_metadata_versions;

-- Only allow inserts from the certificate issuer or via trigger (security definer functions bypass RLS)
CREATE POLICY "Issuers can insert certificate versions"
ON public.certificate_metadata_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = certificate_metadata_versions.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- Fix 2: Restrict the public certificates view to hide wallet addresses from anonymous users
-- Drop and recreate the certificates_public view to exclude sensitive wallet data
DROP VIEW IF EXISTS public.certificates_public;

CREATE VIEW public.certificates_public AS
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

-- Note: current_owner_wallet is intentionally excluded from the public view

-- Fix 3: Ensure anonymous users are blocked on sensitive tables
-- Add explicit authenticated user checks to policies that currently only check auth.uid()
-- The profiles RLS policies already check auth.uid() = user_id which implicitly requires auth,
-- but let's make the certificates "Public can view" policy require authentication
DROP POLICY IF EXISTS "Public can view active certificates via view" ON public.certificates;

CREATE POLICY "Authenticated users can view active certificates"
ON public.certificates
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND status = 'active'::certificate_status
);
