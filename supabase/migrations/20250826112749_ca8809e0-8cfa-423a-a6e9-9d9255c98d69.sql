-- Fix infinite recursion in profiles table RLS policies

-- First, drop the problematic function that causes recursion
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();

-- Create a safe function that doesn't cause recursion by using auth.uid() directly
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid();
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles through subscriptions" ON public.profiles;

-- Recreate the admin policy without recursion
CREATE POLICY "Admins view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'amosudnl896@gmail.com'
  )
);

-- Recreate the subscription policy using direct auth.uid() check
CREATE POLICY "Users can view profiles through subscriptions" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT s.owner_id
    FROM subscriptions s
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE s.subscriber_id = p.id 
    AND s.status = 'active'::subscription_status 
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);