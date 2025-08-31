-- Fix infinite recursion in profiles RLS policies
-- The issue is that some policies are querying the profiles table from within profiles policies

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view subscribed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view shared profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_view_profile(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if it's the user's own profile
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = profile_id AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has active subscription to this profile
  IF EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN profiles p ON p.id = s.subscriber_id
    WHERE s.owner_id = profile_id
      AND p.user_id = auth.uid()
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if profile is shared via active share link
  IF EXISTS (
    SELECT 1 FROM share_links sl
    WHERE sl.owner_id = profile_id
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if current user is admin
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'amosudnl896@gmail.com'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create a single, simple SELECT policy using the security definer function
CREATE POLICY "Users can view allowed profiles" ON public.profiles
  FOR SELECT USING (public.user_can_view_profile(id));