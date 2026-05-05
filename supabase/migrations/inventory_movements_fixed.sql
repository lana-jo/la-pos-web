-- =====================================================================
-- INVENTORY MOVEMENTS ENHANCEMENT MIGRATION (FIXED VERSION)
-- Version: 1.1.Final
-- Purpose: Add enhanced inventory tracking with cost tracking, row locking, and better validation
-- Fixes: 
--   - Removed duplicate enum definitions (already exist in kelontong_pos_complete.sql)
--   - Fixed stock column reference for product_variants
--   - Renamed function with fn_ prefix for consistency
-- =====================================================================

-- 1. MODIFIKASI TABEL MASTER PRODUK & VARIAN
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cached_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Inisialisasi cached_stock dari kolom stock yang sudah ada
UPDATE public.products 
SET cached_stock = COALESCE(stock, 0) 
WHERE cached_stock = 0 AND stock IS NOT NULL;

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS cached_stock INTEGER DEFAULT 0;

-- FIXED: product_variants doesn't have stock column, initialize from products stock
UPDATE public.product_variants pv
SET cached_stock = COALESCE(p.stock, 0) 
FROM public.products p
WHERE pv.product_id = p.id AND pv.cached_stock = 0;

-- 2. MODIFIKASI TABEL LEGACY (stock_movements)
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_type reference_type;

UPDATE public.stock_movements 
SET reference_type = CASE 
    WHEN reference_type::text = 'transaction' THEN 'transaction'::reference_type
    WHEN reference_type::text = 'purchase_order' THEN 'purchase_order'::reference_type
    WHEN reference_type::text = 'refund' THEN 'refund'::reference_type
    ELSE 'manual'::reference_type
END
WHERE reference_type IS NOT NULL;

-- 3. PEMBUATAN TABEL BUKU BESAR (inventory_movements)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    
    movement_type public.movement_type NOT NULL,
    reference_type public.reference_type,
    reference_id UUID,
    
    qty_change INTEGER NOT NULL, 
    qty_before INTEGER NOT NULL DEFAULT 0, 
    qty_after INTEGER NOT NULL DEFAULT 0,  
    
    unit_cost NUMERIC(12, 2) DEFAULT 0, 
    notes TEXT,
    
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FUNGSI DATABASE (Kalkulasi Atomik & Anti-Race Condition)
CREATE OR REPLACE FUNCTION public.fn_process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
    is_tracking BOOLEAN;
BEGIN
    -- Cek apakah produk melacak stok
    SELECT track_stock INTO is_tracking FROM public.products WHERE id = NEW.product_id;
    
    -- Jika tidak melacak stok (jasa/digital), log dicatat tapi abaikan hitungan
    IF NOT is_tracking THEN
        NEW.qty_before := 0;
        NEW.qty_after := 0;
        RETURN NEW;
    END IF;

    -- Row Locking
    IF NEW.product_variant_id IS NOT NULL THEN
        SELECT cached_stock INTO current_stock 
        FROM public.product_variants 
        WHERE id = NEW.product_variant_id 
        FOR UPDATE;
    ELSE
        SELECT cached_stock INTO current_stock 
        FROM public.products 
        WHERE id = NEW.product_id 
        FOR UPDATE;
    END IF;

    current_stock := COALESCE(current_stock, 0);

    -- Kalkulasi
    NEW.qty_before := current_stock;
    NEW.qty_after := current_stock + NEW.qty_change;

    -- Validasi Overselling
    IF NEW.qty_after < 0 AND NEW.movement_type IN ('sale', 'return_out', 'damage') THEN 
        RAISE EXCEPTION 'Insufficient stock. Transaction aborted.';
    END IF;

    -- Update Master Tabel
    IF NEW.product_variant_id IS NOT NULL THEN
        UPDATE public.product_variants 
        SET cached_stock = NEW.qty_after 
        WHERE id = NEW.product_variant_id;
    ELSE
        UPDATE public.products 
        SET cached_stock = NEW.qty_after 
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. PEMASANGAN TRIGGER
DROP TRIGGER IF EXISTS trigger_process_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trigger_process_inventory_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.fn_process_inventory_movement();

-- 6. PEMBUATAN INDEX UNTUK PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON public.inventory_movements(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_reference ON public.inventory_movements(reference_type, reference_id);

-- 7. SECURITY POLICIES (RLS)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access inventory" ON public.inventory_movements;
CREATE POLICY "Admin full access inventory" 
ON public.inventory_movements
FOR ALL TO authenticated
USING ( (auth.jwt() ->> 'role')::text = 'admin' );

DROP POLICY IF EXISTS "Cashiers can insert movements" ON public.inventory_movements;
CREATE POLICY "Cashiers can insert movements" 
ON public.inventory_movements
FOR INSERT TO authenticated
WITH CHECK (
  movement_type IN ('sale', 'return_in', 'void') 
  AND created_by = auth.uid() 
);

DROP POLICY IF EXISTS "Cashiers can read movements" ON public.inventory_movements;
CREATE POLICY "Cashiers can read movements" 
ON public.inventory_movements
FOR SELECT TO authenticated
USING ( true );

DROP POLICY IF EXISTS "Service role full access inventory" ON public.inventory_movements;
CREATE POLICY "Service role full access inventory" 
ON public.inventory_movements
FOR ALL TO service_role
USING ( true ) WITH CHECK ( true );

-- 8. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.inventory_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inventory_movements TO service_role;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
