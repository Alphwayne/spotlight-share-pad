-- Add admin function to create users with roles
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_role user_role DEFAULT 'subscriber'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role user_role;
  new_user_id uuid;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  -- This would need to be implemented via admin API calls from the frontend
  -- Database functions cannot create auth users directly
  RETURN json_build_object('message', 'User creation must be handled via admin API');
END;
$$;