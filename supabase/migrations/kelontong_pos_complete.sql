-- =====================================================================
-- KELONTONG POS — COMPLETE SUPABASE DATABASE SETUP
-- Version : 5.1.0 (Definitive Integration: Shared Stock + Inherit Cost)
-- Target  : Supabase PostgreSQL 15+
-- =====================================================================

-- [INTEGRATION] FIX: TOTAL STOCK INTEGRATION (LEDGER-BASED)
-- 1. SINKRONISASI AWAL (Ensure all columns are in sync before we start)
DO $$
BEGIN
    -- Sinkronisasi kolom 'stock' dan 'cached_stock' pada tabel products.
    UPDATE public.products
    SET stock = COALESCE(cached_stock, stock, 0),
        cached_stock = COALESCE(cached_stock, stock, 0);

    -- Sinkronisasi cached_stock varian ke produk induk (Base Unit)
    UPDATE public.product_variants pv
    SET cached_stock = p.stock
    FROM public.products p
    WHERE pv.product_id = p.id;
END $$;

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. ENUM TYPES
-- =====================================================================
DROP TYPE IF EXISTS public.user_role          CASCADE;
DROP TYPE IF EXISTS public.payment_status     CASCADE;
DROP TYPE IF EXISTS public.payment_method     CASCADE;
DROP TYPE IF EXISTS public.action_type        CASCADE;
DROP TYPE IF EXISTS public.movement_type      CASCADE;
DROP TYPE IF EXISTS public.reference_type     CASCADE;
DROP TYPE IF EXISTS public.shift_status       CASCADE;
DROP TYPE IF EXISTS public.debt_status        CASCADE;
DROP TYPE IF EXISTS public.discount_type      CASCADE;
DROP TYPE IF EXISTS public.purchase_status    CASCADE;

CREATE TYPE public.user_role AS ENUM ('admin', 'cashier', 'customer');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'expired', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'qris', 'transfer', 'debt');
CREATE TYPE public.action_type AS ENUM ('void', 'discount', 'refund', 'stock_adjustment', 'shift_open', 'shift_close');
CREATE TYPE public.movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'return_in', 'return_out', 'damage', 'void');
CREATE TYPE public.reference_type AS ENUM ('transaction', 'purchase_order', 'refund', 'manual');
CREATE TYPE public.shift_status AS ENUM ('open', 'closed');
CREATE TYPE public.debt_status AS ENUM ('outstanding', 'partial', 'paid');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.purchase_status AS ENUM ('draft', 'ordered', 'received', 'partial', 'cancelled');

