-- =====================================================================
-- FIX: AUTO INITIAL STOCK MOVEMENT
-- Trigger ini akan mendeteksi insert pada tabel products.
-- Jika produk diinput dengan stock > 0, otomatis mencatat ke inventory_movements.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_record_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Hanya eksekusi jika user menginputkan stok awal lebih dari 0
  IF NEW.stock > 0 THEN
    
    -- Ambil UID dari session Supabase
    v_uid := auth.uid();

    -- Fallback: Jika input dilakukan dari SQL Editor / Dashboard Supabase (bukan via API Next.js)
    -- Kita pinjam UID dari user admin pertama yang aktif agar NOT NULL constraint tidak error
    IF v_uid IS NULL THEN
      SELECT id INTO v_uid 
      FROM public.profiles 
      WHERE role = 'admin' AND is_active = true 
      LIMIT 1;
      
      -- Jika tetap tidak ada admin, gagalkan transaksi dengan pesan yang jelas
      IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Gagal membuat stok awal: Tidak ada user yang login atau admin yang valid untuk mengisi created_by.';
      END IF;
    END IF;

    -- Insert ke buku besar mutasi
    INSERT INTO public.inventory_movements (
      product_id,
      product_variant_id, -- NULL karena ini produk master
      movement_type,
      reference_type,
      reference_id,
      qty_change,
      unit_cost,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      NULL,
      'adjustment',   -- Tipe pergerakan untuk input manual
      'manual',
      NEW.id,         -- Referensi kembali ke produk itu sendiri
      NEW.stock,      -- Angka stok awal dari inputan CRUD
      NEW.cost_price, -- HPP awal
      'Stok awal saat pendaftaran produk',
      v_uid
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Pasang trigger di tabel products
DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_record_initial_stock();
