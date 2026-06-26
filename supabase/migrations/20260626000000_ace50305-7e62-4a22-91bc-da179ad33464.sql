-- Phase 3 — Invisible Mint Pipeline
-- Adds managed (platform-custodied) wallets and cNFT mint tracking on certificates.

-- 1. Client-readable managed wallet public key on the user's profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed_wallet_address TEXT;

-- 2. Managed wallet store. The encrypted secret is a dormant safety net (mint/transfer go
--    through the collection's PermanentTransferDelegate). Service-role only — RLS is enabled
--    with NO policies, so the anon/authenticated roles can never read the encrypted secret.
CREATE TABLE IF NOT EXISTS public.managed_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_wallets ENABLE ROW LEVEL SECURITY;
-- (Intentionally no policies: only the service role bypasses RLS to read/write this table.)
-- Strip Supabase's default table-level grants from the client roles so the encrypted secret
-- can never be read even if a policy is later added by accident — defense in depth.
REVOKE ALL ON public.managed_wallets FROM anon, authenticated;
GRANT ALL ON public.managed_wallets TO service_role;

-- 3. cNFT mint tracking on certificates.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata_uri TEXT,
  ADD COLUMN IF NOT EXISTS image_uri TEXT,
  ADD COLUMN IF NOT EXISTS mint_status TEXT NOT NULL DEFAULT 'unminted',
  ADD COLUMN IF NOT EXISTS mint_error TEXT,
  ADD COLUMN IF NOT EXISTS minted_at TIMESTAMPTZ;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_mint_status_check;
ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_mint_status_check
  CHECK (mint_status IN ('unminted', 'minting', 'minted', 'failed'));

CREATE INDEX IF NOT EXISTS certificates_mint_status_idx ON public.certificates (mint_status);
CREATE INDEX IF NOT EXISTS certificates_asset_id_idx ON public.certificates (asset_id);

-- 4. Refund a credit when an invisible mint fails after the seal credit was deducted.
--    Mirrors deduct_credits: adjusts balance + lifetime_used and logs a 'refund' transaction
--    (it does NOT touch lifetime_purchased, unlike add_credits which is for purchases).
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance) VALUES (p_user_id, p_amount);
    v_new_balance := p_amount;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE public.user_credits
    SET balance = v_new_balance,
        lifetime_used = GREATEST(0, lifetime_used - p_amount),
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    p_user_id, 'refund', p_amount, v_new_balance, p_description, p_reference_id
  );

  RETURN QUERY SELECT true, v_new_balance, 'Credits refunded successfully'::TEXT;
END;
$$;

-- 5. Expose the public, on-chain-anyway mint fields via the public view (the managed wallet
--    address, encrypted secret, and mint_error remain hidden). Recreate to add columns.
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
  grader_card_snapshot,
  asset_id,
  metadata_uri,
  image_uri,
  mint_status
FROM public.certificates;

GRANT SELECT ON public.certificates_public TO anon, authenticated, service_role;
