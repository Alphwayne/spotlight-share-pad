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
  affected_rows integer;
BEGIN
  UPDATE password_reset_tokens 
  SET used = true
  WHERE token = token_value 
    AND email = user_email 
    AND used = false 
    AND expires_at > now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;

-- Add restrictive SELECT policy - no direct access allowed
-- Tokens should only be validated through security definer functions
CREATE POLICY "No direct access to password reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (false);

-- Add UPDATE policy to prevent direct updates
CREATE POLICY "No direct token updates" ON public.password_reset_tokens
  FOR UPDATE USING (false);

-- Add DELETE policy for cleanup (only via functions)
CREATE POLICY "No direct token deletion" ON public.password_reset_tokens
  FOR DELETE USING (false);

-- Create a cleanup function for expired tokens
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