-- =====================================================================
-- 3. TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID             NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role             public.user_role NOT NULL DEFAULT 'customer',
    full_name        TEXT,
    phone            TEXT,
    avatar_url       TEXT,
    pin_hash         TEXT,
    theme_preference TEXT             CHECK (theme_preference IN ('light','dark','system')) DEFAULT 'system',
    email            TEXT             UNIQUE,
    is_active        BOOLEAN          NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT        NOT NULL,
    symbol     TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,
    icon       TEXT,
    color      TEXT,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name           TEXT        NOT NULL,
    phone          TEXT,
    address        TEXT,
    email          TEXT,
    contact_person TEXT,
    notes          TEXT,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id         UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
    unit_id             UUID        REFERENCES public.units(id)      ON DELETE SET NULL,
    supplier_id         UUID        REFERENCES public.suppliers(id)  ON DELETE SET NULL,
    name                TEXT        NOT NULL,
    barcode             TEXT        NOT NULL UNIQUE,
    description         TEXT,
    cost_price          INTEGER     NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    price               INTEGER     NOT NULL CHECK (price >= 0),
    stock               INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock           INTEGER     NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    max_stock           INTEGER     CHECK (max_stock >= 0),
    track_stock         BOOLEAN     NOT NULL DEFAULT true,
    cached_stock        INTEGER     NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER     NOT NULL DEFAULT 5,
    image_url           TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT true,
    is_consignment      BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id     UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name   TEXT        NOT NULL,
    barcode        TEXT        UNIQUE,
    price          INTEGER     NOT NULL CHECK (price >= 0),
    cost_price     INTEGER     NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    inherit_cost_price BOOLEAN DEFAULT false,
    conversion_qty INTEGER     NOT NULL DEFAULT 1 CHECK (conversion_qty > 0),
    min_qty        INTEGER     NOT NULL DEFAULT 1,
    cached_stock   INTEGER     NOT NULL DEFAULT 0,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    is_default     BOOLEAN     NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discounts (
    id            UUID                 DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT                 NOT NULL,
    code          TEXT                 UNIQUE,
    discount_type public.discount_type NOT NULL DEFAULT 'percentage',
    value         INTEGER              NOT NULL CHECK (value > 0),
    max_discount  INTEGER,
    min_purchase  INTEGER              NOT NULL DEFAULT 0,
    max_usage     INTEGER,
    usage_count   INTEGER              NOT NULL DEFAULT 0,
    is_active     BOOLEAN              NOT NULL DEFAULT true,
    valid_from    TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    valid_until   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id              UUID                DEFAULT gen_random_uuid() PRIMARY KEY,
    cashier_id      UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status          public.shift_status NOT NULL DEFAULT 'open',
    opening_cash    INTEGER             NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
    closing_cash    INTEGER             CHECK (closing_cash >= 0),
    expected_cash   INTEGER             NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
    notes           TEXT,
    opened_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.customers (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT        NOT NULL,
    phone      TEXT        UNIQUE,
    address    TEXT,
    notes      TEXT,
    total_debt INTEGER     NOT NULL DEFAULT 0 CHECK (total_debt >= 0),
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id                UUID                  DEFAULT gen_random_uuid() PRIMARY KEY,
    cashier_id        UUID                  REFERENCES public.profiles(id)  ON DELETE SET NULL,
    shift_id          UUID                  REFERENCES public.shifts(id)    ON DELETE SET NULL,
    customer_id       UUID                  REFERENCES public.customers(id) ON DELETE SET NULL,
    discount_id       UUID                  REFERENCES public.discounts(id) ON DELETE SET NULL,
    subtotal          INTEGER               NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount   INTEGER               NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount        INTEGER               NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total             INTEGER               NOT NULL DEFAULT 0 CHECK (total >= 0),
    amount_paid       INTEGER               NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    change_amount     INTEGER               NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
    payment_method    public.payment_method NOT NULL DEFAULT 'cash',
    payment_status    public.payment_status NOT NULL DEFAULT 'pending',
    notes             TEXT,
    midtrans_order_id TEXT                  UNIQUE,
    qris_url          TEXT,
    qris_string       TEXT,
    qris_expires_at   TIMESTAMPTZ,
    paid_at           TIMESTAMPTZ,
    voided_at         TIMESTAMPTZ,
    voided_by         UUID                  REFERENCES public.profiles(id) ON DELETE SET NULL,
    void_reason       TEXT,
    created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id                 UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id     UUID    NOT NULL REFERENCES public.transactions(id)    ON DELETE CASCADE,
    product_id         UUID    REFERENCES public.products(id)                  ON DELETE SET NULL,
    product_variant_id UUID    REFERENCES public.product_variants(id)          ON DELETE RESTRICT,
    product_name       TEXT    NOT NULL,
    variant_name       TEXT,
    barcode            TEXT,
    qty                INTEGER NOT NULL CHECK (qty > 0),
    unit_price         INTEGER NOT NULL CHECK (unit_price >= 0),
    cost_price         INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    discount_amount    INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    subtotal           INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id             UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id    UUID                   REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_by     UUID                   REFERENCES public.profiles(id)  ON DELETE SET NULL,
    received_by    UUID                   REFERENCES public.profiles(id)  ON DELETE SET NULL,
    status         public.purchase_status NOT NULL DEFAULT 'draft',
    invoice_number TEXT,
    total          INTEGER                NOT NULL DEFAULT 0 CHECK (total >= 0),
    paid_amount    INTEGER                NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    notes          TEXT,
    ordered_at     TIMESTAMPTZ,
    received_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID    NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id        UUID    REFERENCES public.products(id)                  ON DELETE SET NULL,
    product_name      TEXT    NOT NULL,
    barcode           TEXT,
    qty_ordered       INTEGER NOT NULL CHECK (qty_ordered > 0),
    qty_received      INTEGER NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    unit_cost         INTEGER NOT NULL CHECK (unit_cost >= 0),
    subtotal          INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id                 UUID                  DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id         UUID                  NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_variant_id UUID                  REFERENCES public.product_variants(id)  ON DELETE CASCADE,
    movement_type      public.movement_type  NOT NULL,
    reference_type     public.reference_type,
    reference_id       UUID,
    qty_change         INTEGER               NOT NULL,
    qty_before         INTEGER               NOT NULL DEFAULT 0,
    qty_after          INTEGER               NOT NULL DEFAULT 0,
    unit_cost          NUMERIC(12, 2)        DEFAULT 0,
    notes              TEXT,
    created_by         UUID                  NOT NULL REFERENCES auth.users(id),
    created_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_debts (
    id             UUID               DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id    UUID               NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    transaction_id UUID               REFERENCES public.transactions(id)       ON DELETE SET NULL,
    cashier_id     UUID               REFERENCES public.profiles(id)           ON DELETE SET NULL,
    status         public.debt_status NOT NULL DEFAULT 'outstanding',
    amount         INTEGER            NOT NULL CHECK (amount > 0),
    paid_amount    INTEGER            NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining      INTEGER            GENERATED ALWAYS AS (amount - paid_amount) STORED,
    due_date       DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    debt_id    UUID        NOT NULL REFERENCES public.customer_debts(id) ON DELETE RESTRICT,
    cashier_id UUID        REFERENCES public.profiles(id)                ON DELETE SET NULL,
    amount     INTEGER     NOT NULL CHECK (amount > 0),
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cashier_actions (
    id           UUID               DEFAULT gen_random_uuid() PRIMARY KEY,
    cashier_id   UUID               REFERENCES public.profiles(id) ON DELETE SET NULL,
    shift_id     UUID               REFERENCES public.shifts(id)   ON DELETE SET NULL,
    action_type  public.action_type NOT NULL,
    target_id    TEXT,
    target_type  TEXT,
    pin_verified BOOLEAN            NOT NULL DEFAULT false,
    notes        TEXT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    category     TEXT        NOT NULL,
    key          TEXT        NOT NULL,
    value        TEXT,
    description  TEXT,
    data_type    TEXT        NOT NULL DEFAULT 'string',
    is_encrypted BOOLEAN     NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT settings_unique_category_key UNIQUE (category, key)
);

CREATE TABLE IF NOT EXISTS public.daily_reports (
    id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    report_date               DATE        NOT NULL UNIQUE,
    total_sales               BIGINT      NOT NULL DEFAULT 0,
    total_transactions        INTEGER     NOT NULL DEFAULT 0,
    paid_transactions         INTEGER     NOT NULL DEFAULT 0,
    pending_transactions      INTEGER     NOT NULL DEFAULT 0,
    cancelled_transactions    INTEGER     NOT NULL DEFAULT 0,
    expired_transactions      INTEGER     NOT NULL DEFAULT 0,
    average_transaction_value BIGINT      NOT NULL DEFAULT 0,
    total_items_sold          INTEGER     NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 4. FUNCTIONS & TRIGGERS
-- =====================================================================

-- 4.0 SECURITY HELPERS
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_cashier_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cashier') AND is_active = true
  );
END;
$$;

-- 4.1 INVENTORY MOVEMENTS — Atomic Stock Integration (Shared Pool Logic)
-- Heart of the system: Ensuring all variants and parent product stay in sync.
CREATE OR REPLACE FUNCTION public.fn_process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_stock INTEGER;
  v_is_tracking   BOOLEAN;
BEGIN
  -- 1. Check if we should even track this product
  SELECT track_stock INTO v_is_tracking
  FROM public.products WHERE id = NEW.product_id;

  IF NOT v_is_tracking THEN
    NEW.qty_before := 0;
    NEW.qty_after  := 0;
    RETURN NEW;
  END IF;

  -- 2. ROW LOCKING on Parent Product (Prevent Race Conditions)
  -- Crucial for shared stock pool integrity.
  SELECT COALESCE(stock, 0) INTO v_current_stock
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  -- 3. Calculate Quantities
  NEW.qty_before := v_current_stock;
  NEW.qty_after  := v_current_stock + NEW.qty_change;

  -- 4. Validate Overselling (Business Rule)
  IF NEW.qty_after < 0 AND NEW.movement_type IN ('sale', 'return_out', 'damage') THEN
    RAISE EXCEPTION
      'Stok tidak cukup untuk produk: %. Tersedia: %, Dibutuhkan: %',
      (SELECT name FROM public.products WHERE id = NEW.product_id), v_current_stock, ABS(NEW.qty_change);
  END IF;

  -- 5. UPDATE Parent Product (The Single Source of Truth)
  UPDATE public.products
  SET
    stock = NEW.qty_after,
    cached_stock = NEW.qty_after,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  -- 6. SYNC ALL VARIANTS (UI Consistency)
  UPDATE public.product_variants
  SET
    cached_stock = NEW.qty_after,
    updated_at = NOW()
  WHERE product_id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_movement_process ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movement_process
    BEFORE INSERT ON public.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_process_inventory_movement();

-- 4.2 PRODUCTS — Secure Initial Stock Recording (Strict Audit + Fallback)
CREATE OR REPLACE FUNCTION public.fn_record_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
  v_initial_stock INTEGER;
BEGIN
  v_initial_stock := COALESCE(NEW.stock, 0);

  IF v_initial_stock > 0 THEN
    -- A. Determine Acting User (Audit Trail)
    v_uid := auth.uid();

    -- Fallback for Batch/SQL Imports (Supportive Security)
    IF v_uid IS NULL THEN
      SELECT id INTO v_uid FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;
    END IF;

    -- B. Security Gate
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Akses ditolak: Operasi stok awal wajib memiliki identitas pengguna yang valid.';
    END IF;

    -- C. RESET Product Stock (Prevent Double Counting)
    -- Ledger (inventory_movements) will add the stock back via the trigger.
    UPDATE public.products
    SET stock = 0, cached_stock = 0
    WHERE id = NEW.id;

    -- D. Record Movement
    INSERT INTO public.inventory_movements (
        product_id, product_variant_id, movement_type,
        reference_type, reference_id,
        qty_change, unit_cost, notes, created_by
    ) VALUES (
        NEW.id, NULL, 'adjustment',
        'manual', NEW.id,
        v_initial_stock, NEW.cost_price,
        'Stok awal saat pendaftaran produk (Auto-sync)',
        v_uid
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
    AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_record_initial_stock();

-- 4.3 PRODUCTS — Manual Stock Update Interception (Integrity Enforcement)
CREATE OR REPLACE FUNCTION public.fn_sync_manual_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_uid UUID;
    v_diff INTEGER;
BEGIN
  -- BREAK RECURSION: Prevent infinite loops between product updates and inventory ledger
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Calculate difference
  v_diff := NEW.stock - OLD.stock;

  -- Prevent direct update on stock columns (Force usage of Ledger)
  NEW.stock := OLD.stock;
  NEW.cached_stock := OLD.cached_stock;

  -- Audit Logic
  v_uid := COALESCE(auth.uid(), (SELECT id FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1));

  -- Redirect to Ledger
  INSERT INTO public.inventory_movements (
    product_id, movement_type, reference_type, reference_id,
    qty_change, unit_cost, notes, created_by
  ) VALUES (
    NEW.id, 'adjustment', 'manual', NEW.id,
    v_diff, NEW.cost_price, 'Penyesuaian stok manual (via UI Edit)', v_uid
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

-- 4.4 TRANSACTIONS — Deduct Stock on Payment
CREATE OR REPLACE FUNCTION public.fn_deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    r RECORD;
    v_deduct_qty INTEGER;
BEGIN
    -- Only process when payment status changes to 'paid'
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
        FOR r IN
            SELECT
                ti.product_id,
                ti.product_variant_id,
                ti.qty,
                ti.cost_price,
                COALESCE(pv.conversion_qty, 1) as conversion_qty
            FROM public.transaction_items ti
            LEFT JOIN public.product_variants pv ON ti.product_variant_id = pv.id
            WHERE ti.transaction_id = NEW.id
        LOOP
            -- Calculate total quantity in base units
            v_deduct_qty := r.qty * r.conversion_qty;

            -- Record in Ledger (Trigger fn_process_inventory_movement will handle the math and row locking)
            INSERT INTO public.inventory_movements (
                product_id,
                product_variant_id,
                movement_type,
                reference_type,
                reference_id,
                qty_change,
                unit_cost,
                notes,
                created_by
            ) VALUES (
                r.product_id,
                r.product_variant_id,
                'sale',
                'transaction',
                NEW.id,
                -v_deduct_qty,
                r.cost_price,
                'Penjualan #' || NEW.id::TEXT,
                COALESCE(NEW.cashier_id, auth.uid())
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_stock_deduct ON public.transactions;
CREATE TRIGGER trg_transactions_stock_deduct
    AFTER UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_deduct_stock_on_payment();

-- 4.5 TRANSACTIONS — Return Stock on Void
CREATE OR REPLACE FUNCTION public.fn_return_stock_on_void()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    r RECORD;
    v_return_qty INTEGER;
BEGIN
    -- Process when voided_at is set
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
        FOR r IN
            SELECT
                ti.product_id,
                ti.product_variant_id,
                ti.qty,
                ti.cost_price,
                COALESCE(pv.conversion_qty, 1) as conversion_qty
            FROM public.transaction_items ti
            LEFT JOIN public.product_variants pv ON ti.product_variant_id = pv.id
            WHERE ti.transaction_id = NEW.id
        LOOP
            v_return_qty := r.qty * r.conversion_qty;

            INSERT INTO public.inventory_movements (
                product_id,
                product_variant_id,
                movement_type,
                reference_type,
                reference_id,
                qty_change,
                unit_cost,
                notes,
                created_by
            ) VALUES (
                r.product_id,
                r.product_variant_id,
                'void',
                'transaction',
                NEW.id,
                v_return_qty,
                r.cost_price,
                'Stok dikembalikan (Void Transaksi #' || NEW.id::TEXT || ')',
                COALESCE(NEW.voided_by, auth.uid())
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_stock_return ON public.transactions;
CREATE TRIGGER trg_transactions_stock_return
    AFTER UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_return_stock_on_void();

-- 4.6 PURCHASE ORDERS — Add Stock on Received
CREATE OR REPLACE FUNCTION public.fn_add_stock_on_purchase_received()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    r RECORD;
BEGIN
    -- When status changes to 'received'
    IF NEW.status = 'received' AND OLD.status <> 'received' THEN
        FOR r IN
            SELECT product_id, qty_received, unit_cost
            FROM public.purchase_order_items
            WHERE purchase_order_id = NEW.id
        LOOP
            IF r.qty_received > 0 THEN
                INSERT INTO public.inventory_movements (
                    product_id,
                    movement_type,
                    reference_type,
                    reference_id,
                    qty_change,
                    unit_cost,
                    notes,
                    created_by
                ) VALUES (
                    r.product_id,
                    'purchase',
                    'purchase_order',
                    NEW.id,
                    r.qty_received,
                    r.unit_cost,
                    'Penerimaan stok (PO #' || COALESCE(NEW.invoice_number, NEW.id::TEXT) || ')',
                    COALESCE(NEW.received_by, auth.uid())
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_orders_stock_add ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_stock_add
    AFTER UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_add_stock_on_purchase_received();

-- 4.8 SHIFTS — Auto-calculate Expected Cash
CREATE OR REPLACE FUNCTION public.fn_update_shift_expected_cash()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. On Payment (paid)
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' AND NEW.payment_method = 'cash' AND NEW.shift_id IS NOT NULL THEN
      UPDATE public.shifts
      SET expected_cash = COALESCE(expected_cash, opening_cash) + NEW.total
      WHERE id = NEW.shift_id;
    END IF;

    -- 2. On Void
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL AND NEW.payment_method = 'cash' AND NEW.shift_id IS NOT NULL THEN
      UPDATE public.shifts
      SET expected_cash = COALESCE(expected_cash, opening_cash) - NEW.total
      WHERE id = NEW.shift_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_shift_cash ON public.transactions;
CREATE TRIGGER trg_transactions_shift_cash
    AFTER UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_shift_expected_cash();

-- 4.9 SHIFTS — Initialize Expected Cash on Open
CREATE OR REPLACE FUNCTION public.fn_init_shift_expected_cash()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.expected_cash := NEW.opening_cash;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shifts_init_cash ON public.shifts;
CREATE TRIGGER trg_shifts_init_cash
    BEFORE INSERT ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.fn_init_shift_expected_cash();

-- 4.7 REPORTS — Daily Income Report Generation
CREATE OR REPLACE FUNCTION public.generate_daily_report(target_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
  report_id UUID;
  total_sales_val BIGINT := 0;
  total_transactions_val INTEGER := 0;
  paid_transactions_val INTEGER := 0;
  pending_transactions_val INTEGER := 0;
  cancelled_transactions_val INTEGER := 0;
  expired_transactions_val INTEGER := 0;
  average_transaction_val BIGINT := 0;
  total_items_sold_val INTEGER := 0;

  -- Timezone-safe ts
  start_ts TIMESTAMP WITH TIME ZONE;
  end_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default Asia/Jakarta context
  start_ts := (target_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  end_ts := start_ts + INTERVAL '1 day';

  -- Calculate transaction stats
  SELECT
    COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status = 'pending'),
    COUNT(*) FILTER (WHERE payment_status = 'cancelled'),
    COUNT(*) FILTER (WHERE payment_status = 'expired'),
    CASE
      WHEN COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
      THEN COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) / COUNT(*) FILTER (WHERE payment_status = 'paid')
      ELSE 0
    END
  INTO
    total_sales_val,
    total_transactions_val,
    paid_transactions_val,
    pending_transactions_val,
    cancelled_transactions_val,
    expired_transactions_val,
    average_transaction_val
  FROM public.transactions
  WHERE created_at >= start_ts AND created_at < end_ts;

  -- Calculate total items sold
  SELECT COALESCE(SUM(qty), 0)
  INTO total_items_sold_val
  FROM public.transaction_items ti
  JOIN public.transactions t ON ti.transaction_id = t.id
  WHERE t.created_at >= start_ts AND t.created_at < end_ts
    AND t.payment_status = 'paid';

  -- UPSERT report
  INSERT INTO public.daily_reports (
    report_date,
    total_sales,
    total_transactions,
    paid_transactions,
    pending_transactions,
    cancelled_transactions,
    expired_transactions,
    average_transaction_value,
    total_items_sold
  ) VALUES (
    target_date,
    total_sales_val,
    total_transactions_val,
    paid_transactions_val,
    pending_transactions_val,
    cancelled_transactions_val,
    expired_transactions_val,
    average_transaction_val,
    total_items_sold_val
  )
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_transactions = EXCLUDED.total_transactions,
    paid_transactions = EXCLUDED.paid_transactions,
    pending_transactions = EXCLUDED.pending_transactions,
    cancelled_transactions = EXCLUDED.cancelled_transactions,
    expired_transactions = EXCLUDED.expired_transactions,
    average_transaction_value = EXCLUDED.average_transaction_value,
    total_items_sold = EXCLUDED.total_items_sold,
    updated_at = NOW()
  RETURNING id INTO report_id;

  RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 5. RLS POLICIES & INDEXES (Standard POS Security)
-- =====================================================================

-- Enforce RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- 5.1 Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5.2 Products Policies
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can modify products" ON public.products FOR ALL
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());

-- 5.3 Inventory Policies
CREATE POLICY "Inventory is viewable by Admins" ON public.inventory_movements FOR SELECT
    USING (public.fn_is_admin());

-- 5.4 Daily Reports Policies
CREATE POLICY "Admins have full access to daily_reports" ON public.daily_reports
  FOR ALL USING (public.fn_is_admin());

CREATE POLICY "Cashiers can read daily_reports" ON public.daily_reports
  FOR SELECT USING (public.fn_is_cashier_or_admin());

CREATE POLICY "Service role can manage daily_reports" ON public.daily_reports
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================================
-- 6. INDEXES for Performance
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports (report_date);

-- =====================================================================
-- 7. PERMISSIONS
-- =====================================================================
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO service_role;

-- =====================================================================
-- MASTER SETUP COMPLETE
-- =====================================================================
