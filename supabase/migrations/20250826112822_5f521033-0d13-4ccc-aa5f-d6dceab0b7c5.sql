-- Fix infinite recursion by dropping dependent policies first

-- Drop all policies that depend on the problematic function
DROP POLICY IF EXISTS "Subscribers can view premium content" ON public.content;
DROP POLICY IF EXISTS "Users can view profiles through subscriptions" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();

-- Create a simple function that just returns auth.uid() to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid();
$$;

-- Recreate admin policy without recursion - using direct email check
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

-- Recreate subscription policy with proper joins to avoid recursion
CREATE POLICY "Users can view profiles through subscriptions" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT s.owner_id
    FROM subscriptions s
    WHERE s.subscriber_id IN (
      SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
    )
    AND s.status = 'active'::subscription_status 
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);

-- Recreate content policy using direct profile lookup
CREATE POLICY "Subscribers can view premium content" 
ON public.content 
FOR SELECT 
USING (
  owner_id IN (
    SELECT s.owner_id
    FROM subscriptions s
    WHERE s.subscriber_id IN (
      SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
    )
    AND s.status = 'active'::subscription_status 
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);