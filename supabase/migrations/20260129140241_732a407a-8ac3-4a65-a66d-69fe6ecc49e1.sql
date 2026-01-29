-- Add physical measurements and unique identifiers to certificates
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS physical_attributes JSONB DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS unique_identifiers JSONB DEFAULT '{}' NOT NULL;

-- Create verification_results table to store detailed verification outcomes
CREATE TABLE public.verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  verifier_id UUID NOT NULL,
  verification_log_id UUID REFERENCES public.verification_logs(id) ON DELETE SET NULL,
  
  -- Confidence scoring
  overall_confidence DECIMAL(5,2) NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 100),
  image_confidence DECIMAL(5,2) CHECK (image_confidence >= 0 AND image_confidence <= 100),
  attribute_confidence DECIMAL(5,2) CHECK (attribute_confidence >= 0 AND attribute_confidence <= 100),
  identifier_confidence DECIMAL(5,2) CHECK (identifier_confidence >= 0 AND identifier_confidence <= 100),
  
  -- Evidence
  verification_photos TEXT[] DEFAULT '{}',
  attribute_checklist JSONB DEFAULT '{}',
  identifier_matches JSONB DEFAULT '{}',
  ai_analysis TEXT,
  
  -- Metadata
  notes TEXT,
  result_status TEXT NOT NULL DEFAULT 'pending' CHECK (result_status IN ('pending', 'authentic', 'suspicious', 'counterfeit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_results
CREATE POLICY "Verifiers can create verification results"
ON public.verification_results
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'verifier') AND verifier_id = auth.uid());

CREATE POLICY "Verifiers can view their own results"
ON public.verification_results
FOR SELECT
USING (verifier_id = auth.uid());

CREATE POLICY "Issuers can view results for their certificates"
ON public.verification_results
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM certificates c
  WHERE c.id = verification_results.certificate_id
  AND c.issuer_id = auth.uid()
));

-- Index for faster lookups
CREATE INDEX idx_verification_results_certificate ON public.verification_results(certificate_id);
CREATE INDEX idx_verification_results_verifier ON public.verification_results(verifier_id);

-- Add comment for documentation
COMMENT ON TABLE public.verification_results IS 'Stores detailed verification outcomes with AI confidence scoring';
COMMENT ON COLUMN public.certificates.physical_attributes IS 'Physical measurements like weight, dimensions, materials';
COMMENT ON COLUMN public.certificates.unique_identifiers IS 'Serial numbers, NFC tag IDs, batch codes, etc.';