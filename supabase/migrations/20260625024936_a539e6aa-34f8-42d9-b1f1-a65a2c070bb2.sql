CREATE OR REPLACE VIEW public.certificates_public AS
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
  issuer_id,
  grader,
  grader_cert_number,
  grader_grade,
  grader_grade_scale,
  grader_report_url,
  grader_images,
  grader_match_status,
  grader_verified_at,
  grader_card_snapshot
FROM public.certificates;

GRANT SELECT ON public.certificates_public TO anon, authenticated, service_role;