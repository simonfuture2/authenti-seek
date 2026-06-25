
-- Phase 1: collapse two-role model into a single 'collector' tier.
-- Step 1: extend app_role enum with 'collector'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'collector';
