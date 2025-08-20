-- Fix RLS policies for content uploads and improve share link access

-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Owner can manage their content" ON public.content;
DROP POLICY IF EXISTS "Subscribers can view content" ON public.content;

-- Create better RLS policies for content
CREATE POLICY "Owners can manage their content" ON public.content
FOR ALL 
USING (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Allow anyone to view preview content (no auth required)
CREATE POLICY "Anyone can view preview content" ON public.content
FOR SELECT 
USING (is_preview = true);

-- Allow subscribers to view premium content from creators they're subscribed to
CREATE POLICY "Subscribers can view premium content" ON public.content
FOR SELECT 
USING (
  owner_id IN (
    SELECT s.owner_id 
    FROM public.subscriptions s
    JOIN public.profiles p ON p.id = s.subscriber_id
    WHERE p.user_id = auth.uid() 
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);

-- Allow public access to share_links for preview functionality
DROP POLICY IF EXISTS "Owner can manage share links" ON public.share_links;

CREATE POLICY "Owners can manage their share links" ON public.share_links
FOR ALL 
USING (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Allow anyone to read active share links for preview functionality
CREATE POLICY "Anyone can view active share links" ON public.share_links
FOR SELECT 
USING (is_active = true);

-- Allow public read access to profiles for preview pages
CREATE POLICY "Anyone can view public profile info" ON public.profiles
FOR SELECT 
USING (true);