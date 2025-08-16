-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('owner', 'subscriber', 'admin');

-- Create enum for content types
CREATE TYPE public.content_type AS ENUM ('image', 'video');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'pending');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  role user_role NOT NULL DEFAULT 'subscriber',
  is_password_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create content table for posts
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  content_type content_type NOT NULL,
  duration INTEGER, -- for videos in seconds
  is_preview BOOLEAN DEFAULT FALSE, -- for preview content
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status subscription_status NOT NULL DEFAULT 'pending',
  amount_paid DECIMAL(10,2),
  payment_reference TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, owner_id)
);

-- Create earnings table for owner dashboard
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  percentage_rate DECIMAL(5,2) NOT NULL, -- e.g., 70.00 for 70%
  status TEXT DEFAULT 'pending', -- pending, paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.content_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Create comments table
CREATE TABLE public.content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create share links table for tracking shared access
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  link_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow profile creation on signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content policies
CREATE POLICY "Owner can manage their content" ON public.content
  FOR ALL USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Subscribers can view content" ON public.content
  FOR SELECT USING (
    -- Owner can see all their content
    owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR
    -- Subscribers with active subscription can see content
    (owner_id IN (
      SELECT owner_id FROM public.subscriptions 
      WHERE subscriber_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND status = 'active' 
      AND (expires_at IS NULL OR expires_at > now())
    ))
    OR
    -- Anyone can see preview content
    is_preview = TRUE
  );

-- Subscriptions policies
CREATE POLICY "Users can view their subscriptions" ON public.subscriptions
  FOR SELECT USING (
    subscriber_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR 
    owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (subscriber_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Owner can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Earnings policies
CREATE POLICY "Owner can view their earnings" ON public.earnings
  FOR SELECT USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Likes policies
CREATE POLICY "Users can manage their likes" ON public.content_likes
  FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view all likes" ON public.content_likes
  FOR SELECT USING (TRUE);

-- Comments policies
CREATE POLICY "Users can manage their comments" ON public.content_comments
  FOR ALL USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view comments on accessible content" ON public.content_comments
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM public.content 
      WHERE owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR is_preview = TRUE
      OR owner_id IN (
        SELECT owner_id FROM public.subscriptions 
        WHERE subscriber_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      )
    )
  );

-- Share links policies
CREATE POLICY "Owner can manage share links" ON public.share_links
  FOR ALL USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create storage buckets for content
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('profiles', 'profiles', true),
  ('content', 'content', false),
  ('thumbnails', 'thumbnails', true);

-- Storage policies for profiles bucket
CREATE POLICY "Users can upload their profile pictures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their profile pictures" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for content bucket
CREATE POLICY "Owner can upload content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Subscribers can view content" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'content'
    AND (
      -- Owner can see their own content
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Check if user has active subscription
      EXISTS (
        SELECT 1 FROM public.subscriptions s
        JOIN public.profiles owner ON s.owner_id = owner.id
        JOIN public.profiles subscriber ON s.subscriber_id = subscriber.id
        WHERE owner.user_id::text = (storage.foldername(name))[1]
        AND subscriber.user_id = auth.uid()
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
      )
    )
  );

-- Storage policies for thumbnails bucket  
CREATE POLICY "Owner can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Thumbnails are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    CASE 
      WHEN NEW.email = 'owner@example.com' THEN 'owner'::user_role
      ELSE 'subscriber'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.content_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();