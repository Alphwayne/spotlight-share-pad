-- Create security definer function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing content policies
DROP POLICY IF EXISTS "Owners can manage their content" ON public.content;
DROP POLICY IF EXISTS "Subscribers can view premium content" ON public.content;

-- Create new content policies using the security definer function
CREATE POLICY "Owners can manage their content" ON public.content
FOR ALL USING (owner_id = public.get_current_user_profile_id())
WITH CHECK (owner_id = public.get_current_user_profile_id());

CREATE POLICY "Subscribers can view premium content" ON public.content
FOR SELECT USING (
  owner_id IN (
    SELECT s.owner_id 
    FROM subscriptions s 
    WHERE s.subscriber_id = public.get_current_user_profile_id()
    AND s.status = 'active'::subscription_status 
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);