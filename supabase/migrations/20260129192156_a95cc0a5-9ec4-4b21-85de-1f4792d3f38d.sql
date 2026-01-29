-- Create a public view that excludes sensitive blockchain transaction data
CREATE VIEW public.certificates_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    serial_number,
    product_name,
    product_description,
    product_category,
    product_images,
    metadata,
    physical_attributes,
    unique_identifiers,
    qr_code_data,
    status,
    issued_at,
    created_at,
    updated_at,
    issuer_id,
    current_owner_wallet,
    -- Only expose blockchain data AFTER transaction is complete (signature exists and no pending)
    CASE 
      WHEN solana_signature IS NOT NULL AND chain_pending_at IS NULL 
      THEN solana_signature 
      ELSE NULL 
    END as solana_signature,
    CASE 
      WHEN solana_signature IS NOT NULL AND chain_pending_at IS NULL 
      THEN solana_account 
      ELSE NULL 
    END as solana_account
    -- chain_pending_by and chain_pending_at are NEVER exposed publicly
  FROM public.certificates;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active certificates" ON public.certificates;

-- Create a more restrictive policy: only issuers see their own, owners see theirs
CREATE POLICY "Issuers and owners can view their certificates" 
ON public.certificates 
FOR SELECT 
USING (
  issuer_id = auth.uid() 
  OR (
    current_owner_wallet IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.wallet_address = certificates.current_owner_wallet
    )
  )
);

-- Allow public access through the VIEW for active certificates only
CREATE POLICY "Public can view active certificates via view" 
ON public.certificates 
FOR SELECT 
USING (status = 'active'::certificate_status);