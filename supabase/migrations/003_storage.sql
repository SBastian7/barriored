-- Create business-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('business-images', 'business-images', true);

-- Anyone can view images (public bucket)
CREATE POLICY "business_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-images');

-- Authenticated users can upload
CREATE POLICY "business_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-images' AND auth.role() = 'authenticated');

-- Users can update/delete their own uploads
CREATE POLICY "business_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'business-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "business_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-images' AND auth.uid()::text = (storage.foldername(name))[1]);
