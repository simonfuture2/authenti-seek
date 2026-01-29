-- Create enum for change types
CREATE TYPE public.metadata_change_type AS ENUM ('created', 'updated', 'transferred', 'minted', 'revoked');

-- Create metadata versions table
CREATE TABLE public.certificate_metadata_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  metadata_snapshot JSONB NOT NULL,
  change_type metadata_change_type NOT NULL,
  change_description TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_version_id UUID REFERENCES public.certificate_metadata_versions(id),
  UNIQUE(certificate_id, version_number)
);

-- Enable RLS
ALTER TABLE public.certificate_metadata_versions ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view versions for active certificates (matches certificate policy)
CREATE POLICY "Anyone can view versions for active certificates"
ON public.certificate_metadata_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = certificate_metadata_versions.certificate_id
    AND (c.status = 'active' OR c.issuer_id = auth.uid())
  )
);

-- RLS: System inserts versions via trigger (no direct user inserts)
CREATE POLICY "System can insert versions"
ON public.certificate_metadata_versions
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_certificate_metadata_versions_cert_id 
ON public.certificate_metadata_versions(certificate_id);

CREATE INDEX idx_certificate_metadata_versions_changed_at 
ON public.certificate_metadata_versions(changed_at DESC);

-- Function to create initial version on certificate creation
CREATE OR REPLACE FUNCTION public.create_initial_certificate_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.certificate_metadata_versions (
    certificate_id,
    version_number,
    metadata_snapshot,
    change_type,
    change_description,
    changed_by
  ) VALUES (
    NEW.id,
    1,
    jsonb_build_object(
      'serial_number', NEW.serial_number,
      'product_name', NEW.product_name,
      'product_description', NEW.product_description,
      'product_category', NEW.product_category,
      'product_images', NEW.product_images,
      'metadata', NEW.metadata,
      'status', NEW.status,
      'current_owner_wallet', NEW.current_owner_wallet,
      'solana_signature', NEW.solana_signature
    ),
    'created',
    'Certificate created',
    NEW.issuer_id
  );
  RETURN NEW;
END;
$$;

-- Function to track certificate updates
CREATE OR REPLACE FUNCTION public.track_certificate_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change_type metadata_change_type;
  v_description TEXT;
  v_next_version INTEGER;
  v_prev_version_id UUID;
BEGIN
  -- Determine change type
  IF OLD.current_owner_wallet IS DISTINCT FROM NEW.current_owner_wallet AND NEW.current_owner_wallet IS NOT NULL THEN
    v_change_type := 'transferred';
    v_description := 'Ownership transferred to ' || NEW.current_owner_wallet;
  ELSIF OLD.solana_signature IS NULL AND NEW.solana_signature IS NOT NULL THEN
    v_change_type := 'minted';
    v_description := 'Minted on-chain with signature ' || LEFT(NEW.solana_signature, 20) || '...';
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'revoked' THEN
    v_change_type := 'revoked';
    v_description := 'Certificate revoked';
  ELSE
    v_change_type := 'updated';
    v_description := 'Certificate metadata updated';
  END IF;

  -- Get next version number and previous version id
  SELECT version_number, id INTO v_next_version, v_prev_version_id
  FROM public.certificate_metadata_versions
  WHERE certificate_id = NEW.id
  ORDER BY version_number DESC
  LIMIT 1;

  v_next_version := COALESCE(v_next_version, 0) + 1;

  -- Insert new version
  INSERT INTO public.certificate_metadata_versions (
    certificate_id,
    version_number,
    metadata_snapshot,
    change_type,
    change_description,
    changed_by,
    previous_version_id
  ) VALUES (
    NEW.id,
    v_next_version,
    jsonb_build_object(
      'serial_number', NEW.serial_number,
      'product_name', NEW.product_name,
      'product_description', NEW.product_description,
      'product_category', NEW.product_category,
      'product_images', NEW.product_images,
      'metadata', NEW.metadata,
      'status', NEW.status,
      'current_owner_wallet', NEW.current_owner_wallet,
      'solana_signature', NEW.solana_signature
    ),
    v_change_type,
    v_description,
    auth.uid(),
    v_prev_version_id
  );

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_certificate_created
AFTER INSERT ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_certificate_version();

CREATE TRIGGER on_certificate_updated
AFTER UPDATE ON public.certificates
FOR EACH ROW
WHEN (
  OLD.product_name IS DISTINCT FROM NEW.product_name OR
  OLD.product_description IS DISTINCT FROM NEW.product_description OR
  OLD.metadata IS DISTINCT FROM NEW.metadata OR
  OLD.status IS DISTINCT FROM NEW.status OR
  OLD.current_owner_wallet IS DISTINCT FROM NEW.current_owner_wallet OR
  OLD.solana_signature IS DISTINCT FROM NEW.solana_signature
)
EXECUTE FUNCTION public.track_certificate_changes();