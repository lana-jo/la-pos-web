-- =====================================================================
-- FIX: DEDUCT STOCK KE INVENTORY MOVEMENTS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r              RECORD;
  v_deduct_qty   INTEGER;
BEGIN
  IF OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN RETURN NEW; END IF;
  IF NEW.payment_status != 'paid' THEN RETURN NEW; END IF;

  FOR r IN
    SELECT
      ti.product_id,
      ti.product_variant_id,
      ti.qty,
      ti.cost_price,
      -- LEFT JOIN untuk dapat conversion_qty
      COALESCE(pv.conversion_qty, 1) AS conversion_qty
    FROM public.transaction_items ti
    LEFT JOIN public.product_variants pv ON pv.id = ti.product_variant_id
    WHERE ti.transaction_id = NEW.id
  LOOP
    -- Total unit stok yang harus dikurangi
    v_deduct_qty := r.qty * r.conversion_qty;

    -- KITA HAPUS PENGECEKAN STOK MANUAL DI SINI.
    -- Mengapa? Karena fungsi fn_process_inventory_movement (Trigger tabel mutasi) 
    -- sudah memiliki validasi "Insufficient stock" dan Row-Locking! Biarkan Ledger yang bekerja.

    -- INSERT KE SISTEM LEDGER BARU (inventory_movements)
    INSERT INTO public.inventory_movements
      (product_id, product_variant_id, movement_type, reference_id,
       reference_type, qty_change, unit_cost, notes, created_by)
    VALUES
      (r.product_id, r.product_variant_id, 'sale', NEW.id, 'transaction',
       -v_deduct_qty, r.cost_price, 'Penjualan transaksi ' || NEW.id::TEXT, NEW.cashier_id);

    -- OPSIONAL: Tetap update tabel lama (stock) agar tidak error jika ada UI yang masih baca kolom ini
    UPDATE public.products SET stock = stock - v_deduct_qty WHERE id = r.product_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Pastikan trigger terpasang kembali
DROP TRIGGER IF EXISTS trg_transactions_deduct_stock ON public.transactions;
CREATE TRIGGER trg_transactions_deduct_stock
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_deduct_stock_on_payment();
