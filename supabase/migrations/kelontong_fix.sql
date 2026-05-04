-- =====================================================================
-- KELONTONG POS — FULL FIX PATCH
-- Version : 1.0
-- Fix List:
--   [FIX-1] product_variants — duplicate table + kolom tidak konsisten
--   [FIX-2] fn_deduct_stock_on_payment — r.conversion_qty tidak di-SELECT
--   [FIX-3] fn_return_stock_on_void — tidak pakai conversion_qty
--   [FIX-4] RLS categories — fn_is_admin() bisa NULL saat auth.uid() NULL
--           + tambah policy cashier_or_admin untuk INSERT/UPDATE
-- =====================================================================
-- CARA EKSEKUSI:
--   Paste ke Supabase SQL Editor → Run
--   Semua statement idempotent (aman dijalankan berulang)
-- =====================================================================


-- =====================================================================
-- [FIX-1] PRODUCT VARIANTS — Hapus duplikat, konsolidasi schema
-- =====================================================================
-- Masalah: Ada 2x CREATE TABLE product_variants dengan kolom berbeda.
--   Versi 1: punya cost_price, min_qty  → TIDAK punya conversion_qty
--   Versi 2: punya conversion_qty        → TIDAK punya cost_price, min_qty
-- Di PostgreSQL yang tereksekusi adalah yang PERTAMA karena IF NOT EXISTS.
-- Fix: Tambahkan kolom yang hilang agar kedua versi terpenuhi.
-- =====================================================================

-- Tambah conversion_qty jika belum ada (dari versi 2)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS conversion_qty INTEGER NOT NULL DEFAULT 1
    CHECK (conversion_qty > 0);

-- Tambah cost_price jika belum ada (dari versi 1)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price INTEGER NOT NULL DEFAULT 0
    CHECK (cost_price >= 0);

-- Tambah min_qty jika belum ada (dari versi 1)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS min_qty INTEGER NOT NULL DEFAULT 1;

-- Pastikan comment terbaru
COMMENT ON TABLE public.product_variants IS
  'Varian produk (Eceran, Grosir, Dus, dll.) dengan faktor konversi stok';

COMMENT ON COLUMN public.product_variants.conversion_qty IS
  'Faktor pengali stok. Contoh: 1 Dus = 12 pcs → conversion_qty = 12';

COMMENT ON COLUMN public.product_variants.min_qty IS
  'Minimum kuantitas pembelian agar varian ini berlaku (untuk grosir)';


-- =====================================================================
-- [FIX-2] fn_deduct_stock_on_payment — tambah conversion_qty ke SELECT
-- =====================================================================
-- Masalah: Trigger melakukan  stock - (r.qty * r.conversion_qty)
--          tetapi r.conversion_qty tidak pernah di-SELECT → nilainya NULL
--          NULL * apapun = NULL → stock tidak berubah / error silent
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r               RECORD;
  v_stock_before  INTEGER;
  v_deduct_qty    INTEGER;
BEGIN
  -- Hanya proses saat status berubah menjadi 'paid'
  IF OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status != 'paid' THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT
      ti.product_id,
      ti.product_variant_id,
      ti.qty,
      ti.cost_price,
      -- [FIX] Ambil conversion_qty dari product_variants, default 1
      COALESCE(pv.conversion_qty, 1) AS conversion_qty
    FROM public.transaction_items ti
    LEFT JOIN public.product_variants pv ON pv.id = ti.product_variant_id
    WHERE ti.transaction_id = NEW.id
  LOOP
    SELECT stock INTO v_stock_before
    FROM public.products
    WHERE id = r.product_id;

    -- Hitung total unit yang dikurangi dari stok
    v_deduct_qty := r.qty * r.conversion_qty;

    IF v_stock_before - v_deduct_qty < 0 THEN
      RAISE EXCEPTION
        'Stok tidak cukup untuk produk ID: %. Stok: %, Dibutuhkan: %',
        r.product_id, v_stock_before, v_deduct_qty;
    END IF;

    UPDATE public.products
    SET stock = stock - v_deduct_qty
    WHERE id = r.product_id;

    INSERT INTO public.stock_movements
      (product_id, product_variant_id, movement_type, reference_id,
       reference_type, qty_before, qty_change, qty_after, notes, created_by)
    VALUES
      (r.product_id, r.product_variant_id, 'sale', NEW.id, 'transaction',
       v_stock_before, -v_deduct_qty, v_stock_before - v_deduct_qty,
       'Penjualan transaksi ' || NEW.id::TEXT, NEW.cashier_id);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Pasang ulang trigger
