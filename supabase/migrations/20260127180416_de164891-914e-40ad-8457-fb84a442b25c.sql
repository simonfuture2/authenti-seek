-- Create enum for user roles (mutually exclusive)
CREATE TYPE public.app_role AS ENUM ('issuer', 'verifier');

-- Create enum for certificate status
CREATE TYPE public.certificate_status AS ENUM ('active', 'transferred', 'revoked');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- User roles table (enforces single role per user)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  company_name TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Certificates table (main COA records)
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_owner_wallet TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_category TEXT,
  product_images TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  solana_signature TEXT,
  solana_account TEXT,
  qr_code_data TEXT,
  status certificate_status NOT NULL DEFAULT 'active',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Certificate transfers (ownership history)
CREATE TABLE public.certificate_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE NOT NULL,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  solana_signature TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Verification logs (for analytics and history)
CREATE TABLE public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE NOT NULL,
  verifier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_method TEXT DEFAULT 'qr_scan',
  location_data JSONB
);

-- Fake reports
CREATE TABLE public.fake_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  serial_number TEXT,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status report_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fake_reports ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their role during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for certificates
CREATE POLICY "Anyone can view active certificates"
  ON public.certificates FOR SELECT
  USING (status = 'active' OR issuer_id = auth.uid());

CREATE POLICY "Issuers can create certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'issuer') AND issuer_id = auth.uid());

CREATE POLICY "Issuers can update their own certificates"
  ON public.certificates FOR UPDATE
  USING (public.has_role(auth.uid(), 'issuer') AND issuer_id = auth.uid());

-- RLS Policies for certificate_transfers
CREATE POLICY "Anyone can view transfers"
  ON public.certificate_transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Issuers can create transfers for their certificates"
  ON public.certificate_transfers FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'issuer') AND
    EXISTS (
      SELECT 1 FROM public.certificates 
      WHERE id = certificate_id AND issuer_id = auth.uid()
    )
  );

-- RLS Policies for verification_logs
CREATE POLICY "Verifiers and certificate owners can view logs"
  ON public.verification_logs FOR SELECT
  TO authenticated
  USING (
    verifier_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.certificates 
      WHERE id = certificate_id AND issuer_id = auth.uid()
    )
  );

CREATE POLICY "Verifiers can create verification logs"
  ON public.verification_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'verifier') AND verifier_id = auth.uid());

-- RLS Policies for fake_reports
CREATE POLICY "Verifiers can view their own reports"
  ON public.fake_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Verifiers can create reports"
  ON public.fake_reports FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'verifier') AND reporter_id = auth.uid());

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fake_reports_updated_at
  BEFORE UPDATE ON public.fake_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_certificates_issuer ON public.certificates(issuer_id);
CREATE INDEX idx_certificates_serial ON public.certificates(serial_number);
CREATE INDEX idx_certificates_status ON public.certificates(status);
CREATE INDEX idx_transfers_certificate ON public.certificate_transfers(certificate_id);
CREATE INDEX idx_verification_certificate ON public.verification_logs(certificate_id);
CREATE INDEX idx_fake_reports_certificate ON public.fake_reports(certificate_id);