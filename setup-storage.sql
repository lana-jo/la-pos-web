-- =====================================================
-- STORAGE BUCKET AND RLS POLICIES FOR PRODUCT IMAGES
-- Run this manually in Supabase Dashboard > SQL Editor
-- =====================================================

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to bypass RLS for admin operations
DROP POLICY IF EXISTS "Product Images: Service role full access" ON storage.objects;
CREATE POLICY "Product Images: Service role full access"
  ON storage.objects
  FOR ALL
  USING (
    -- Service role can bypass all restrictions
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Policy: Allow admins to manage images
DROP POLICY IF EXISTS "Product Images: Admin full access" ON storage.objects;
CREATE POLICY "Product Images: Admin full access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: Allow authenticated users to upload images (for server actions)
DROP POLICY IF EXISTS "Product Images: Authenticated upload" ON storage.objects;
CREATE POLICY "Product Images: Authenticated upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() != 'anon'
  );

-- Policy: Allow public read access to images
DROP POLICY IF EXISTS "Product Images: Public read access" ON storage.objects;
CREATE POLICY "Product Images: Public read access"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'product-images'
  );

-- Policy: Allow users to delete images
DROP POLICY IF EXISTS "Product Images: Users delete" ON storage.objects;
CREATE POLICY "Product Images: Users delete"
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'cashier')
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- Verify bucket creation
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
