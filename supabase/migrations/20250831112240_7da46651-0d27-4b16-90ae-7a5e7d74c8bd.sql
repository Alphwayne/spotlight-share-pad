-- Create subscription_settings table
CREATE TABLE public.subscription_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  amount NUMERIC NOT NULL DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(creator_id)
);

-- Add unique constraint for global settings using partial index
CREATE UNIQUE INDEX subscription_settings_global_unique 
ON public.subscription_settings (is_global) 
WHERE is_global = true;

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update earnings table to modify status column (remove CHECK constraint, will use trigger instead)
ALTER TABLE public.earnings 
DROP CONSTRAINT IF EXISTS earnings_status_check;

ALTER TABLE public.earnings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create validation triggers instead of CHECK constraints for better flexibility
CREATE OR REPLACE FUNCTION public.validate_earnings_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Invalid earnings status. Must be pending or paid.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_withdrawals_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid withdrawals status. Must be pending, approved, or rejected.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
CREATE TRIGGER earnings_status_validation
  BEFORE INSERT OR UPDATE ON public.earnings
  FOR EACH ROW EXECUTE FUNCTION public.validate_earnings_status();

CREATE TRIGGER withdrawals_status_validation
  BEFORE INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawals_status();

-- Create triggers for updated_at timestamp
CREATE TRIGGER subscription_settings_updated_at
  BEFORE UPDATE ON public.subscription_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_settings
CREATE POLICY "Users can view their own subscription settings"
ON public.subscription_settings
FOR SELECT
USING (creator_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
) OR is_global = true);

CREATE POLICY "Users can create their own subscription settings"
ON public.subscription_settings
FOR INSERT
WITH CHECK (creator_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own subscription settings"
ON public.subscription_settings
FOR UPDATE
USING (creator_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all subscription settings"
ON public.subscription_settings
FOR ALL
USING (public.is_admin());

-- RLS Policies for withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawals
FOR SELECT
USING (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create their own withdrawal requests"
ON public.withdrawals
FOR INSERT
WITH CHECK (owner_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all withdrawals"
ON public.withdrawals
FOR ALL
USING (public.is_admin());

-- Update existing admin_delete_user function with better error handling
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Delete user profile and related data (CASCADE will handle dependencies)
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'User deleted successfully');
END;
$$;

-- Insert default global subscription setting if not exists
INSERT INTO public.subscription_settings (is_global, amount, creator_id) 
SELECT true, 10000, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_settings WHERE is_global = true
);