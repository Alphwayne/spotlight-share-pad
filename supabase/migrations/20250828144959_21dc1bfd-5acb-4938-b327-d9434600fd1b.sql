-- Fix storage bucket to be public so content can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE name = 'content';