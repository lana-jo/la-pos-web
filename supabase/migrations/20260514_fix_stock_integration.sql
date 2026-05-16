-- =====================================================================
-- FIX: TOTAL STOCK INTEGRATION (LEDGER-BASED)
-- Tanggal: 14 Mei 2026
-- Deskripsi: 
--   1. Sinkronisasi kolom 'stock' dan 'cached_stock' pada tabel products.
--   2. Memastikan fn_process_inventory_movement mengupdate kedua kolom.
--   3. Memastikan pergerakan stok pada varian tetap mengupdate stok produk induk (shared pool).
--   4. Memperbaiki bug double-counting pada stok awal.
--   5. Sinkronisasi update manual kolom stock menjadi movement di ledger.
-- =====================================================================

-- 1. SINKRONISASI AWAL
UPDATE public.products 
SET stock = COALESCE(cached_stock, stock, 0),
    cached_stock = COALESCE(cached_stock, stock, 0);

UPDATE public.product_variants pv
SET cached_stock = p.stock
FROM public.products p
WHERE pv.product_id = p.id;

-- 2. HEART OF INTEGRATION: fn_process_inventory_movement
CREATE OR REPLACE FUNCTION public.fn_process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_stock INTEGER;
  v_is_tracking   BOOLEAN;
BEGIN
  -- BREAK RECURSION
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT track_stock INTO v_is_tracking
  FROM public.products WHERE id = NEW.product_id;

  IF NOT v_is_tracking THEN
    NEW.qty_before := 0;
    NEW.qty_after  := 0;
    RETURN NEW;
  END IF;

  -- ROW LOCKING pada produk induk
  SELECT COALESCE(stock, 0) INTO v_current_stock
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  NEW.qty_before := v_current_stock;
  NEW.qty_after  := v_current_stock + NEW.qty_change;

  -- Validasi Overselling
  IF NEW.qty_after < 0 AND NEW.movement_type IN ('sale', 'return_out', 'damage') THEN
    RAISE EXCEPTION
      'Stok tidak cukup untuk produk: %. Tersedia: %, Dibutuhkan: %',
      (SELECT name FROM public.products WHERE id = NEW.product_id), v_current_stock, ABS(NEW.qty_change);
  END IF;

  -- UPDATE PRODUK INDUK
  UPDATE public.products
  SET 
    stock = NEW.qty_after,
    cached_stock = NEW.qty_after,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  -- SYNC SEMUA VARIAN
  UPDATE public.product_variants
  SET 
    cached_stock = NEW.qty_after,
    updated_at = NOW()
  WHERE product_id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_process_inventory_movement ON public.inventory_movements;
DROP TRIGGER IF EXISTS trg_inventory_movement_process ON public.inventory_movements;

CREATE TRIGGER trg_inventory_movement_process
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_process_inventory_movement();

-- 3. INITIAL STOCK FIX (Prevent Double-Counting)
CREATE OR REPLACE FUNCTION public.fn_record_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID;
  v_initial_stock INTEGER;
BEGIN
  -- BREAK RECURSION
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_initial_stock := COALESCE(NEW.stock, 0);

  IF v_initial_stock > 0 THEN
    -- Reset stok di row yang baru diinsert
    UPDATE public.products SET stock = 0, cached_stock = 0 WHERE id = NEW.id;

    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      SELECT id INTO v_uid FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id, movement_type, reference_type, reference_id,
      qty_change, unit_cost, notes, created_by
    ) VALUES (
      NEW.id, 'adjustment', 'manual', NEW.id,
      v_initial_stock, NEW.cost_price, 'Stok awal saat pendaftaran produk', v_uid
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_record_initial_stock();

-- 4. MANUAL UPDATE SYNC (Intercept direct UPDATE on stock column)
CREATE OR REPLACE FUNCTION public.fn_sync_manual_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID;
  v_diff INTEGER;
BEGIN
  -- BREAK RECURSION: Stop loops between stock updates and inventory movements
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Jika stok diubah secara manual (bukan lewat trigger movement)
  -- Kita belokkan menjadi movement resmi
  v_diff := NEW.stock - OLD.stock;
  
  -- Revert NEW.stock agar tidak diupdate langsung
  NEW.stock := OLD.stock;
  NEW.cached_stock := OLD.cached_stock;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;
  END IF;

  INSERT INTO public.inventory_movements (
    product_id, movement_type, reference_type, reference_id,
    qty_change, unit_cost, notes, created_by
  ) VALUES (
    NEW.id, 'adjustment', 'manual', NEW.id,
    v_diff, NEW.cost_price, 'Penyesuaian stok manual (via Edit Produk)', v_uid
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_stock_update ON public.products;
CREATE TRIGGER trg_products_sync_stock_update
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  WHEN (NEW.stock IS DISTINCT FROM OLD.stock)
  EXECUTE FUNCTION public.fn_sync_manual_stock_update();
