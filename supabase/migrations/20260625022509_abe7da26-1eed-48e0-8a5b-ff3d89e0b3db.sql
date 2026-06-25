
-- 1) Add grader columns to certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS grader TEXT,
  ADD COLUMN IF NOT EXISTS grader_cert_number TEXT,
  ADD COLUMN IF NOT EXISTS grader_grade TEXT,
  ADD COLUMN IF NOT EXISTS grader_grade_scale TEXT,
  ADD COLUMN IF NOT EXISTS grader_report_url TEXT,
  ADD COLUMN IF NOT EXISTS grader_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS grader_match_status TEXT NOT NULL DEFAULT 'self_attested',
  ADD COLUMN IF NOT EXISTS grader_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grader_card_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_grader_match_status_check;
ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_grader_match_status_check
  CHECK (grader_match_status IN ('grader_verified','grader_linked','self_attested','mismatch'));

-- 2) Unique partial index: one slab => one certificate
CREATE UNIQUE INDEX IF NOT EXISTS certificates_grader_slab_unique
  ON public.certificates (grader, grader_cert_number)
  WHERE grader IS NOT NULL AND grader_cert_number IS NOT NULL;

-- 3) grader_verifications table
CREATE TABLE IF NOT EXISTS public.grader_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  grader TEXT NOT NULL,
  grader_cert_number TEXT NOT NULL,
  result_status TEXT NOT NULL,
  raw_response JSONB,
  cross_check JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT grader_verifications_result_status_check
    CHECK (result_status IN ('grader_verified','grader_linked','self_attested','mismatch','not_found','error'))
);

CREATE INDEX IF NOT EXISTS grader_verifications_certificate_id_idx
  ON public.grader_verifications (certificate_id);
CREATE INDEX IF NOT EXISTS grader_verifications_grader_cert_idx
  ON public.grader_verifications (grader, grader_cert_number);

GRANT SELECT ON public.grader_verifications TO anon, authenticated;
GRANT ALL ON public.grader_verifications TO service_role;

ALTER TABLE public.grader_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grader verifications are publicly readable" ON public.grader_verifications;
CREATE POLICY "Grader verifications are publicly readable"
  ON public.grader_verifications
  FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE policies: only service_role (which bypasses RLS) can write.
