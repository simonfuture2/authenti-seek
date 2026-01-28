-- Fix certificate_transfers RLS policy: Restrict access to involved parties and issuers
DROP POLICY IF EXISTS "Anyone can view transfers" ON public.certificate_transfers;

CREATE POLICY "Parties and issuers can view transfers"
ON public.certificate_transfers
FOR SELECT
USING (
  -- Allow if user's profile wallet matches from_wallet or to_wallet
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.wallet_address = certificate_transfers.from_wallet 
         OR profiles.wallet_address = certificate_transfers.to_wallet)
  )
  OR
  -- Allow if user is the issuer of the certificate
  EXISTS (
    SELECT 1 FROM public.certificates
    WHERE certificates.id = certificate_transfers.certificate_id
    AND certificates.issuer_id = auth.uid()
  )
);

-- Fix verification_logs RLS policy: Add access for certificate owners
DROP POLICY IF EXISTS "Verifiers and certificate owners can view logs" ON public.verification_logs;

CREATE POLICY "Verifiers, issuers, and owners can view logs"
ON public.verification_logs
FOR SELECT
USING (
  -- User is the verifier who logged this verification
  verifier_id = auth.uid()
  OR
  -- User is the issuer of the certificate
  EXISTS (
    SELECT 1 FROM public.certificates
    WHERE certificates.id = verification_logs.certificate_id
    AND certificates.issuer_id = auth.uid()
  )
  OR
  -- User's wallet matches the certificate's current owner wallet
  EXISTS (
    SELECT 1 FROM public.certificates c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = verification_logs.certificate_id
    AND c.current_owner_wallet IS NOT NULL
    AND c.current_owner_wallet = p.wallet_address
  )
);

-- Add database constraints for input validation defense in depth
-- Using DO block for conditional constraint creation
DO $$
BEGIN
  -- Check and add serial_number length constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_serial_length'
  ) THEN
    ALTER TABLE public.certificates
    ADD CONSTRAINT check_serial_length CHECK (length(serial_number) <= 50);
  END IF;

  -- Check and add product_name length constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_product_name_length'
  ) THEN
    ALTER TABLE public.certificates
    ADD CONSTRAINT check_product_name_length CHECK (length(product_name) <= 200);
  END IF;

  -- Check and add product_description length constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_description_length'
  ) THEN
    ALTER TABLE public.certificates
    ADD CONSTRAINT check_description_length CHECK (product_description IS NULL OR length(product_description) <= 2000);
  END IF;

  -- Check and add display_name length constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_display_name_length'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_display_name_length CHECK (display_name IS NULL OR length(display_name) <= 100);
  END IF;

  -- Check and add company_name length constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_company_name_length'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_company_name_length CHECK (company_name IS NULL OR length(company_name) <= 200);
  END IF;
END $$;