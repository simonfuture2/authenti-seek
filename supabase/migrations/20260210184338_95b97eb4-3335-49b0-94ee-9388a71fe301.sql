
-- Create enum types for LP deposits
CREATE TYPE public.lp_deposit_type AS ENUM ('sol', 'usdc', 'usdt');
CREATE TYPE public.lp_deposit_status AS ENUM ('pending', 'confirmed', 'failed');

-- Create asset_lp_deposits table
CREATE TABLE public.asset_lp_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  depositor_id uuid NOT NULL,
  deposit_type lp_deposit_type NOT NULL,
  amount_token numeric NOT NULL,
  amount_usd_at_deposit numeric NOT NULL,
  solana_signature text NOT NULL UNIQUE,
  status lp_deposit_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create asset_lp_summary table
CREATE TABLE public.asset_lp_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.certificates(id) ON DELETE CASCADE,
  total_sol numeric NOT NULL DEFAULT 0,
  total_usdc numeric NOT NULL DEFAULT 0,
  total_usdt numeric NOT NULL DEFAULT 0,
  floor_value_usd numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_lp_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_lp_summary ENABLE ROW LEVEL SECURITY;

-- RLS for asset_lp_deposits: Issuers can view deposits for their certificates
CREATE POLICY "Issuers can view their certificate LP deposits"
ON public.asset_lp_deposits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_deposits.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- Issuers can insert deposits for their certificates
CREATE POLICY "Issuers can create LP deposits"
ON public.asset_lp_deposits FOR INSERT
WITH CHECK (
  auth.uid() = depositor_id
  AND EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_deposits.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- System/edge function can update deposit status (via service role)
CREATE POLICY "System can update deposit status"
ON public.asset_lp_deposits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_deposits.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- RLS for asset_lp_summary: Issuers can manage their certificate LP summary
CREATE POLICY "Issuers can view their certificate LP summary"
ON public.asset_lp_summary FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_summary.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

CREATE POLICY "Issuers can create LP summary"
ON public.asset_lp_summary FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_summary.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

CREATE POLICY "Issuers can update their LP summary"
ON public.asset_lp_summary FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = asset_lp_summary.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- Public can view LP summaries for active certificates
CREATE POLICY "Public can view active LP summaries"
ON public.asset_lp_summary FOR SELECT
USING (is_active = true);

-- Public can view confirmed deposits for active LP certificates
CREATE POLICY "Public can view confirmed LP deposits"
ON public.asset_lp_deposits FOR SELECT
USING (
  status = 'confirmed'
  AND EXISTS (
    SELECT 1 FROM public.asset_lp_summary s
    WHERE s.certificate_id = asset_lp_deposits.certificate_id
    AND s.is_active = true
  )
);

-- Add updated_at trigger for asset_lp_summary
CREATE TRIGGER update_asset_lp_summary_updated_at
BEFORE UPDATE ON public.asset_lp_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_asset_lp_deposits_certificate ON public.asset_lp_deposits(certificate_id);
CREATE INDEX idx_asset_lp_deposits_status ON public.asset_lp_deposits(status);
