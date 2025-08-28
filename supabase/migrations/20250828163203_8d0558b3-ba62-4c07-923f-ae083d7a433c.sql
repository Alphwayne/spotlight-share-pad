-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles through subscriptions" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles through active share links" ON public.profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'amosudnl896@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create new safe policies using security definer functions
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Users can view profiles through subscriptions"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT s.owner_id
    FROM public.subscriptions s
    WHERE s.subscriber_id = public.get_user_profile_id()
    AND s.status = 'active'::subscription_status
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);

CREATE POLICY "Users can view profiles through active share links"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT sl.owner_id
    FROM public.share_links sl
    WHERE sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
  )
);