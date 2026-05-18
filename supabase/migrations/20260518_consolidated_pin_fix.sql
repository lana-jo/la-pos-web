-- Consolidated migration for PIN verification and pgcrypto
-- Filename: supabase/migrations/20260518_consolidated_pin_fix.sql

-- 1. Enable pgcrypto (required for crypt function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Drop all conflicting/old versions of the verification function
DROP FUNCTION IF EXISTS public.fn_verify_pin(TEXT);
DROP FUNCTION IF EXISTS public.fn_verify_pin(UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_verify_pin(TEXT, UUID);

-- 3. Create the robust verification function
-- This handles both single-parameter (pinhash) and dual-parameter calls.
-- It explicitly uses 'pin_hash' column to avoid "hashed_pin does not exist" errors.
CREATE OR REPLACE FUNCTION public.fn_verify_pin(
    pinhash TEXT, 
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE 
    v_hash TEXT;
    v_is_active BOOLEAN;
BEGIN
    -- Guard: if no user_id is provided or resolved
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Fetch the hash and active status from public.profiles
    SELECT pin_hash, is_active INTO v_hash, v_is_active
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Verification fails if:
    -- 1. No user found
    -- 2. User is not active
    -- 3. No PIN hash is set
    IF v_hash IS NULL OR v_hash = '' OR v_is_active = false THEN 
        RETURN false; 
    END IF;
    
    -- Verify using crypt() from pgcrypto
    RETURN v_hash = crypt(pinhash, v_hash);

EXCEPTION WHEN OTHERS THEN
    -- Return false on any execution error
    RETURN false;
END;
$$;

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION public.fn_verify_pin(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_pin(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_verify_pin(TEXT, UUID) TO anon;
