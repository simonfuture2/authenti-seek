-- Create credit packages enum
CREATE TYPE public.credit_package AS ENUM ('starter', 'pro', 'enterprise');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('stripe', 'sol');

-- Create transaction type enum for credit movements
CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'certificate_creation', 'verification', 'refund', 'bonus');

-- User credits table - tracks current balance
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Credit transactions table - audit log of all credit movements
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type credit_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  payment_method payment_method,
  stripe_payment_id TEXT,
  solana_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Credit packages pricing table
CREATE TABLE public.credit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  package_type credit_package NOT NULL UNIQUE,
  credits INTEGER NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  price_sol NUMERIC(10,6),
  description TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- User credits policies
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user credits"
ON public.user_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update user credits"
ON public.user_credits FOR UPDATE
USING (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Credit packages - public read
CREATE POLICY "Anyone can view active packages"
ON public.credit_packages FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credit packages
INSERT INTO public.credit_packages (name, package_type, credits, price_usd, price_sol, description, is_popular)
VALUES
  ('Starter', 'starter', 10, 9.99, 0.05, 'Perfect for trying out AuthentiSeal', false),
  ('Pro', 'pro', 50, 39.99, 0.20, 'Best value for regular users', true),
  ('Enterprise', 'enterprise', 200, 129.99, 0.65, 'For high-volume issuers and verifiers', false);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the welcome bonus
  INSERT INTO public.credit_transactions (user_id, transaction_type, amount, balance_after, description)
  VALUES (NEW.id, 'bonus', 3, 3, 'Welcome bonus credits');
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create credits for new users
CREATE TRIGGER on_auth_user_created_credits
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_credits();

-- Function to deduct credits (used by edge functions)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type credit_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User credits not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, v_current_balance, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;
  
  v_new_balance := v_current_balance - p_amount;
  
  -- Update balance
  UPDATE public.user_credits
  SET balance = v_new_balance,
      lifetime_used = lifetime_used + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    p_user_id, p_transaction_type, -p_amount, v_new_balance, p_description, p_reference_id
  );
  
  RETURN QUERY SELECT true, v_new_balance, 'Credits deducted successfully'::TEXT;
END;
$$;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_payment_method payment_method,
  p_payment_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    -- Initialize if not exists
    INSERT INTO public.user_credits (user_id, balance, lifetime_purchased)
    VALUES (p_user_id, p_amount, p_amount);
    v_new_balance := p_amount;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    
    UPDATE public.user_credits
    SET balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (
    user_id, transaction_type, amount, balance_after, description, payment_method,
    stripe_payment_id, solana_signature
  ) VALUES (
    p_user_id, 'purchase', p_amount, v_new_balance, p_description, p_payment_method,
    CASE WHEN p_payment_method = 'stripe' THEN p_payment_id ELSE NULL END,
    CASE WHEN p_payment_method = 'sol' THEN p_payment_id ELSE NULL END
  );
  
  RETURN QUERY SELECT true, v_new_balance, 'Credits added successfully'::TEXT;
END;
$$;