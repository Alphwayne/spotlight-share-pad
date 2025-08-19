-- Fix RLS policies for content_likes to prevent tracking
DROP POLICY IF EXISTS "Users can view all likes" ON public.content_likes;

CREATE POLICY "Users can view likes on accessible content" 
ON public.content_likes 
FOR SELECT 
USING (
  content_id IN (
    SELECT content.id 
    FROM content 
    WHERE (
      content.owner_id IN (
        SELECT profiles.id 
        FROM profiles 
        WHERE profiles.user_id = auth.uid()
      ) 
      OR content.is_preview = true 
      OR content.owner_id IN (
        SELECT subscriptions.owner_id 
        FROM subscriptions 
        WHERE subscriptions.subscriber_id IN (
          SELECT profiles.id 
          FROM profiles 
          WHERE profiles.user_id = auth.uid()
        ) 
        AND subscriptions.status = 'active'::subscription_status 
        AND (subscriptions.expires_at IS NULL OR subscriptions.expires_at > now())
      )
    )
  )
);

-- Fix password reset tokens policy to prevent email harvesting
DROP POLICY IF EXISTS "Users can view their reset tokens" ON public.password_reset_tokens;

CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (
  email = (
    SELECT auth.users.email::text 
    FROM auth.users 
    WHERE auth.users.id = auth.uid()
  )
);