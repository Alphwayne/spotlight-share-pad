-- Drop the incorrect storage policies
DROP POLICY IF EXISTS "Owners can upload their content" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view their content" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload thumbnails" ON storage.objects;

-- Create correct storage policies using profile ID folder structure
CREATE POLICY "Owners can upload their content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'content' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can view their content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);