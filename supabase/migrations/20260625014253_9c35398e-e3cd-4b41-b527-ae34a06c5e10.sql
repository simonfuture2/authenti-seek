
UPDATE public.user_roles SET role = 'collector'::public.app_role WHERE role IN ('issuer', 'verifier');

DROP POLICY IF EXISTS "Issuers can create certificates" ON public.certificates;
CREATE POLICY "Collectors can create certificates"
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'collector') AND issuer_id = auth.uid());

DROP POLICY IF EXISTS "Issuers can update their own certificates" ON public.certificates;
CREATE POLICY "Collectors can update their own certificates"
  ON public.certificates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'collector') AND issuer_id = auth.uid());

DROP POLICY IF EXISTS "Verifiers can mark certificates as chain pending" ON public.certificates;
CREATE POLICY "Collectors can mark certificates as chain pending"
  ON public.certificates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'collector') AND status = 'active'::public.certificate_status AND solana_signature IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'collector') AND status = 'active'::public.certificate_status AND solana_signature IS NULL);

DROP POLICY IF EXISTS "Issuers can create transfers for their certificates" ON public.certificate_transfers;
CREATE POLICY "Collectors can create transfers for their certificates"
  ON public.certificate_transfers FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'collector')
    AND EXISTS (
      SELECT 1 FROM public.certificates c
      WHERE c.id = certificate_transfers.certificate_id AND c.issuer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Verifiers can create reports" ON public.fake_reports;
CREATE POLICY "Collectors can create reports"
  ON public.fake_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'collector') AND reporter_id = auth.uid());

DROP POLICY IF EXISTS "Verifiers can create verification logs" ON public.verification_logs;
CREATE POLICY "Collectors can create verification logs"
  ON public.verification_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'collector') AND verifier_id = auth.uid());

DROP POLICY IF EXISTS "Verifiers can create verification results" ON public.verification_results;
CREATE POLICY "Collectors can create verification results"
  ON public.verification_results FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'collector') AND verifier_id = auth.uid());
