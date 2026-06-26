
-- 1) profiles: add managed_wallet_address
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_wallet_address TEXT;

-- 2) managed_wallets: lock down to service role only (drop any authenticated policy)
DROP POLICY IF EXISTS "Users read own managed wallet" ON public.managed_wallets;
ALTER TABLE public.managed_wallets ENABLE ROW LEVEL SECURITY;

-- 3) certificates: add nft_* columns requested by spec.
-- Note: existing asset_id / metadata_uri / image_uri / mint_status (enum) / minted_at remain
-- in place for backwards compatibility with the deployed mint-coa function.
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS nft_asset_id TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS nft_metadata_uri TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS nft_image_uri TEXT;
