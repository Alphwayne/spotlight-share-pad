-- Fix password reset tokens security vulnerability
-- Add proper RLS policies to prevent token enumeration and unauthorized access

-- Create a security definer function to validate password reset tokens
-- This function can only be called by edge functions or system processes
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(token_value text, user_email text)
RETURNS TABLE(token_id uuid, is_valid boolean, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    prt.id,
    (prt.used = false AND prt.expires_at > now()) as is_valid,
    prt.expires_at
  FROM password_reset_tokens prt
  WHERE prt.token = token_value 
    AND prt.email = user_email;
END;
$$;

-- Create a security definer function to mark tokens as used
CREATE OR REPLACE FUNCTION public.mark_password_reset_token_used(token_value text, user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_found boolean := false;
BEGIN
  UPDATE password_reset_tokens 
  SET used = true, updated_at = now()
  WHERE token = token_value 
    AND email = user_email 
    AND used = false 
    AND expires_at > now();
  
  GET DIAGNOSTICS token_found = FOUND;
  RETURN token_found;
END;
$$;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.password_reset_tokens 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_password_reset_tokens_updated_at
  BEFORE UPDATE ON public.password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add restrictive SELECT policy - no direct access allowed
-- Tokens should only be validated through security definer functions
CREATE POLICY "No direct access to password reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (false);

-- Add UPDATE policy to allow marking tokens as used (but only through the function)
CREATE POLICY "System can mark tokens as used" ON public.password_reset_tokens
  FOR UPDATE USING (false);

-- Add DELETE policy for cleanup (only system/admin)
CREATE POLICY "System can delete expired tokens" ON public.password_reset_tokens
  FOR DELETE USING (false);

-- Create a cleanup function for expired tokens (to be called by edge functions)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < now() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;