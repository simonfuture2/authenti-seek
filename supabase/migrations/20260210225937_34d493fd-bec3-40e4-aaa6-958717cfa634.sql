
-- Recreate certificates_public view with security_invoker so base table RLS applies
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
    qr_code_data,
    solana_signature,
    solana_account,
    status,
    issued_at,
    created_at,
    updated_at,
    metadata,
    physical_attributes,
    unique_identifiers,
    issuer_id
  FROM public.certificates;
