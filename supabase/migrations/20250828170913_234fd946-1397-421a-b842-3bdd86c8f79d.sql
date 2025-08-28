-- Re-enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles through subscriptions" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles through active share links" ON public.profiles;

-- Create simple, working policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow viewing profiles through subscriptions (fixed policy)
CREATE POLICY "Users can view subscribed profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT s.owner_id
      FROM subscriptions s
      JOIN profiles p ON p.id = s.subscriber_id
      WHERE p.user_id = auth.uid()
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );

-- Allow viewing profiles through active share links
CREATE POLICY "Public can view shared profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT sl.owner_id
      FROM share_links sl
      WHERE sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );

-- Admin policy using security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_admin());