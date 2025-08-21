-- Drop the overly permissive policy that exposes all profile data publicly
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;

-- Create a more secure policy that only allows viewing profiles in specific legitimate contexts
CREATE POLICY "Users can view profiles through subscriptions" ON public.profiles
FOR SELECT USING (
  -- Users can view profiles of creators they're subscribed to
  id IN (
    SELECT s.owner_id 
    FROM subscriptions s 
    WHERE s.subscriber_id = get_current_user_profile_id() 
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);

CREATE POLICY "Users can view profiles through active share links" ON public.profiles  
FOR SELECT USING (
  -- Users can view profiles when accessing through valid share links
  id IN (
    SELECT sl.owner_id 
    FROM share_links sl 
    WHERE sl.is_active = true 
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
  )
);

-- Add a policy for admins to view all profiles for management purposes
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);