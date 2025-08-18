-- Clean up test users from auth.users and related data
DELETE FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'aliujames11@gmail.com',
    'amosudnl@icloud.com', 
    'amosudnl896@gmail.com'
  )
);

-- Delete from auth.users (this will cascade to related tables)
DELETE FROM auth.users WHERE email IN (
  'aliujames11@gmail.com',
  'amosudnl@icloud.com',
  'amosudnl896@gmail.com'
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on password reset tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert password reset requests
CREATE POLICY "Anyone can request password reset" ON public.password_reset_tokens
FOR INSERT WITH CHECK (true);

-- Allow users to view their own reset tokens
CREATE POLICY "Users can view their reset tokens" ON public.password_reset_tokens
FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add admin management capabilities
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role;
  result json;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Delete user profile first
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'User deleted successfully');
END;
$$;

-- Function for admin to update user roles
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Update user role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'User role updated successfully');
END;
$$;

-- Function for admin to promote email to owner
CREATE OR REPLACE FUNCTION public.admin_promote_to_owner(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role;
  target_user_id uuid;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Find user by email
  SELECT user_id INTO target_user_id 
  FROM public.profiles 
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not found with that email');
  END IF;
  
  -- Update user role to owner
  UPDATE public.profiles 
  SET role = 'owner', updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'User promoted to owner successfully');
END;
$$;