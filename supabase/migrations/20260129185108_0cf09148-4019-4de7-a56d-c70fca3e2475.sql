-- Fix 1: Add unique constraint on solana_signature to prevent double-spend race condition
CREATE UNIQUE INDEX unique_solana_signature ON public.credit_transactions (solana_signature) 
WHERE solana_signature IS NOT NULL;

-- Fix 2: Restrict certificate version history access to issuers only (currently exposes user IDs and activity)
DROP POLICY IF EXISTS "Anyone can view versions for active certificates" ON public.certificate_metadata_versions;

CREATE POLICY "Issuers can view their certificate versions" 
ON public.certificate_metadata_versions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM certificates c
    WHERE c.id = certificate_metadata_versions.certificate_id
      AND c.issuer_id = auth.uid()
  )
);