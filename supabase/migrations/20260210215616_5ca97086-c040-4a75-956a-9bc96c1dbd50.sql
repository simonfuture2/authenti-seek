
-- Phase 2: NFC replay protection table
CREATE TABLE public.nfc_verification_nonces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  certificate_id UUID NOT NULL REFERENCES public.certificates(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nfc_verification_nonces ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert nonces
CREATE POLICY "Authenticated users can insert nonces"
ON public.nfc_verification_nonces
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only the system (service role) can update nonces (mark as used)
-- No client-side SELECT/UPDATE/DELETE needed

-- Auto-cleanup: delete used nonces older than 1 hour (via index for efficient queries)
CREATE INDEX idx_nfc_nonces_scanned_at ON public.nfc_verification_nonces(scanned_at);
CREATE INDEX idx_nfc_nonces_nonce ON public.nfc_verification_nonces(nonce);

-- Phase 4.2: Add metadata_hash column to certificates for direct lookup
ALTER TABLE public.certificates ADD COLUMN metadata_hash TEXT;
CREATE INDEX idx_certificates_metadata_hash ON public.certificates(metadata_hash);
