-- Debug RLS for categories table
-- Run this in Supabase SQL Editor to test permissions

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerlspolicy
FROM pg_tables 
WHERE tablename = 'categories';

-- 2. Check current user and their role
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as jwt_role,
  auth.email() as email;

-- 3. Test the admin function
SELECT public.fn_is_admin() as is_admin;

-- 4. Test getting user role directly
SELECT public.fn_get_user_role(auth.uid()) as user_role;

-- 5. Check user profile
SELECT * FROM public.profiles WHERE id = auth.uid();

-- 6. Test insert with explicit error handling
BEGIN;
-- This should fail if RLS is blocking
INSERT INTO public.categories (name, slug, is_active) 
VALUES ('Test Category', 'test-category', true);
ROLLBACK;

-- 7. Check all RLS policies on categories
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'categories';
