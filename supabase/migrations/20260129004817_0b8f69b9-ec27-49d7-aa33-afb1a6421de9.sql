-- Add chain pending tracking columns to certificates table
ALTER TABLE public.certificates
ADD COLUMN chain_pending_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN chain_pending_by UUID DEFAULT NULL;

-- Create RLS policy for verifiers to mark certificates as chain pending
CREATE POLICY "Verifiers can mark certificates as chain pending"
ON public.certificates
FOR UPDATE
USING (
  has_role(auth.uid(), 'verifier'::app_role) 
  AND status = 'active'
  AND solana_signature IS NULL
)
WITH CHECK (
  has_role(auth.uid(), 'verifier'::app_role)
  AND status = 'active'
  AND solana_signature IS NULL
);

-- Add index for efficient chain pending queries
CREATE INDEX idx_certificates_chain_pending ON public.certificates (chain_pending_at) 
WHERE chain_pending_at IS NOT NULL;