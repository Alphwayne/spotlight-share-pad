-- Fix security warnings by setting search_path for validation functions
CREATE OR REPLACE FUNCTION public.validate_earnings_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Invalid earnings status. Must be pending or paid.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_withdrawals_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid withdrawals status. Must be pending, approved, or rejected.';
  END IF;
  RETURN NEW;
END;
$$;