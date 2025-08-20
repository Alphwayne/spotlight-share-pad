-- Remove the SELECT policy that allows users to view their password reset tokens
-- This is a security vulnerability as tokens should never be exposed to clients
-- Token validation should only happen server-side

DROP POLICY IF EXISTS "Users can view their own reset tokens" ON password_reset_tokens;

-- The INSERT policy for "Anyone can request password reset" remains intact
-- as it's needed for the password reset request functionality