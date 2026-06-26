
-- mint_status enum
DO $$ BEGIN
  CREATE TYPE public.mint_status AS ENUM ('unminted', 'minting', 'minted', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- certificate mint columns
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata_uri TEXT,
  ADD COLUMN IF NOT EXISTS image_uri TEXT,
  ADD COLUMN IF NOT EXISTS mint_status public.mint_status NOT NULL DEFAULT 'unminted',
  ADD COLUMN IF NOT EXISTS mint_error TEXT,
  ADD COLUMN IF NOT EXISTS minted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_asset_id_unique
  ON public.certificates(asset_id) WHERE asset_id IS NOT NULL;

-- managed_wallets table
CREATE TABLE IF NOT EXISTS public.managed_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  encrypted_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.managed_wallets TO authenticated;
GRANT ALL ON public.managed_wallets TO service_role;

ALTER TABLE public.managed_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own managed wallet"
  ON public.managed_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_managed_wallets_updated_at
  BEFORE UPDATE ON public.managed_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- refund_credits RPC (service-role only)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance) VALUES (p_user_id, p_amount);
    v_balance := p_amount;
  ELSE
    v_balance := v_balance + p_amount;
    UPDATE public.user_credits
      SET balance = v_balance,
          lifetime_used = GREATEST(lifetime_used - p_amount, 0),
          updated_at = now()
      WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    p_user_id, 'refund', p_amount, v_balance, p_description, p_reference_id
  );

  RETURN QUERY SELECT TRUE, v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;
