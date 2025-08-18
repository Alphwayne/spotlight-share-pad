-- Fix search path security warnings by setting search_path for admin functions
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search path security warnings by setting search_path for admin functions
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_role user_role)
RETURNS json
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
  
  -- Update user role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'User role updated successfully');
END;
$$;

-- Fix search path security warnings by setting search_path for admin functions
CREATE OR REPLACE FUNCTION public.admin_promote_to_owner(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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