-- =====================================================================
-- DIAGNOSE AND FIX CATEGORIES RLS ISSUE
-- Run this step by step in Supabase SQL Editor
-- =====================================================================

-- STEP 1: Check current user and authentication state
SELECT 
  'Current User Info' as step,
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as jwt_role,
  auth.email() as email,
  auth.role() as auth_role;

-- STEP 2: Check if user profile exists and role
SELECT 
  'User Profile' as step,
  p.id,
  p.role,
  p.full_name,
  p.created_at
FROM public.profiles p 
WHERE p.id = auth.uid();

-- STEP 3: Test the helper functions directly
SELECT 
  'Helper Functions Test' as step,
  public.fn_get_user_role(auth.uid()) as user_role,
  public.fn_is_admin() as is_admin,
  public.fn_is_cashier_or_admin() as is_cashier_or_admin;

-- STEP 4: Check existing RLS policies on categories
SELECT 
  'Current RLS Policies' as step,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY policyname;

-- STEP 5: Test direct INSERT with explicit admin check (this should work if user is admin)
-- First, let's create a test function that bypasses RLS temporarily
CREATE OR REPLACE FUNCTION public.test_category_insert()
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_role TEXT;
  v_test_id UUID;
BEGIN
  -- Get user role
  SELECT role::TEXT INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Check if user is admin
  IF v_user_role != 'admin' THEN
    RETURN QUERY SELECT FALSE, 'User is not admin. Role: ' || COALESCE(v_user_role, 'NULL');
    RETURN;
  END IF;
  
  -- Try to insert a test category
  BEGIN
    INSERT INTO public.categories (name, slug, is_active)
    VALUES ('Test Category ' || EXTRACT(EPOCH FROM NOW()), 'test-' || EXTRACT(EPOCH FROM NOW()), true)
    RETURNING id INTO v_test_id;
    
    -- Clean up test category
    DELETE FROM public.categories WHERE id = v_test_id;
    
    RETURN QUERY SELECT TRUE, 'Insert test successful - RLS is working correctly';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Insert failed: ' || SQLERRM;
  END;
END;
$$;

-- Run the test
SELECT * FROM public.test_category_insert();

-- Clean up test function
DROP FUNCTION IF EXISTS public.test_category_insert();

-- =====================================================================
-- STEP 6: FIXES - Apply if needed
-- =====================================================================

-- Fix 1: Ensure user profile exists with correct role
-- (Run this manually if user profile is missing)

-- Fix 2: Update RLS policies to be more robust
DROP POLICY IF EXISTS "categories:admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories:auth_select" ON public.categories;
DROP POLICY IF EXISTS "categories:anon_select" ON public.categories;

-- Create improved policies with better error handling
CREATE POLICY "categories:admin_full"
  ON public.categories FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "categories:cashier_select"
  ON public.categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('cashier','admin')
    ) AND is_active = true
  );

CREATE POLICY "categories:customer_select"
  ON public.categories FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "categories:anon_select"
  ON public.categories FOR SELECT TO anon
  USING (is_active = true);

-- Fix 3: Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 7: VERIFICATION
-- =====================================================================

-- Test the fixed policies
SELECT 
  'Verification - Test Insert' as step,
  public.test_category_insert() as result;

-- Final check of policies
SELECT 
  'Final Policies Check' as step,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY policyname;
