
-- Remove the permissive INSERT policy on credit_transactions
-- Service-role (used by edge functions) bypasses RLS, so no replacement policy is needed
DROP POLICY IF EXISTS "System can insert transactions" ON public.credit_transactions;

-- Also harden user_credits: remove client-side INSERT and UPDATE policies
-- These should only be modified by the add_credits/deduct_credits DB functions (which run as SECURITY DEFINER)
DROP POLICY IF EXISTS "System can insert user credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can update user credits" ON public.user_credits;
