-- Create storage policies for content uploads
-- First, create policies for the content bucket (private)
CREATE POLICY "Owners can upload their content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can view their content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('owner', 'admin')
  )
);

-- Create policies for the thumbnails bucket (public)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Owners can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('owner', 'admin')
  )
);