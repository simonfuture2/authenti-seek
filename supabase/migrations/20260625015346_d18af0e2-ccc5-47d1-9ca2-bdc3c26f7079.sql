
-- Replace collector role-based policies with plain authenticated-owner checks.
DROP POLICY IF EXISTS "Collectors can create certificates" ON public.certificates;
DROP POLICY IF EXISTS "Collectors can update their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Collectors can mark certificates as chain pending" ON public.certificates;

CREATE POLICY "Authenticated users can create their own certificates"
  ON public.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (issuer_id = auth.uid());

CREATE POLICY "Owners can update their own certificates"
  ON public.certificates
  FOR UPDATE
  TO authenticated
  USING (issuer_id = auth.uid())
  WITH CHECK (issuer_id = auth.uid());

CREATE POLICY "Owners can delete their own certificates"
  ON public.certificates
  FOR DELETE
  TO authenticated
  USING (issuer_id = auth.uid());