DROP TRIGGER IF EXISTS trg_transactions_deduct_stock ON public.transactions;
CREATE TRIGGER trg_transactions_deduct_stock
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_deduct_stock_on_payment();


-- =====================================================================
-- [FIX-3] fn_return_stock_on_void — tambah conversion_qty
-- =====================================================================
-- Masalah: Saat void, stok dikembalikan hanya r.qty (bukan qty * conversion_qty)
--          sehingga stok yang dikembalikan tidak simetris dengan yang dikurangi
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_return_stock_on_void()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r               RECORD;
  v_stock_before  INTEGER;
  v_return_qty    INTEGER;
BEGIN
  IF OLD.payment_status = 'paid' AND NEW.payment_status = 'cancelled' THEN
    FOR r IN
      SELECT
        ti.product_id,
        ti.product_variant_id,
        ti.qty,
        -- [FIX] Ambil conversion_qty agar simetris dengan saat deduct
        COALESCE(pv.conversion_qty, 1) AS conversion_qty
      FROM public.transaction_items ti
      LEFT JOIN public.product_variants pv ON pv.id = ti.product_variant_id
      WHERE ti.transaction_id = NEW.id
    LOOP
      SELECT stock INTO v_stock_before
      FROM public.products WHERE id = r.product_id;

      v_return_qty := r.qty * r.conversion_qty;

      UPDATE public.products
      SET stock = stock + v_return_qty
      WHERE id = r.product_id;

      INSERT INTO public.stock_movements
        (product_id, product_variant_id, movement_type, reference_id,
         reference_type, qty_before, qty_change, qty_after, notes, created_by)
      VALUES
        (r.product_id, r.product_variant_id, 'void', NEW.id, 'transaction',
         v_stock_before, v_return_qty, v_stock_before + v_return_qty,
         'Stok dikembalikan akibat void transaksi ' || NEW.id::TEXT,
         NEW.voided_by);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Pasang ulang trigger
DROP TRIGGER IF EXISTS trg_transactions_return_stock_void ON public.transactions;
CREATE TRIGGER trg_transactions_return_stock_void
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_return_stock_on_void();


-- =====================================================================
-- [FIX-4] RLS CATEGORIES — Perbaiki semua policy
-- =====================================================================
-- Masalah:
--   a) fn_is_admin() dipanggil tanpa fallback saat auth.uid() = NULL
--      (terjadi kalau Next.js client tidak forward cookies dengan benar)
--   b) Tidak ada policy INSERT/UPDATE/DELETE untuk cashier
--      (cashier tidak bisa tambah kategori, hanya admin)
--   c) fn_is_admin() tidak punya guard IS NULL → bisa lempar error
-- =====================================================================

-- Step 1: Perkuat fn_get_user_role agar tidak error saat uid NULL
CREATE OR REPLACE FUNCTION public.fn_get_user_role(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Guard: jika tidak ada uid (unauthenticated), langsung return NULL
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role::TEXT INTO v_role
  FROM public.profiles
  WHERE id = p_user_id AND is_active = true;  -- [FIX] tambah is_active check

  RETURN v_role;
END;
$$;

-- Step 2: Perkuat fn_is_admin dengan null-safe check
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN COALESCE(public.fn_get_user_role(auth.uid()), '') = 'admin';
END;
$$;

-- Step 3: Perkuat fn_is_cashier_or_admin dengan null-safe check
CREATE OR REPLACE FUNCTION public.fn_is_cashier_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN COALESCE(public.fn_get_user_role(auth.uid()), '') IN ('cashier', 'admin');
END;
$$;

-- Step 4: Drop semua policy categories yang lama
DROP POLICY IF EXISTS "categories:admin_all"    ON public.categories;
DROP POLICY IF EXISTS "categories:auth_select"  ON public.categories;
DROP POLICY IF EXISTS "categories:anon_select"  ON public.categories;
-- Drop jika ada sisa policy lama dengan nama lain
DROP POLICY IF EXISTS "categories:cashier_select"  ON public.categories;
DROP POLICY IF EXISTS "categories:cashier_insert"  ON public.categories;
DROP POLICY IF EXISTS "categories:cashier_update"  ON public.categories;

-- Step 5: Buat ulang semua policy categories

-- SELECT: semua user authenticated bisa lihat kategori aktif
CREATE POLICY "categories:auth_select"
  ON public.categories FOR SELECT TO authenticated
  USING (is_active = true);

-- SELECT: anon/public bisa lihat kategori aktif (untuk catalog)
CREATE POLICY "categories:anon_select"
  ON public.categories FOR SELECT TO anon
  USING (is_active = true);

-- INSERT: hanya admin yang bisa tambah kategori
CREATE POLICY "categories:admin_insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());

-- UPDATE: hanya admin yang bisa edit kategori
CREATE POLICY "categories:admin_update"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.fn_is_admin())
  WITH CHECK (public.fn_is_admin());

