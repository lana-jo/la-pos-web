-- Fix RLS policies for categories table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "categories:admin_all"    ON public.categories;
DROP POLICY IF EXISTS "categories:auth_select"  ON public.categories;
DROP POLICY IF EXISTS "categories:anon_select"  ON public.categories;

-- Create improved policies
CREATE POLICY "categories:admin_full"
  ON public.categories FOR ALL TO authenticated
  USING (public.fn_is_admin()) 
  WITH CHECK (public.fn_is_admin());

CREATE POLICY "categories:cashier_select"
  ON public.categories FOR SELECT TO authenticated
  USING (public.fn_is_cashier_or_admin() AND is_active = true);

CREATE POLICY "categories:customer_select"
  ON public.categories FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "categories:anon_select"
  ON public.categories FOR SELECT TO anon
  USING (is_active = true);

-- Enable RLS on categories table (in case it's disabled)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
