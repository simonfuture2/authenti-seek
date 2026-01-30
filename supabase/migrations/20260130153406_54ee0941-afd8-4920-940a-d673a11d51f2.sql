-- Create blockchain audit logs table for tracking all chain-related operations
CREATE TABLE public.blockchain_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL,
  certificate_id UUID REFERENCES public.certificates(id),
  wallet_address TEXT,
  solana_signature TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  request_metadata JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_blockchain_audit_user ON public.blockchain_audit_logs(user_id);
CREATE INDEX idx_blockchain_audit_certificate ON public.blockchain_audit_logs(certificate_id);
CREATE INDEX idx_blockchain_audit_operation ON public.blockchain_audit_logs(operation_type);
CREATE INDEX idx_blockchain_audit_created ON public.blockchain_audit_logs(created_at DESC);
CREATE INDEX idx_blockchain_audit_wallet ON public.blockchain_audit_logs(wallet_address);

-- Enable RLS
ALTER TABLE public.blockchain_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own audit logs
CREATE POLICY "Users can insert audit logs"
ON public.blockchain_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.blockchain_audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Issuers can view logs for their certificates
CREATE POLICY "Issuers can view certificate audit logs"
ON public.blockchain_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = blockchain_audit_logs.certificate_id
    AND c.issuer_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.blockchain_audit_logs IS 'Audit trail for all blockchain-related operations including minting, verification, and transfers';