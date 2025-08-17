-- Update the handle_new_user function to assign admin role to specific email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    CASE 
      WHEN NEW.email = 'amosudnl896@gmail.com' THEN 'admin'::user_role
      WHEN NEW.email = 'owner@example.com' THEN 'owner'::user_role
      ELSE 'subscriber'::user_role
    END
  );
  RETURN NEW;
END;
$function$