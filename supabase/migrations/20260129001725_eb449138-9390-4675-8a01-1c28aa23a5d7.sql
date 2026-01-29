-- Create storage bucket for certificate images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificate-images', 'certificate-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to certificate images
CREATE POLICY "Public can view certificate images"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificate-images');

-- Allow authenticated users to upload certificate images
CREATE POLICY "Authenticated users can upload certificate images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificate-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own certificate images
CREATE POLICY "Users can update their own certificate images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'certificate-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own certificate images
CREATE POLICY "Users can delete their own certificate images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificate-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);