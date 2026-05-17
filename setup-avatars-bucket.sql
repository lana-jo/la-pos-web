-- =====================================================
-- STORAGE BUCKET AND RLS POLICIES FOR AVATARS (FIXED)
-- =====================================================

-- 1. Buat bucket 'avatars' (Jika belum ada)
-- Gunakan ON CONFLICT untuk menghindari error jika bucket sudah ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Kebijakan Akses (Policies)
-- Catatan: RLS pada storage.objects biasanya sudah aktif secara default di Supabase.
-- Kita langsung buat kebijakan aksesnya.

-- Policy: Akses penuh untuk Service Role (Penting untuk API server-side)
DROP POLICY IF EXISTS "Avatars: Service role full access" ON storage.objects;
CREATE POLICY "Avatars: Service role full access"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: User bisa mengelola avatar mereka sendiri (dalam folder dengan ID user)
DROP POLICY IF EXISTS "Avatars: User full access own folder" ON storage.objects;
CREATE POLICY "Avatars: User full access own folder"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Publik bisa melihat avatar (karena bucket diatur public=true)
DROP POLICY IF EXISTS "Avatars: Public read access" ON storage.objects;
CREATE POLICY "Avatars: Public read access"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');