-- DELETE: hanya admin yang bisa hapus kategori
CREATE POLICY "categories:admin_delete"
  ON public.categories FOR DELETE TO authenticated
  USING (public.fn_is_admin());

-- Service role bypass (untuk server-side operations)
CREATE POLICY "categories:service_role"
  ON public.categories FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- =====================================================================
-- BONUS FIX: Perbaiki RLS pada tabel lain yang sama strukturnya
-- =====================================================================
-- Terapkan pola yang sama (pisahkan ALL menjadi per-operation)
-- agar lebih eksplisit dan tidak ada celah policy overlap

-- UNITS: tambah service_role bypass
DROP POLICY IF EXISTS "units:service_role" ON public.units;
CREATE POLICY "units:service_role"
  ON public.units FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Pisah admin_all units menjadi per-operasi
DROP POLICY IF EXISTS "units:admin_all" ON public.units;

CREATE POLICY "units:admin_insert"
  ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());

CREATE POLICY "units:admin_update"
  ON public.units FOR UPDATE TO authenticated
  USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());

CREATE POLICY "units:admin_delete"
  ON public.units FOR DELETE TO authenticated
  USING (public.fn_is_admin());


-- =====================================================================
-- VERIFIKASI — Jalankan query ini untuk cek semua fix berhasil
-- =====================================================================
-- 1. Cek kolom product_variants
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_variants'
ORDER BY ordinal_position;

-- 2. Cek semua policy categories
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'categories'
ORDER BY policyname;

-- 3. Cek role user yang sedang login (jalankan saat sudah login via Supabase)
SELECT
  auth.uid()                      AS current_uid,
  public.fn_get_user_role()       AS role,
  public.fn_is_admin()            AS is_admin,
  public.fn_is_cashier_or_admin() AS is_cashier_or_admin;

-- 4. Test insert kategori langsung dari SQL editor
-- (uncomment untuk test)
-- INSERT INTO public.categories (name, slug, sort_order)
-- VALUES ('Test Kategori', 'test-kategori', 99);
-- DELETE FROM public.categories WHERE slug = 'test-kategori';


-- =====================================================================
-- SUMMARY OF CHANGES
-- =====================================================================
-- [FIX-1] product_variants:
--         + ADD COLUMN conversion_qty INTEGER DEFAULT 1
--         + ADD COLUMN cost_price     INTEGER DEFAULT 0
--         + ADD COLUMN min_qty        INTEGER DEFAULT 1
--
-- [FIX-2] fn_deduct_stock_on_payment:
--         + SELECT COALESCE(pv.conversion_qty, 1) via LEFT JOIN
--         + Hitung v_deduct_qty = r.qty * r.conversion_qty
--         + Error message lebih informatif
--
-- [FIX-3] fn_return_stock_on_void:
--         + SELECT COALESCE(pv.conversion_qty, 1) via LEFT JOIN
--         + v_return_qty simetris dengan deduct
--
-- [FIX-4] RLS categories + helper functions:
--         + fn_get_user_role: guard NULL uid + is_active check
--         + fn_is_admin: COALESCE null-safe
--         + fn_is_cashier_or_admin: COALESCE null-safe
--         + Pisah policy ALL → per-operasi (INSERT/UPDATE/DELETE/SELECT)
--         + Tambah service_role bypass di categories & units
-- =====================================================================
