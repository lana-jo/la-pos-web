-- Migration: Implementation of Ultimate Expiration & Batch Management System
-- Phase 1: Schema changes for FEFO-driven tracking

-- 1. Create status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status') THEN
        CREATE TYPE public.batch_status AS ENUM ('active', 'near_expiry', 'expired', 'disposed');
    END IF;
END$$;

-- 2. Create product_batches table
CREATE TABLE IF NOT EXISTS public.product_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_variant_id uuid,
  batch_code text,
  initial_qty integer NOT NULL DEFAULT 0,
  current_qty integer NOT NULL DEFAULT 0,
  expired_at date NOT NULL,
  status public.batch_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_batches_pkey PRIMARY KEY (id),
  CONSTRAINT product_batches_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_batches_variant_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);

-- 3. Add denormalized column to product_variants for fast lookup
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS next_expired_date date;

-- 4. Link inventory_movements to batches for audit traceability
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.product_batches(id);

-- 5. Link stock_movements (secondary table) to batches as well
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.product_batches(id);

-- 6. Trigger function to update product_variants.next_expired_date automatically
CREATE OR REPLACE FUNCTION public.fn_sync_variant_expiry()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.product_variants
    SET next_expired_date = (
        SELECT MIN(expired_at)
        FROM public.product_batches
        WHERE product_variant_id = COALESCE(NEW.product_variant_id, OLD.product_variant_id)
          AND current_qty > 0
          AND status IN ('active', 'near_expiry')
    )
    WHERE id = COALESCE(NEW.product_variant_id, OLD.product_variant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Apply trigger to product_batches
DROP TRIGGER IF EXISTS trg_sync_expiry ON public.product_batches;
CREATE TRIGGER trg_sync_expiry
AFTER INSERT OR UPDATE OR DELETE ON public.product_batches
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_variant_expiry();

-- 8. Add comments for clarity
COMMENT ON TABLE public.product_batches IS 'Stores granular stock lots with specific expiration dates for FEFO logic.';
COMMENT ON COLUMN public.product_variants.next_expired_date IS 'Denormalized field for the earliest expiring batch for performance.';
