-- Create security definer function for storage policies
CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path TO 'public';

-- Drop and recreate storage policies with the function
DROP POLICY IF EXISTS "Owners can upload their content" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view their content" ON storage.objects; 
DROP POLICY IF EXISTS "Owners can upload thumbnails" ON storage.objects;

-- Simple storage policies using the security definer function
CREATE POLICY "Owners can upload their content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'content' 
  AND public.is_owner_or_admin()
);

CREATE POLICY "Owners can view their content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content' 
  AND public.is_owner_or_admin()
);

CREATE POLICY "Owners can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND public.is_owner_or_admin()
);