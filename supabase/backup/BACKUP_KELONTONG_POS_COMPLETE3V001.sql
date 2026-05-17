-- =====================================================================
-- KELONTONG POS — COMPLETE SUPABASE DATABASE SETUP
-- Version : 7.1 (Final Merge — v7.0 + Schema Aktual)
-- Target  : Supabase PostgreSQL 15+
-- Author  : SE + DBA + CyberSec (20yr each)
--
-- CHANGELOG dari v7.0 (merge dengan schema aktual):
-- [FIX-1]  customer_debts.remaining     → GENERATED ALWAYS AS (sudah fix)
-- [FIX-2]  shifts.cash_difference       → GENERATED ALWAYS AS (sudah fix)
-- [FIX-3]  profiles.role default        → 'cashier' bukan 'customer'
-- [FIX-4]  products nullable columns    → NOT NULL DEFAULT (sudah fix)
-- [MERGE]  categories: slug, color, sort_order
-- [MERGE]  discounts: code, is_stackable, max_usage, usage_count
-- [MERGE]  discount_eligibility table   → diskon per produk/kategori/varian
-- [MERGE]  customers.total_debt         → denormalized cache
-- [MERGE]  transactions: paid_at, voided_at, voided_by, void_reason
-- [MERGE]  transactions: midtrans_order_id, qris_url, qris_string, qris_expires_at
-- [MERGE]  transaction_items: variant_name, barcode snapshot
-- [MERGE]  product_variants: conversion_qty, min_qty
-- [MERGE]  products: is_consignment, max_stock
-- [MERGE]  cashier_actions: target_id, target_type, pin_verified
-- [MERGE]  settings: category, data_type, is_encrypted grouping
-- [MERGE]  daily_reports: breakdown paid/pending/cancelled/expired/avg
-- [MERGE]  profiles: theme_preference, email
-- [MERGE]  units: symbol alias untuk abbreviation
-- [MERGE]  purchase_orders: invoice_number, paid_amount
-- [KEEP]   Semua fitur v7.0: audit_logs, immutable ledger, CHECK constraints,
--          GENERATED columns, fn_generate_*_code, fn_close_shift,
--          owner/manager/cashier roles, min_selling_price, sku+barcode,
--          loyalty_points, daily report via trigger, BEGIN/COMMIT wrap
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. ENUM TYPES
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'cashier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partial', 'void', 'refunded', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'qris', 'transfer', 'debt', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.action_type AS ENUM (
    'open_shift', 'close_shift', 'void_transaction', 'apply_discount',
    'print_receipt', 'manual_stock_adjust', 'login', 'logout', 'price_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.movement_type AS ENUM (
    'initial', 'sale', 'void_sale', 'purchase_receive', 'adjustment_in',
    'adjustment_out', 'transfer_in', 'transfer_out', 'damage', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reference_type AS ENUM (
    'transaction', 'purchase_order', 'adjustment', 'initial', 'void', 'transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shift_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.debt_status AS ENUM ('outstanding', 'partial', 'paid', 'written_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM ('draft', 'ordered', 'partial', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 3. TABLES
-- =====================================================================

-- ----- profiles -----
-- [MERGE] tambah theme_preference, email dari schema aktual
-- [FIX-3] role default 'cashier' bukan 'customer'
CREATE TABLE IF NOT EXISTS public.profiles (
    id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name          TEXT NOT NULL,
    role               public.user_role NOT NULL DEFAULT 'cashier',
    phone              TEXT,
    email              TEXT UNIQUE,
    avatar_url         TEXT,
    pin_hash           TEXT,
    theme_preference   TEXT NOT NULL DEFAULT 'system'
                           CHECK (theme_preference IN ('light', 'dark', 'system')),
    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  public.profiles IS 'User profiles. owner > manager > cashier hierarchy.';
COMMENT ON COLUMN public.profiles.theme_preference IS 'Preferensi tema UI: light | dark | system.';
COMMENT ON COLUMN public.profiles.email IS 'Denormalisasi dari auth.users untuk kemudahan query.';

-- ----- categories -----
-- [MERGE] tambah slug, color, sort_order dari schema aktual
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    icon        TEXT,
    color       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.categories.slug       IS 'URL-friendly identifier, e.g. "minuman-ringan".';
COMMENT ON COLUMN public.categories.sort_order IS 'Urutan tampil di UI, bisa di-drag-and-drop.';

-- ----- units -----
-- [MERGE] tambah symbol sebagai alias abbreviation (backward compat)
CREATE TABLE IF NOT EXISTS public.units (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL,
    symbol       TEXT GENERATED ALWAYS AS (abbreviation) STORED,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.units.symbol IS 'Alias read-only dari abbreviation untuk backward compatibility.';

-- ----- suppliers -----
CREATE TABLE IF NOT EXISTS public.suppliers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    phone          TEXT,
    email          TEXT,
    address        TEXT,
    contact_person TEXT,
    notes          TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----- products -----
-- [MERGE] tambah is_consignment, max_stock dari schema aktual
-- [FIX-4] NOT NULL pada track_stock, cached_stock, low_stock_threshold
-- [KEEP]  min_selling_price, sku, tax_rate, is_featured dari v7.0
CREATE TABLE IF NOT EXISTS public.products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    unit_id             UUID REFERENCES public.units(id) ON DELETE SET NULL,
    supplier_id         UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    sku                 TEXT UNIQUE,
    barcode             TEXT UNIQUE,
    description         TEXT,
    selling_price       INTEGER NOT NULL DEFAULT 0,
    min_selling_price   INTEGER NOT NULL DEFAULT 0,
    cost_price          INTEGER NOT NULL DEFAULT 0,
    tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    stock               INTEGER NOT NULL DEFAULT 0,
    cached_stock        INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    min_stock           INTEGER NOT NULL DEFAULT 0,
    max_stock           INTEGER,
    track_stock         BOOLEAN NOT NULL DEFAULT true,
    is_consignment      BOOLEAN NOT NULL DEFAULT false,
    has_variants        BOOLEAN NOT NULL DEFAULT false,
    is_featured         BOOLEAN NOT NULL DEFAULT false,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    image_url           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_price_check         CHECK (selling_price >= 0),
    CONSTRAINT products_min_price_check     CHECK (min_selling_price >= 0),
    CONSTRAINT products_cost_check          CHECK (cost_price >= 0),
    CONSTRAINT products_stock_check         CHECK (stock >= 0),
    CONSTRAINT products_cached_stock_check  CHECK (cached_stock >= 0),
    CONSTRAINT products_min_lte_selling     CHECK (min_selling_price <= selling_price),
    CONSTRAINT products_min_stock_check     CHECK (min_stock >= 0),
    CONSTRAINT products_max_stock_check     CHECK (max_stock IS NULL OR max_stock >= min_stock)
);
COMMENT ON COLUMN public.products.min_selling_price IS 'Harga jual minimum — kasir tidak boleh jual di bawah ini.';
COMMENT ON COLUMN public.products.cached_stock      IS 'Sinkronisasi dari inventory_movements untuk performa O(1).';
COMMENT ON COLUMN public.products.is_consignment    IS 'Produk titipan: stok tidak dipotong saat terjual.';
COMMENT ON COLUMN public.products.min_stock         IS 'Stok minimum (alias low_stock_threshold, lebih semantik).';
COMMENT ON COLUMN public.products.max_stock         IS 'Batas kapasitas gudang. NULL = tidak dibatasi.';

-- ----- product_variants -----
-- [MERGE] tambah conversion_qty, min_qty dari schema aktual
CREATE TABLE IF NOT EXISTS public.product_variants (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    sku                TEXT UNIQUE,
    barcode            TEXT UNIQUE,
    selling_price      INTEGER NOT NULL DEFAULT 0,
    cost_price         INTEGER NOT NULL DEFAULT 0,
    inherit_cost_price BOOLEAN NOT NULL DEFAULT false,
    conversion_qty     INTEGER NOT NULL DEFAULT 1,
    min_qty            INTEGER NOT NULL DEFAULT 1,
    stock              INTEGER NOT NULL DEFAULT 0,
    cached_stock       INTEGER NOT NULL DEFAULT 0,
    is_default         BOOLEAN NOT NULL DEFAULT false,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT variants_price_check       CHECK (selling_price >= 0),
    CONSTRAINT variants_stock_check       CHECK (stock >= 0),
    CONSTRAINT variants_conversion_check  CHECK (conversion_qty > 0),
    CONSTRAINT variants_min_qty_check     CHECK (min_qty >= 1)
);
COMMENT ON COLUMN public.product_variants.inherit_cost_price IS 'Jika true, cost_price mengikuti produk induk.';
COMMENT ON COLUMN public.product_variants.conversion_qty     IS 'Konversi ke unit dasar, misal 1 dus = 12 pcs.';
COMMENT ON COLUMN public.product_variants.min_qty            IS 'Kuantitas minimum pembelian varian ini.';

-- ----- discounts -----
-- [MERGE] tambah code, is_stackable, max_usage, usage_count dari schema aktual
CREATE TABLE IF NOT EXISTS public.discounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    code          TEXT UNIQUE,
    type          public.discount_type NOT NULL DEFAULT 'percentage',
    value         NUMERIC(10,2) NOT NULL,
    min_purchase  INTEGER NOT NULL DEFAULT 0,
    max_discount  INTEGER,
    max_usage     INTEGER,
    usage_count   INTEGER NOT NULL DEFAULT 0,
    is_stackable  BOOLEAN NOT NULL DEFAULT false,
    start_date    DATE,
    end_date      DATE,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT discounts_value_check       CHECK (value > 0),
    CONSTRAINT discounts_usage_check       CHECK (usage_count >= 0),
    CONSTRAINT discounts_max_usage_check   CHECK (max_usage IS NULL OR max_usage > 0)
);
COMMENT ON COLUMN public.discounts.code         IS 'Kode promo untuk input manual kasir, e.g. DISKON10.';
COMMENT ON COLUMN public.discounts.is_stackable IS 'Jika true, bisa digabung dengan diskon lain.';
COMMENT ON COLUMN public.discounts.max_usage    IS 'Maksimal total pemakaian promo. NULL = tidak terbatas.';

-- ----- discount_eligibility -----
-- [MERGE] tabel baru dari schema aktual — diskon berlaku untuk produk/kategori/varian tertentu
CREATE TABLE IF NOT EXISTS public.discount_eligibility (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('product', 'category', 'variant', 'all')),
    target_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT eligibility_target_check CHECK (
        (target_type = 'all' AND target_id IS NULL) OR
        (target_type <> 'all' AND target_id IS NOT NULL)
    )
);
COMMENT ON TABLE  public.discount_eligibility IS 'Target berlakunya diskon: produk, kategori, varian, atau semua.';
COMMENT ON COLUMN public.discount_eligibility.target_id IS 'NULL jika target_type = all.';

-- ----- customers -----
-- [MERGE] tambah total_debt (cache), email dari schema aktual
-- [KEEP]  loyalty_points dari v7.0
CREATE TABLE IF NOT EXISTS public.customers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    phone          TEXT UNIQUE,
    email          TEXT,
    address        TEXT,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    total_debt     INTEGER NOT NULL DEFAULT 0,
    notes          TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_loyalty_check    CHECK (loyalty_points >= 0),
    CONSTRAINT customers_total_debt_check CHECK (total_debt >= 0)
);
COMMENT ON COLUMN public.customers.total_debt IS 'Cache total hutang aktif. Di-sync via trigger fn_sync_customer_debt.';

-- ----- shifts -----
-- [FIX-2] cash_difference GENERATED ALWAYS AS
CREATE TABLE IF NOT EXISTS public.shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id      UUID NOT NULL REFERENCES public.profiles(id),
    status          public.shift_status NOT NULL DEFAULT 'open',
    opening_cash    INTEGER NOT NULL DEFAULT 0,
    closing_cash    INTEGER CHECK (closing_cash >= 0),
    expected_cash   INTEGER CHECK (expected_cash >= 0),
    cash_difference INTEGER GENERATED ALWAYS AS (
                        CASE WHEN closing_cash IS NOT NULL AND expected_cash IS NOT NULL
                             THEN closing_cash - expected_cash
                             ELSE NULL END
                    ) STORED,
    notes           TEXT,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shifts_opening_cash_check CHECK (opening_cash >= 0)
);
COMMENT ON COLUMN public.shifts.cash_difference IS 'GENERATED: closing_cash - expected_cash. Positif = lebih, negatif = kurang.';

-- ----- transactions -----
-- [MERGE] tambah paid_at, voided_at, voided_by, void_reason, midtrans fields dari aktual
-- [KEEP]  code, tax_amount, receipt_url dari v7.0
CREATE TABLE IF NOT EXISTS public.transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT UNIQUE,
    cashier_id        UUID REFERENCES public.profiles(id),
    shift_id          UUID REFERENCES public.shifts(id),
    customer_id       UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    discount_id       UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
    status            public.payment_status NOT NULL DEFAULT 'pending',
    payment_method    public.payment_method NOT NULL DEFAULT 'cash',
    subtotal          INTEGER NOT NULL DEFAULT 0,
    discount_amount   INTEGER NOT NULL DEFAULT 0,
    tax_amount        INTEGER NOT NULL DEFAULT 0,
    total_amount      INTEGER NOT NULL DEFAULT 0,
    cash_tendered     INTEGER,
    change_amount     INTEGER NOT NULL DEFAULT 0,
    notes             TEXT,
    receipt_url       TEXT,
    -- Midtrans / QRIS fields [MERGE]
    midtrans_order_id TEXT UNIQUE,
    qris_url          TEXT,
    qris_string       TEXT,
    qris_expires_at   TIMESTAMPTZ,
    -- Void audit fields [MERGE]
    paid_at           TIMESTAMPTZ,
    voided_at         TIMESTAMPTZ,
    voided_by         UUID REFERENCES public.profiles(id),
    void_reason       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_subtotal_check  CHECK (subtotal >= 0),
    CONSTRAINT transactions_total_check     CHECK (total_amount >= 0),
    CONSTRAINT transactions_discount_check  CHECK (discount_amount >= 0),
    CONSTRAINT transactions_tax_check       CHECK (tax_amount >= 0),
    CONSTRAINT transactions_change_check    CHECK (change_amount >= 0),
    CONSTRAINT transactions_integrity_check CHECK (
        total_amount = subtotal - discount_amount + tax_amount
    )
);
COMMENT ON COLUMN public.transactions.midtrans_order_id IS 'Order ID Midtrans untuk QRIS/transfer.';
COMMENT ON COLUMN public.transactions.paid_at           IS 'Timestamp saat transaksi berstatus paid.';
COMMENT ON COLUMN public.transactions.voided_by         IS 'Siapa yang void — untuk audit trail.';

-- ----- transaction_items -----
-- [MERGE] tambah variant_name, barcode snapshot dari schema aktual
-- [KEEP]  gross_profit GENERATED dari v7.0
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id      UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name    TEXT NOT NULL,
    variant_name    TEXT,
    barcode         TEXT,
    quantity        INTEGER NOT NULL,
    unit_price      INTEGER NOT NULL,
    cost_price      INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    discount_id     UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
    total_price     INTEGER NOT NULL,
    gross_profit    INTEGER GENERATED ALWAYS AS (total_price - (cost_price * quantity)) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tx_items_qty_check    CHECK (quantity > 0),
    CONSTRAINT tx_items_price_check  CHECK (unit_price >= 0),
    CONSTRAINT tx_items_total_check  CHECK (total_price >= 0),
    CONSTRAINT tx_items_disc_check   CHECK (discount_amount >= 0)
);
COMMENT ON COLUMN public.transaction_items.product_name IS 'Snapshot nama produk saat transaksi terjadi.';
COMMENT ON COLUMN public.transaction_items.variant_name IS 'Snapshot nama varian saat transaksi terjadi.';
COMMENT ON COLUMN public.transaction_items.barcode      IS 'Snapshot barcode saat transaksi terjadi.';
COMMENT ON COLUMN public.transaction_items.gross_profit IS 'GENERATED: total_price - (cost_price * quantity).';

-- ----- purchase_orders -----
-- [MERGE] tambah invoice_number, paid_amount dari schema aktual
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number       TEXT UNIQUE,
    supplier_id     UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    ordered_by      UUID REFERENCES public.profiles(id),
    received_by     UUID REFERENCES public.profiles(id),
    status          public.purchase_status NOT NULL DEFAULT 'draft',
    invoice_number  TEXT,
    total_amount    INTEGER NOT NULL DEFAULT 0,
    paid_amount     INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    ordered_at      TIMESTAMPTZ,
    expected_at     TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT po_total_check  CHECK (total_amount >= 0),
    CONSTRAINT po_paid_check   CHECK (paid_amount >= 0),
    CONSTRAINT po_paid_lte     CHECK (paid_amount <= total_amount)
);
COMMENT ON COLUMN public.purchase_orders.invoice_number IS 'Nomor faktur dari supplier.';
COMMENT ON COLUMN public.purchase_orders.paid_amount    IS 'Sudah dibayar ke supplier.';

-- ----- purchase_order_items -----
-- [KEEP] total_cost GENERATED dari v7.0
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id      UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name    TEXT NOT NULL,
    barcode         TEXT,
    ordered_qty     INTEGER NOT NULL DEFAULT 0,
    received_qty    INTEGER NOT NULL DEFAULT 0,
    unit_cost       INTEGER NOT NULL DEFAULT 0,
    total_cost      INTEGER GENERATED ALWAYS AS (received_qty * unit_cost) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT po_items_ordered_check   CHECK (ordered_qty >= 0),
    CONSTRAINT po_items_received_check  CHECK (received_qty >= 0),
    CONSTRAINT po_items_cost_check      CHECK (unit_cost >= 0)
);

-- ----- inventory_movements (IMMUTABLE LEDGER) -----
-- [KEEP] semua dari v7.0 + total_cost GENERATED
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id      UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    movement_type   public.movement_type NOT NULL,
    reference_type  public.reference_type NOT NULL,
    reference_id    UUID,
    qty_before      INTEGER NOT NULL,
    qty_change      INTEGER NOT NULL,
    qty_after       INTEGER NOT NULL,
    unit_cost       INTEGER NOT NULL DEFAULT 0,
    total_cost      INTEGER GENERATED ALWAYS AS (ABS(qty_change) * unit_cost) STORED,
    notes           TEXT,
    created_by      UUID REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inv_mov_qty_check      CHECK (qty_after = qty_before + qty_change),
    CONSTRAINT inv_mov_after_nn_check CHECK (qty_after >= 0)
);
COMMENT ON TABLE public.inventory_movements IS 'IMMUTABLE ledger stok. Tidak boleh UPDATE atau DELETE.';

-- ----- stock_movements (simplified log) -----
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id      UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    movement_type   public.movement_type NOT NULL,
    reference_type  public.reference_type NOT NULL,
    reference_id    UUID,
    qty_before      INTEGER NOT NULL,
    qty_change      INTEGER NOT NULL,
    qty_after       INTEGER NOT NULL,
    unit_cost       NUMERIC DEFAULT 0,
    notes           TEXT,
    created_by      UUID REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----- customer_debts -----
-- [FIX-1] remaining GENERATED ALWAYS AS STORED
CREATE TABLE IF NOT EXISTS public.customer_debts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    transaction_id  UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    cashier_id      UUID REFERENCES public.profiles(id),
    amount          INTEGER NOT NULL,
    paid_amount     INTEGER NOT NULL DEFAULT 0,
    remaining       INTEGER GENERATED ALWAYS AS (amount - paid_amount) STORED,
    status          public.debt_status NOT NULL DEFAULT 'outstanding',
    due_date        DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT debts_amount_check           CHECK (amount > 0),
    CONSTRAINT debts_paid_check             CHECK (paid_amount >= 0),
    CONSTRAINT debts_paid_lte_amount_check  CHECK (paid_amount <= amount)
);
COMMENT ON COLUMN public.customer_debts.remaining IS 'GENERATED ALWAYS: amount - paid_amount. Selalu akurat.';

-- ----- debt_payments -----
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id         UUID NOT NULL REFERENCES public.customer_debts(id) ON DELETE RESTRICT,
    cashier_id      UUID REFERENCES public.profiles(id),
    amount          INTEGER NOT NULL,
    payment_method  public.payment_method NOT NULL DEFAULT 'cash',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT debt_payments_amount_check CHECK (amount > 0)
);

-- ----- cashier_actions -----
-- [MERGE] tambah target_id, target_type, pin_verified dari schema aktual
CREATE TABLE IF NOT EXISTS public.cashier_actions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id   UUID REFERENCES public.profiles(id),
    shift_id     UUID REFERENCES public.shifts(id),
    action_type  public.action_type NOT NULL,
    target_id    TEXT,
    target_type  TEXT,
    pin_verified BOOLEAN NOT NULL DEFAULT false,
    notes        TEXT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.cashier_actions.pin_verified IS 'Apakah aksi ini memerlukan verifikasi PIN yang sudah divalidasi.';
COMMENT ON COLUMN public.cashier_actions.target_id    IS 'ID string entitas yang di-action (UUID atau string).';
COMMENT ON COLUMN public.cashier_actions.target_type  IS 'Jenis entitas: transaction, product, shift, dll.';

-- ----- settings -----
-- [MERGE] tambah category, data_type, is_encrypted dari schema aktual
CREATE TABLE IF NOT EXISTS public.settings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category     TEXT NOT NULL DEFAULT 'general',
    key          TEXT NOT NULL UNIQUE,
    value        TEXT,
    description  TEXT,
    data_type    TEXT NOT NULL DEFAULT 'string'
                     CHECK (data_type IN ('string', 'boolean', 'integer', 'json')),
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.settings.category     IS 'Grup setting: store, payment, stock, shift, loyalty, dll.';
COMMENT ON COLUMN public.settings.is_encrypted IS 'Jika true, value disimpan terenkripsi di aplikasi.';

-- ----- daily_reports -----
-- [MERGE] tambah breakdown per status, avg_transaction dari schema aktual
-- [KEEP]  gross_profit GENERATED, revenue detail dari v7.0
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date             DATE NOT NULL UNIQUE,
    -- Transaction counts [MERGE]
    total_transactions      INTEGER NOT NULL DEFAULT 0,
    paid_transactions       INTEGER NOT NULL DEFAULT 0,
    pending_transactions    INTEGER NOT NULL DEFAULT 0,
    cancelled_transactions  INTEGER NOT NULL DEFAULT 0,
    expired_transactions    INTEGER NOT NULL DEFAULT 0,
    total_items_sold        INTEGER NOT NULL DEFAULT 0,
    avg_transaction_value   BIGINT NOT NULL DEFAULT 0,
    -- Revenue breakdown
    total_revenue           BIGINT NOT NULL DEFAULT 0,
    total_cogs              BIGINT NOT NULL DEFAULT 0,
    gross_profit            BIGINT GENERATED ALWAYS AS (total_revenue - total_cogs) STORED,
    total_discount          BIGINT NOT NULL DEFAULT 0,
    total_tax               BIGINT NOT NULL DEFAULT 0,
    -- Revenue by payment method
    cash_revenue            BIGINT NOT NULL DEFAULT 0,
    qris_revenue            BIGINT NOT NULL DEFAULT 0,
    transfer_revenue        BIGINT NOT NULL DEFAULT 0,
    debt_revenue            BIGINT NOT NULL DEFAULT 0,
    debt_collected          BIGINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.daily_reports.gross_profit IS 'GENERATED: total_revenue - total_cogs.';

-- ----- audit_logs -----
-- [KEEP] dari v7.0
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT NOT NULL,
    record_id   UUID NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    user_id     UUID REFERENCES public.profiles(id),
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  public.audit_logs IS 'Immutable audit trail. IP & user_agent diisi via set_config dari aplikasi.';
COMMENT ON COLUMN public.audit_logs.ip_address IS
    'Isi dari app sebelum query: SELECT set_config(''app.client_ip'', $ip, true)';

-- =====================================================================
-- 4. INDEXES
-- =====================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active       ON public.profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON public.profiles(email);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_slug       ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active     ON public.categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_sort       ON public.categories(sort_order);

-- products
CREATE INDEX IF NOT EXISTS idx_products_category     ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_unit         ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier     ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode      ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku          ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active       ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured     ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_consignment  ON public.products(is_consignment) WHERE is_consignment = true;
CREATE INDEX IF NOT EXISTS idx_products_low_stock    ON public.products(cached_stock, low_stock_threshold)
    WHERE track_stock = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm    ON public.products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm     ON public.products USING gin(sku gin_trgm_ops);

-- product_variants
CREATE INDEX IF NOT EXISTS idx_variants_product      ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_barcode      ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_sku          ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_default      ON public.product_variants(product_id) WHERE is_default = true;

-- discounts
CREATE INDEX IF NOT EXISTS idx_discounts_code        ON public.discounts(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_active      ON public.discounts(is_active) WHERE is_active = true;

-- discount_eligibility
CREATE INDEX IF NOT EXISTS idx_eligibility_discount  ON public.discount_eligibility(discount_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_target    ON public.discount_eligibility(target_type, target_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm   ON public.customers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_active      ON public.customers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_debt        ON public.customers(total_debt) WHERE total_debt > 0;

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_cashier        ON public.shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status         ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_open           ON public.shifts(cashier_id) WHERE status = 'open';

-- transactions
CREATE INDEX IF NOT EXISTS idx_tx_code               ON public.transactions(code);
CREATE INDEX IF NOT EXISTS idx_tx_cashier            ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_tx_shift              ON public.transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_tx_customer           ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_tx_status             ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_paid_at            ON public.transactions(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_voided_at          ON public.transactions(voided_at) WHERE voided_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_midtrans           ON public.transactions(midtrans_order_id) WHERE midtrans_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_qris_expires       ON public.transactions(qris_expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tx_created_at         ON public.transactions(created_at DESC);

-- transaction_items
CREATE INDEX IF NOT EXISTS idx_tx_items_tx           ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_product      ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_barcode      ON public.transaction_items(barcode) WHERE barcode IS NOT NULL;

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_supplier           ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status             ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number             ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_invoice            ON public.purchase_orders(invoice_number) WHERE invoice_number IS NOT NULL;

-- purchase_order_items
CREATE INDEX IF NOT EXISTS idx_po_items_po           ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product      ON public.purchase_order_items(product_id);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_inv_product           ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_variant           ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_ref               ON public.inventory_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_type              ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inv_created           ON public.inventory_movements(created_at DESC);

-- customer_debts
CREATE INDEX IF NOT EXISTS idx_debts_customer        ON public.customer_debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status          ON public.customer_debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_outstanding     ON public.customer_debts(customer_id)
    WHERE status IN ('outstanding', 'partial');
CREATE INDEX IF NOT EXISTS idx_debts_due_date        ON public.customer_debts(due_date)
    WHERE due_date IS NOT NULL AND status IN ('outstanding', 'partial');

-- debt_payments
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt    ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_cashier ON public.debt_payments(cashier_id);

-- cashier_actions
CREATE INDEX IF NOT EXISTS idx_actions_cashier       ON public.cashier_actions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_actions_shift         ON public.cashier_actions(shift_id);
CREATE INDEX IF NOT EXISTS idx_actions_type          ON public.cashier_actions(action_type);

-- settings
CREATE INDEX IF NOT EXISTS idx_settings_category     ON public.settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key          ON public.settings(key);

-- daily_reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_date    ON public.daily_reports(report_date DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_table           ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record          ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user            ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created         ON public.audit_logs(created_at DESC);

-- =====================================================================
-- 5. FUNCTIONS
-- =====================================================================

-- ---- Generic: updated_at ----
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

-- ---- Role helpers ----
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(public.fn_get_user_role() = 'owner', false);
$$;

CREATE OR REPLACE FUNCTION public.fn_is_owner_or_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(public.fn_get_user_role() IN ('owner', 'manager'), false);
$$;

CREATE OR REPLACE FUNCTION public.fn_is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(public.fn_get_user_role() IN ('owner', 'manager', 'cashier'), false);
$$;

-- ---- Auto create profile on signup ----
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role public.user_role;
BEGIN
    -- User pertama otomatis jadi owner
    IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
        v_role := 'owner';
    ELSE
        v_role := COALESCE(
            (NEW.raw_user_meta_data->>'role')::public.user_role,
            'cashier'
        );
    END IF;

    INSERT INTO public.profiles (id, full_name, role, phone, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        v_role,
        NEW.raw_user_meta_data->>'phone',
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- ---- PIN management ----
CREATE OR REPLACE FUNCTION public.fn_set_pin(p_pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    UPDATE public.profiles
    SET pin_hash = crypt(p_pin, gen_salt('bf'))
    WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_verify_pin(p_pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hash TEXT;
BEGIN
    SELECT pin_hash INTO v_hash FROM public.profiles WHERE id = auth.uid();
    IF v_hash IS NULL THEN RETURN false; END IF;
    RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

-- ---- Generate unique codes ----
CREATE OR REPLACE FUNCTION public.fn_generate_transaction_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_date TEXT;
    v_seq  INTEGER;
BEGIN
    v_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(RIGHT(code, 4) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.transactions
    WHERE code LIKE 'TRX-' || v_date || '-%';
    RETURN 'TRX-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_generate_po_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_month TEXT;
    v_seq   INTEGER;
BEGIN
    v_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMM');
    SELECT COALESCE(MAX(CAST(RIGHT(po_number, 4) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.purchase_orders
    WHERE po_number LIKE 'PO-' || v_month || '-%';
    RETURN 'PO-' || v_month || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ---- Category slug generator ----
CREATE OR REPLACE FUNCTION public.fn_generate_slug(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(p_text), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
$$;

-- ---- STOCK MANAGEMENT: CORE LEDGER ----

-- Block direct stock update (kecuali via session flag)
CREATE OR REPLACE FUNCTION public.fn_block_direct_stock_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stock IS DISTINCT FROM OLD.stock OR
       NEW.cached_stock IS DISTINCT FROM OLD.cached_stock THEN
        IF current_setting('app.allow_stock_update', true) <> 'true' THEN
            RAISE EXCEPTION
                'Direct stock manipulation prohibited. Use inventory_movements. (product: %)', OLD.id
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Main ledger processor: FOR UPDATE row lock + session flag pattern
CREATE OR REPLACE FUNCTION public.fn_process_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_product public.products%ROWTYPE;
BEGIN
    -- Kunci baris produk untuk mencegah race condition / overselling
    SELECT * INTO v_product
    FROM public.products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found', NEW.product_id;
    END IF;

    -- Cek stok cukup (kecuali konsinyasi)
    IF v_product.track_stock AND NOT v_product.is_consignment
       AND (v_product.cached_stock + NEW.qty_change) < 0 THEN
        RAISE EXCEPTION
            'Insufficient stock for "%". Current: %, Requested change: %',
            v_product.name, v_product.cached_stock, NEW.qty_change
            USING ERRCODE = 'P0002';
    END IF;

    -- Set qty_before/after dari cached_stock aktual
    NEW.qty_before := v_product.cached_stock;
    NEW.qty_after  := v_product.cached_stock + NEW.qty_change;

    -- Set flag untuk mengizinkan update stok
    PERFORM set_config('app.allow_stock_update', 'true', true);

    UPDATE public.products
    SET stock        = NEW.qty_after,
        cached_stock = NEW.qty_after,
        updated_at   = NOW()
    WHERE id = NEW.product_id;

    -- Reset flag
    PERFORM set_config('app.allow_stock_update', 'false', true);

    NEW.created_by := COALESCE(
        NEW.created_by,
        auth.uid(),
        (SELECT id FROM public.profiles WHERE role = 'owner' LIMIT 1)
    );

    RETURN NEW;
END;
$$;

-- Immutable ledger: blokir UPDATE dan DELETE
CREATE OR REPLACE FUNCTION public.fn_lock_inventory_movements()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'inventory_movements is IMMUTABLE. Cannot % records. Create a corrective entry instead.',
        TG_OP USING ERRCODE = 'P0003';
END;
$$;

-- Stok awal saat produk dibuat
CREATE OR REPLACE FUNCTION public.fn_record_initial_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_user_id UUID;
BEGIN
    IF NEW.stock > 0 THEN
        v_user_id := COALESCE(
            auth.uid(),
            (SELECT id FROM public.profiles WHERE role = 'owner' LIMIT 1)
        );
        INSERT INTO public.inventory_movements (
            product_id, movement_type, reference_type,
            qty_change, unit_cost, notes, created_by
        ) VALUES (
            NEW.id, 'initial', 'initial',
            NEW.stock, NEW.cost_price,
            'Stok awal: ' || NEW.name, v_user_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Kurangi stok saat transaksi paid
CREATE OR REPLACE FUNCTION public.fn_deduct_stock_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_item RECORD;
BEGIN
    IF OLD.status <> 'paid' AND NEW.status = 'paid' THEN
        FOR v_item IN
            SELECT * FROM public.transaction_items WHERE transaction_id = NEW.id
        LOOP
            IF EXISTS (
                SELECT 1 FROM public.products
                WHERE id = v_item.product_id
                  AND track_stock = true
                  AND is_consignment = false
            ) THEN
                INSERT INTO public.inventory_movements (
                    product_id, variant_id, movement_type, reference_type,
                    reference_id, qty_change, unit_cost, notes, created_by
                ) VALUES (
                    v_item.product_id, v_item.variant_id, 'sale', 'transaction',
                    NEW.id, -v_item.quantity, v_item.cost_price,
                    'Penjualan: ' || NEW.code, NEW.cashier_id
                );
            END IF;
        END LOOP;

        -- Set paid_at timestamp
        NEW.paid_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Kembalikan stok saat void
CREATE OR REPLACE FUNCTION public.fn_return_stock_on_void()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_item RECORD;
BEGIN
    IF OLD.status = 'paid' AND NEW.status = 'void' THEN
        FOR v_item IN
            SELECT * FROM public.transaction_items WHERE transaction_id = NEW.id
        LOOP
            IF EXISTS (
                SELECT 1 FROM public.products
                WHERE id = v_item.product_id
                  AND track_stock = true
                  AND is_consignment = false
            ) THEN
                INSERT INTO public.inventory_movements (
                    product_id, variant_id, movement_type, reference_type,
                    reference_id, qty_change, unit_cost, notes, created_by
                ) VALUES (
                    v_item.product_id, v_item.variant_id, 'void_sale', 'void',
                    NEW.id, v_item.quantity, v_item.cost_price,
                    'Void: ' || NEW.code, NEW.voided_by
                );
            END IF;
        END LOOP;

        -- Set voided_at timestamp
        NEW.voided_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Tambah stok saat PO received
CREATE OR REPLACE FUNCTION public.fn_add_stock_on_purchase_received()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_item RECORD;
BEGIN
    IF OLD.status <> 'received' AND NEW.status = 'received' THEN
        FOR v_item IN
            SELECT * FROM public.purchase_order_items WHERE po_id = NEW.id
        LOOP
            IF v_item.received_qty > 0 AND v_item.product_id IS NOT NULL THEN
                INSERT INTO public.inventory_movements (
                    product_id, variant_id, movement_type, reference_type,
                    reference_id, qty_change, unit_cost, notes, created_by
                ) VALUES (
                    v_item.product_id, v_item.variant_id,
                    'purchase_receive', 'purchase_order',
                    NEW.id, v_item.received_qty, v_item.unit_cost,
                    'PO received: ' || NEW.po_number, NEW.received_by
                );
            END IF;
        END LOOP;

        NEW.received_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Admin adjustment RPC
CREATE OR REPLACE FUNCTION public.fn_adjust_stock(
    p_product_id UUID,
    p_qty_change INTEGER,
    p_movement   public.movement_type DEFAULT 'adjustment_in',
    p_notes      TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    IF NOT public.fn_is_owner_or_manager() THEN
        RAISE EXCEPTION 'Permission denied. Only owner or manager can adjust stock.';
    END IF;
    INSERT INTO public.inventory_movements (
        product_id, movement_type, reference_type, qty_change, notes, created_by
    ) VALUES (
        p_product_id, p_movement, 'adjustment', p_qty_change,
        COALESCE(p_notes, 'Manual adjustment by ' || public.fn_get_user_role()::TEXT),
        auth.uid()
    )
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- ---- Product functions ----
CREATE OR REPLACE FUNCTION public.fn_ensure_single_default_variant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.product_variants
        SET is_default = false
        WHERE product_id = NEW.product_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_variant_cost_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.inherit_cost_price = true THEN
        NEW.cost_price := (SELECT cost_price FROM public.products WHERE id = NEW.product_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_deactivate_category_products()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        UPDATE public.products SET is_active = false WHERE category_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Auto-generate slug untuk kategori
CREATE OR REPLACE FUNCTION public.fn_auto_slug_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.fn_generate_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$;

-- ---- Transaction functions ----
CREATE OR REPLACE FUNCTION public.fn_set_transaction_cashier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_shift_id UUID;
BEGIN
    IF NEW.cashier_id IS NULL THEN
        NEW.cashier_id := auth.uid();
    END IF;
    IF NEW.shift_id IS NULL THEN
        SELECT id INTO v_shift_id
        FROM public.shifts
        WHERE cashier_id = NEW.cashier_id AND status = 'open'
        LIMIT 1;
        NEW.shift_id := v_shift_id;
    END IF;
    IF NEW.code IS NULL THEN
        NEW.code := public.fn_generate_transaction_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalculate_transaction_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_subtotal INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_subtotal
    FROM public.transaction_items
    WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    UPDATE public.transactions
    SET subtotal     = v_subtotal,
        total_amount = v_subtotal
                       - COALESCE(discount_amount, 0)
                       + COALESCE(tax_amount, 0),
        updated_at   = NOW()
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id)
      AND status = 'pending';

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_prevent_paid_tx_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status public.payment_status;
BEGIN
    SELECT status INTO v_status FROM public.transactions WHERE id = NEW.transaction_id;
    IF v_status NOT IN ('pending') THEN
        RAISE EXCEPTION 'Cannot modify items of a % transaction', v_status;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_prevent_unpay_transaction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'paid' AND NEW.status = 'pending' THEN
        RAISE EXCEPTION 'Cannot revert a paid transaction to pending';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_transaction_void()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'paid' AND NEW.status = 'void' THEN
        INSERT INTO public.cashier_actions
            (cashier_id, shift_id, action_type, target_id, target_type, metadata)
        VALUES (
            COALESCE(NEW.voided_by, NEW.cashier_id),
            NEW.shift_id,
            'void_transaction',
            NEW.id::TEXT,
            'transaction',
            jsonb_build_object(
                'transaction_id', NEW.id,
                'code',           NEW.code,
                'amount',         NEW.total_amount,
                'void_reason',    NEW.void_reason
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Increment discount usage_count saat dipakai
CREATE OR REPLACE FUNCTION public.fn_increment_discount_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status <> 'paid' AND NEW.discount_id IS NOT NULL THEN
        UPDATE public.discounts
        SET usage_count = usage_count + 1
        WHERE id = NEW.discount_id;
    END IF;
    RETURN NEW;
END;
$$;

-- ---- Close shift RPC ----
CREATE OR REPLACE FUNCTION public.fn_close_shift(
    p_shift_id     UUID,
    p_closing_cash INTEGER,
    p_notes        TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_expected INTEGER;
    v_shift    public.shifts%ROWTYPE;
BEGIN
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift % not found', p_shift_id;
    END IF;
    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Shift % is already %', p_shift_id, v_shift.status;
    END IF;
    IF NOT (public.fn_is_owner_or_manager() OR v_shift.cashier_id = auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied. You can only close your own shift.';
    END IF;

    -- Hitung expected_cash: modal awal + semua penerimaan tunai
    SELECT v_shift.opening_cash + COALESCE(SUM(
        CASE t.payment_method WHEN 'cash' THEN t.total_amount ELSE 0 END
    ), 0)
    INTO v_expected
    FROM public.transactions t
    WHERE t.shift_id = p_shift_id AND t.status = 'paid';

    UPDATE public.shifts
    SET status        = 'closed',
        closing_cash  = p_closing_cash,
        expected_cash = v_expected,
        notes         = p_notes,
        closed_at     = NOW(),
        updated_at    = NOW()
    WHERE id = p_shift_id;

    INSERT INTO public.cashier_actions
        (cashier_id, shift_id, action_type, target_id, target_type, metadata)
    VALUES (
        auth.uid(), p_shift_id, 'close_shift',
        p_shift_id::TEXT, 'shift',
        jsonb_build_object(
            'closing_cash',  p_closing_cash,
            'expected_cash', v_expected,
            'difference',    p_closing_cash - v_expected
        )
    );

    RETURN jsonb_build_object(
        'success',       true,
        'shift_id',      p_shift_id,
        'expected_cash', v_expected,
        'closing_cash',  p_closing_cash,
        'difference',    p_closing_cash - v_expected
    );
END;
$$;

-- ---- Debt management ----
CREATE OR REPLACE FUNCTION public.fn_update_debt_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.paid_amount = 0 THEN
        NEW.status := 'outstanding';
    ELSIF NEW.paid_amount < NEW.amount THEN
        NEW.status := 'partial';
    ELSIF NEW.paid_amount >= NEW.amount THEN
        NEW.status := 'paid';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_debt_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_debt public.customer_debts%ROWTYPE;
BEGIN
    SELECT * INTO v_debt FROM public.customer_debts WHERE id = NEW.debt_id FOR UPDATE;

    IF (v_debt.paid_amount + NEW.amount) > v_debt.amount THEN
        RAISE EXCEPTION
            'Payment % exceeds remaining debt % for customer debt %',
            NEW.amount, (v_debt.amount - v_debt.paid_amount), v_debt.id;
    END IF;

    UPDATE public.customer_debts
    SET paid_amount = paid_amount + NEW.amount,
        updated_at  = NOW()
    WHERE id = NEW.debt_id;

    RETURN NEW;
END;
$$;

-- Sync total_debt di customers setelah pembayaran
CREATE OR REPLACE FUNCTION public.fn_sync_customer_total_debt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_customer_id UUID;
BEGIN
    v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
    IF v_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_debt = COALESCE((
            SELECT SUM(amount - paid_amount)
            FROM public.customer_debts
            WHERE customer_id = v_customer_id
              AND status IN ('outstanding', 'partial')
        ), 0),
        updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---- Shift management ----
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_open_shift()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'open' THEN
        IF EXISTS (
            SELECT 1 FROM public.shifts
            WHERE cashier_id = NEW.cashier_id
              AND status = 'open'
              AND id <> NEW.id
        ) THEN
            RAISE EXCEPTION 'Cashier already has an open shift. Close it first.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ---- Daily report auto-updater ----
CREATE OR REPLACE FUNCTION public.fn_update_daily_report()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_date DATE;
BEGIN
    v_date := (COALESCE(NEW.updated_at, OLD.updated_at, NOW()) AT TIME ZONE 'Asia/Jakarta')::DATE;

    INSERT INTO public.daily_reports (
        report_date,
        total_transactions,
        paid_transactions,
        pending_transactions,
        cancelled_transactions,
        expired_transactions,
        total_items_sold,
        avg_transaction_value,
        total_revenue,
        total_cogs,
        total_discount,
        total_tax,
        cash_revenue,
        qris_revenue,
        transfer_revenue,
        debt_revenue
    )
    SELECT
        v_date,
        COUNT(*)                                                                           AS total_transactions,
        COUNT(*) FILTER (WHERE status = 'paid')                                           AS paid_transactions,
        COUNT(*) FILTER (WHERE status = 'pending')                                        AS pending_transactions,
        COUNT(*) FILTER (WHERE status = 'void')                                           AS cancelled_transactions,
        COUNT(*) FILTER (WHERE status = 'expired')                                        AS expired_transactions,
        COALESCE(SUM(
            (SELECT COALESCE(SUM(quantity),0) FROM public.transaction_items ti
             WHERE ti.transaction_id = t.id AND t.status = 'paid')
        ), 0)                                                                              AS total_items_sold,
        COALESCE(
            SUM(total_amount) FILTER (WHERE status = 'paid') /
            NULLIF(COUNT(*) FILTER (WHERE status = 'paid'), 0),
        0)                                                                                 AS avg_transaction_value,
        COALESCE(SUM(total_amount)    FILTER (WHERE status = 'paid'), 0)                  AS total_revenue,
        COALESCE((SELECT SUM(ti.cost_price * ti.quantity)
                  FROM public.transaction_items ti
                  JOIN public.transactions t2 ON t2.id = ti.transaction_id
                  WHERE t2.status = 'paid'
                    AND (t2.updated_at AT TIME ZONE 'Asia/Jakarta')::DATE = v_date), 0)   AS total_cogs,
        COALESCE(SUM(discount_amount) FILTER (WHERE status = 'paid'), 0)                  AS total_discount,
        COALESCE(SUM(tax_amount)      FILTER (WHERE status = 'paid'), 0)                  AS total_tax,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND payment_method='cash'),     0) AS cash_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND payment_method='qris'),     0) AS qris_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND payment_method='transfer'), 0) AS transfer_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND payment_method='debt'),     0) AS debt_revenue
    FROM public.transactions t
    WHERE (updated_at AT TIME ZONE 'Asia/Jakarta')::DATE = v_date

    ON CONFLICT (report_date) DO UPDATE SET
        total_transactions     = EXCLUDED.total_transactions,
        paid_transactions      = EXCLUDED.paid_transactions,
        pending_transactions   = EXCLUDED.pending_transactions,
        cancelled_transactions = EXCLUDED.cancelled_transactions,
        expired_transactions   = EXCLUDED.expired_transactions,
        total_items_sold       = EXCLUDED.total_items_sold,
        avg_transaction_value  = EXCLUDED.avg_transaction_value,
        total_revenue          = EXCLUDED.total_revenue,
        total_cogs             = EXCLUDED.total_cogs,
        total_discount         = EXCLUDED.total_discount,
        total_tax              = EXCLUDED.total_tax,
        cash_revenue           = EXCLUDED.cash_revenue,
        qris_revenue           = EXCLUDED.qris_revenue,
        transfer_revenue       = EXCLUDED.transfer_revenue,
        debt_revenue           = EXCLUDED.debt_revenue,
        updated_at             = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---- Audit log writer ----
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_ip  INET;
    v_ua  TEXT;
    v_rid UUID;
BEGIN
    v_ip  := nullif(current_setting('app.client_ip',   true), '')::INET;
    v_ua  :=        current_setting('app.user_agent',  true);

    v_rid := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

    INSERT INTO public.audit_logs
        (table_name, record_id, action, old_data, new_data, user_id, ip_address, user_agent)
    VALUES (
        TG_TABLE_NAME,
        v_rid,
        TG_OP,
        CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        v_ip,
        v_ua
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---- Full-text product search ----
CREATE OR REPLACE FUNCTION public.fn_search_products(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id            UUID,
    name          TEXT,
    sku           TEXT,
    barcode       TEXT,
    selling_price INTEGER,
    cached_stock  INTEGER,
    similarity    REAL
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id, p.name, p.sku, p.barcode, p.selling_price, p.cached_stock,
           GREATEST(
               similarity(p.name,                    p_query),
               similarity(COALESCE(p.sku,    ''),    p_query),
               similarity(COALESCE(p.barcode,''),    p_query)
           ) AS similarity
    FROM public.products p
    WHERE p.is_active = true
      AND (
          p.name    ILIKE '%' || p_query || '%' OR
          p.sku     ILIKE '%' || p_query || '%' OR
          p.barcode ILIKE '%' || p_query || '%' OR
          p.name    % p_query
      )
    ORDER BY similarity DESC, p.name
    LIMIT p_limit;
$$;

-- ---- Sales report ----
CREATE OR REPLACE FUNCTION public.fn_sales_report(
    p_from TIMESTAMPTZ,
    p_to   TIMESTAMPTZ
)
RETURNS TABLE (
    date         DATE,
    transactions BIGINT,
    revenue      BIGINT,
    cogs         BIGINT,
    gross_profit BIGINT,
    discount     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        (t.paid_at AT TIME ZONE 'Asia/Jakarta')::DATE AS date,
        COUNT(*)                                       AS transactions,
        SUM(t.total_amount)                           AS revenue,
        SUM(c.cogs)                                   AS cogs,
        SUM(t.total_amount) - SUM(c.cogs)            AS gross_profit,
        SUM(t.discount_amount)                        AS discount
    FROM public.transactions t
    JOIN LATERAL (
        SELECT COALESCE(SUM(cost_price * quantity), 0) AS cogs
        FROM public.transaction_items
        WHERE transaction_id = t.id
    ) c ON true
    WHERE t.status = 'paid'
      AND t.paid_at BETWEEN p_from AND p_to
    GROUP BY (t.paid_at AT TIME ZONE 'Asia/Jakarta')::DATE
    ORDER BY date;
$$;

-- =====================================================================
-- 6. TRIGGERS
-- =====================================================================

-- Auto updated_at (14 tabel)
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
    'profiles','categories','suppliers','products','product_variants',
    'discounts','customers','shifts','transactions','purchase_orders',
    'purchase_order_items','customer_debts','settings','daily_reports'
]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s', t, t);
    EXECUTE format(
        'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%s
         FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()', t, t
    );
END LOOP; END $$;

-- Auth: auto create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- Categories: auto slug
DROP TRIGGER IF EXISTS trg_categories_auto_slug ON public.categories;
CREATE TRIGGER trg_categories_auto_slug
    BEFORE INSERT OR UPDATE OF name ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_auto_slug_category();

-- Categories: cascade deactivate products
DROP TRIGGER IF EXISTS trg_categories_deactivate_products ON public.categories;
CREATE TRIGGER trg_categories_deactivate_products
    AFTER UPDATE OF is_active ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_deactivate_category_products();

-- Products: block direct stock update
DROP TRIGGER IF EXISTS trg_block_direct_stock_update ON public.products;
CREATE TRIGGER trg_block_direct_stock_update
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_block_direct_stock_update();

-- Products: initial stock entry
DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
    AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_record_initial_stock();

-- Product variants: single default
DROP TRIGGER IF EXISTS trg_variants_single_default ON public.product_variants;
CREATE TRIGGER trg_variants_single_default
    BEFORE INSERT OR UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_single_default_variant();

-- Product variants: sync cost price
DROP TRIGGER IF EXISTS trg_variants_sync_cost_price ON public.product_variants;
CREATE TRIGGER trg_variants_sync_cost_price
    BEFORE INSERT OR UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_variant_cost_price();

-- Inventory movements: main ledger processor
DROP TRIGGER IF EXISTS trg_inventory_movement_process ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movement_process
    BEFORE INSERT ON public.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_process_inventory_movement();

-- Inventory movements: immutable ledger lock
DROP TRIGGER IF EXISTS trg_lock_inventory_movements ON public.inventory_movements;
CREATE TRIGGER trg_lock_inventory_movements
    BEFORE UPDATE OR DELETE ON public.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_lock_inventory_movements();

-- Transactions: auto set cashier + code
DROP TRIGGER IF EXISTS trg_transactions_set_cashier ON public.transactions;
CREATE TRIGGER trg_transactions_set_cashier
    BEFORE INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_transaction_cashier();

-- Transactions: prevent downgrade status dari paid
DROP TRIGGER IF EXISTS trg_transactions_prevent_unpay ON public.transactions;
CREATE TRIGGER trg_transactions_prevent_unpay
    BEFORE UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_unpay_transaction();

-- Transactions: deduct stock saat paid (+ set paid_at)
DROP TRIGGER IF EXISTS trg_transactions_deduct_stock ON public.transactions;
CREATE TRIGGER trg_transactions_deduct_stock
    BEFORE UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_deduct_stock_on_payment();

-- Transactions: return stock saat void (+ set voided_at)
DROP TRIGGER IF EXISTS trg_transactions_return_stock_void ON public.transactions;
CREATE TRIGGER trg_transactions_return_stock_void
    BEFORE UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_return_stock_on_void();

-- Transactions: log void ke cashier_actions
DROP TRIGGER IF EXISTS trg_transactions_log_void ON public.transactions;
CREATE TRIGGER trg_transactions_log_void
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_log_transaction_void();

-- Transactions: increment discount usage
DROP TRIGGER IF EXISTS trg_transactions_discount_usage ON public.transactions;
CREATE TRIGGER trg_transactions_discount_usage
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_increment_discount_usage();

-- Transactions: auto update daily report
DROP TRIGGER IF EXISTS trg_update_daily_report ON public.transactions;
CREATE TRIGGER trg_update_daily_report
    AFTER INSERT OR UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_daily_report();

-- Transaction items: recalc total
DROP TRIGGER IF EXISTS trg_tx_items_recalc_total ON public.transaction_items;
CREATE TRIGGER trg_tx_items_recalc_total
    AFTER INSERT OR UPDATE OR DELETE ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_transaction_total();

-- Transaction items: block modify paid transaction
DROP TRIGGER IF EXISTS trg_tx_items_no_modify_paid ON public.transaction_items;
CREATE TRIGGER trg_tx_items_no_modify_paid
    BEFORE INSERT OR UPDATE OR DELETE ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_paid_tx_modification();

-- Purchase orders: add stock on received
DROP TRIGGER IF EXISTS trg_purchase_orders_add_stock ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_add_stock
    BEFORE UPDATE OF status ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_add_stock_on_purchase_received();

-- Purchase orders: auto PO number
CREATE OR REPLACE FUNCTION public.fn_set_po_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.po_number IS NULL THEN
        NEW.po_number := public.fn_generate_po_number();
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_po_set_number ON public.purchase_orders;
CREATE TRIGGER trg_po_set_number
    BEFORE INSERT ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_po_number();

-- Customer debts: update status otomatis
DROP TRIGGER IF EXISTS trg_debts_update_status ON public.customer_debts;
CREATE TRIGGER trg_debts_update_status
    BEFORE INSERT OR UPDATE OF paid_amount ON public.customer_debts
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_debt_status();

-- Customer debts: sync total_debt di customers
DROP TRIGGER IF EXISTS trg_debts_sync_customer ON public.customer_debts;
CREATE TRIGGER trg_debts_sync_customer
    AFTER INSERT OR UPDATE OR DELETE ON public.customer_debts
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_customer_total_debt();

-- Debt payments: apply ke hutang
DROP TRIGGER IF EXISTS trg_debt_payments_apply ON public.debt_payments;
CREATE TRIGGER trg_debt_payments_apply
    AFTER INSERT ON public.debt_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_apply_debt_payment();

-- Shifts: prevent duplicate open
DROP TRIGGER IF EXISTS trg_shifts_prevent_duplicate ON public.shifts;
CREATE TRIGGER trg_shifts_prevent_duplicate
    BEFORE INSERT OR UPDATE OF status ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_duplicate_open_shift();

-- Audit triggers
DROP TRIGGER IF EXISTS trg_audit_products      ON public.products;
DROP TRIGGER IF EXISTS trg_audit_transactions  ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_profiles      ON public.profiles;
DROP TRIGGER IF EXISTS trg_audit_discounts     ON public.discounts;

CREATE TRIGGER trg_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_profiles
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_discounts
    AFTER INSERT OR UPDATE OR DELETE ON public.discounts
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- =====================================================================
-- 7. VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW public.v_low_stock_products AS
SELECT
    p.id, p.name, p.sku, p.barcode,
    p.cached_stock          AS current_stock,
    p.low_stock_threshold,
    p.min_stock,
    p.selling_price,
    c.name                  AS category_name,
    u.abbreviation          AS unit,
    p.is_consignment
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.units u      ON u.id = p.unit_id
WHERE p.track_stock = true
  AND p.is_active   = true
  AND p.is_consignment = false
  AND p.cached_stock <= p.low_stock_threshold
ORDER BY p.cached_stock ASC;

CREATE OR REPLACE VIEW public.v_outstanding_debts AS
SELECT
    cd.id,
    cu.name             AS customer_name,
    cu.phone,
    cd.amount,
    cd.paid_amount,
    cd.remaining,
    cd.status,
    cd.due_date,
    t.code              AS transaction_code,
    p.full_name         AS cashier_name,
    cd.created_at
FROM public.customer_debts cd
JOIN public.customers  cu ON cu.id = cd.customer_id
LEFT JOIN public.transactions t ON t.id = cd.transaction_id
LEFT JOIN public.profiles     p ON p.id = cd.cashier_id
WHERE cd.status IN ('outstanding', 'partial')
ORDER BY cd.due_date ASC NULLS LAST, cd.created_at;

CREATE OR REPLACE VIEW public.v_today_sales AS
SELECT
    t.id, t.code, t.status, t.payment_method,
    t.total_amount, t.discount_amount, t.tax_amount,
    t.paid_at,
    p.full_name     AS cashier_name,
    c.name          AS customer_name,
    t.created_at
FROM public.transactions t
LEFT JOIN public.profiles  p ON p.id = t.cashier_id
LEFT JOIN public.customers c ON c.id = t.customer_id
WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::DATE
    = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
  AND t.status = 'paid'
ORDER BY t.paid_at DESC;

CREATE OR REPLACE VIEW public.v_product_stock_summary AS
SELECT
    p.id, p.name, p.sku, p.barcode,
    p.cached_stock,
    p.low_stock_threshold,
    p.selling_price, p.cost_price,
    p.is_consignment, p.track_stock,
    c.name          AS category_name,
    u.abbreviation  AS unit,
    (p.selling_price - p.cost_price) AS margin_amount,
    CASE
        WHEN p.cost_price > 0
        THEN ROUND(((p.selling_price - p.cost_price)::NUMERIC / p.cost_price) * 100, 2)
        ELSE 0
    END             AS margin_pct
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.units      u ON u.id = p.unit_id
WHERE p.is_active = true
ORDER BY p.name;

-- =====================================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
    'profiles','categories','units','suppliers','products','product_variants',
    'discounts','discount_eligibility','customers','shifts','transactions',
    'transaction_items','purchase_orders','purchase_order_items',
    'inventory_movements','stock_movements','customer_debts','debt_payments',
    'cashier_actions','settings','daily_reports','audit_logs'
]) LOOP
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
END LOOP; END $$;

-- ===[ profiles ]===
DROP POLICY IF EXISTS "profiles:own_select"           ON public.profiles;
DROP POLICY IF EXISTS "profiles:manager_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles:own_update"           ON public.profiles;
DROP POLICY IF EXISTS "profiles:owner_all"            ON public.profiles;
DROP POLICY IF EXISTS "profiles:service_role"         ON public.profiles;

CREATE POLICY "profiles:own_select"     ON public.profiles FOR SELECT
    USING (id = auth.uid());
CREATE POLICY "profiles:manager_select" ON public.profiles FOR SELECT
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "profiles:own_update"     ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid()
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles:owner_all"      ON public.profiles FOR ALL
    USING (public.fn_is_owner());
CREATE POLICY "profiles:service_role"   ON public.profiles FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ categories ]===
DROP POLICY IF EXISTS "categories:anon_select"    ON public.categories;
DROP POLICY IF EXISTS "categories:staff_select"   ON public.categories;
DROP POLICY IF EXISTS "categories:manager_insert" ON public.categories;
DROP POLICY IF EXISTS "categories:manager_update" ON public.categories;
DROP POLICY IF EXISTS "categories:owner_delete"   ON public.categories;
DROP POLICY IF EXISTS "categories:service_role"   ON public.categories;

CREATE POLICY "categories:anon_select"    ON public.categories FOR SELECT TO anon
    USING (is_active = true);
CREATE POLICY "categories:staff_select"   ON public.categories FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "categories:manager_insert" ON public.categories FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "categories:manager_update" ON public.categories FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "categories:owner_delete"   ON public.categories FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "categories:service_role"   ON public.categories FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ units ]===
DROP POLICY IF EXISTS "units:public_select" ON public.units;
DROP POLICY IF EXISTS "units:owner_all"     ON public.units;
DROP POLICY IF EXISTS "units:service_role"  ON public.units;

CREATE POLICY "units:public_select" ON public.units FOR SELECT USING (true);
CREATE POLICY "units:owner_all"     ON public.units FOR ALL USING (public.fn_is_owner());
CREATE POLICY "units:service_role"  ON public.units FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ suppliers ]===
DROP POLICY IF EXISTS "suppliers:staff_select"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers:manager_insert"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers:manager_update"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers:owner_delete"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers:service_role"    ON public.suppliers;

CREATE POLICY "suppliers:staff_select"    ON public.suppliers FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "suppliers:manager_insert"  ON public.suppliers FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "suppliers:manager_update"  ON public.suppliers FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "suppliers:owner_delete"    ON public.suppliers FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "suppliers:service_role"    ON public.suppliers FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ products ]===
DROP POLICY IF EXISTS "products:anon_select"    ON public.products;
DROP POLICY IF EXISTS "products:staff_select"   ON public.products;
DROP POLICY IF EXISTS "products:manager_insert" ON public.products;
DROP POLICY IF EXISTS "products:manager_update" ON public.products;
DROP POLICY IF EXISTS "products:owner_delete"   ON public.products;
DROP POLICY IF EXISTS "products:service_role"   ON public.products;

CREATE POLICY "products:anon_select"    ON public.products FOR SELECT TO anon
    USING (is_active = true);
CREATE POLICY "products:staff_select"   ON public.products FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "products:manager_insert" ON public.products FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "products:manager_update" ON public.products FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "products:owner_delete"   ON public.products FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "products:service_role"   ON public.products FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ product_variants ]===
DROP POLICY IF EXISTS "variants:anon_select"    ON public.product_variants;
DROP POLICY IF EXISTS "variants:staff_select"   ON public.product_variants;
DROP POLICY IF EXISTS "variants:manager_insert" ON public.product_variants;
DROP POLICY IF EXISTS "variants:manager_update" ON public.product_variants;
DROP POLICY IF EXISTS "variants:owner_delete"   ON public.product_variants;
DROP POLICY IF EXISTS "variants:service_role"   ON public.product_variants;

CREATE POLICY "variants:anon_select"    ON public.product_variants FOR SELECT TO anon
    USING (is_active = true);
CREATE POLICY "variants:staff_select"   ON public.product_variants FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "variants:manager_insert" ON public.product_variants FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "variants:manager_update" ON public.product_variants FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "variants:owner_delete"   ON public.product_variants FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "variants:service_role"   ON public.product_variants FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ discounts ]===
DROP POLICY IF EXISTS "discounts:staff_select"    ON public.discounts;
DROP POLICY IF EXISTS "discounts:manager_insert"  ON public.discounts;
DROP POLICY IF EXISTS "discounts:manager_update"  ON public.discounts;
DROP POLICY IF EXISTS "discounts:owner_delete"    ON public.discounts;
DROP POLICY IF EXISTS "discounts:service_role"    ON public.discounts;

CREATE POLICY "discounts:staff_select"    ON public.discounts FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "discounts:manager_insert"  ON public.discounts FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "discounts:manager_update"  ON public.discounts FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "discounts:owner_delete"    ON public.discounts FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "discounts:service_role"    ON public.discounts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ discount_eligibility ]===
DROP POLICY IF EXISTS "eligibility:staff_select"   ON public.discount_eligibility;
DROP POLICY IF EXISTS "eligibility:manager_write"  ON public.discount_eligibility;
DROP POLICY IF EXISTS "eligibility:service_role"   ON public.discount_eligibility;

CREATE POLICY "eligibility:staff_select"   ON public.discount_eligibility FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "eligibility:manager_insert" ON public.discount_eligibility FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "eligibility:manager_delete" ON public.discount_eligibility FOR DELETE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "eligibility:service_role"   ON public.discount_eligibility FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ customers ]===
DROP POLICY IF EXISTS "customers:staff_select"  ON public.customers;
DROP POLICY IF EXISTS "customers:staff_insert"  ON public.customers;
DROP POLICY IF EXISTS "customers:staff_update"  ON public.customers;
DROP POLICY IF EXISTS "customers:owner_delete"  ON public.customers;
DROP POLICY IF EXISTS "customers:service_role"  ON public.customers;

CREATE POLICY "customers:staff_select"  ON public.customers FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "customers:staff_insert"  ON public.customers FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "customers:staff_update"  ON public.customers FOR UPDATE
    USING (public.fn_is_staff());
CREATE POLICY "customers:owner_delete"  ON public.customers FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "customers:service_role"  ON public.customers FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ shifts ]===
DROP POLICY IF EXISTS "shifts:own_select"       ON public.shifts;
DROP POLICY IF EXISTS "shifts:manager_select"   ON public.shifts;
DROP POLICY IF EXISTS "shifts:cashier_insert"   ON public.shifts;
DROP POLICY IF EXISTS "shifts:own_update"       ON public.shifts;
DROP POLICY IF EXISTS "shifts:owner_all"        ON public.shifts;
DROP POLICY IF EXISTS "shifts:service_role"     ON public.shifts;

CREATE POLICY "shifts:own_select"       ON public.shifts FOR SELECT
    USING (cashier_id = auth.uid());
CREATE POLICY "shifts:manager_select"   ON public.shifts FOR SELECT
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "shifts:cashier_insert"   ON public.shifts FOR INSERT
    WITH CHECK (public.fn_is_staff() AND cashier_id = auth.uid());
CREATE POLICY "shifts:own_update"       ON public.shifts FOR UPDATE
    USING (cashier_id = auth.uid() AND status = 'open');
CREATE POLICY "shifts:owner_all"        ON public.shifts FOR ALL
    USING (public.fn_is_owner());
CREATE POLICY "shifts:service_role"     ON public.shifts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ transactions ]===
DROP POLICY IF EXISTS "tx:own_select"       ON public.transactions;
DROP POLICY IF EXISTS "tx:manager_select"   ON public.transactions;
DROP POLICY IF EXISTS "tx:cashier_insert"   ON public.transactions;
DROP POLICY IF EXISTS "tx:cashier_update"   ON public.transactions;
DROP POLICY IF EXISTS "tx:owner_all"        ON public.transactions;
DROP POLICY IF EXISTS "tx:service_role"     ON public.transactions;

CREATE POLICY "tx:own_select"       ON public.transactions FOR SELECT
    USING (cashier_id = auth.uid());
CREATE POLICY "tx:manager_select"   ON public.transactions FOR SELECT
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "tx:cashier_insert"   ON public.transactions FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "tx:cashier_update"   ON public.transactions FOR UPDATE
    USING (public.fn_is_staff() AND cashier_id = auth.uid());
CREATE POLICY "tx:owner_all"        ON public.transactions FOR ALL
    USING (public.fn_is_owner());
CREATE POLICY "tx:service_role"     ON public.transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ transaction_items ]===
DROP POLICY IF EXISTS "tx_items:staff_select"   ON public.transaction_items;
DROP POLICY IF EXISTS "tx_items:cashier_insert" ON public.transaction_items;
DROP POLICY IF EXISTS "tx_items:cashier_update" ON public.transaction_items;
DROP POLICY IF EXISTS "tx_items:owner_all"      ON public.transaction_items;
DROP POLICY IF EXISTS "tx_items:service_role"   ON public.transaction_items;

CREATE POLICY "tx_items:staff_select"   ON public.transaction_items FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "tx_items:cashier_insert" ON public.transaction_items FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "tx_items:cashier_update" ON public.transaction_items FOR UPDATE
    USING (public.fn_is_staff());
CREATE POLICY "tx_items:owner_all"      ON public.transaction_items FOR ALL
    USING (public.fn_is_owner());
CREATE POLICY "tx_items:service_role"   ON public.transaction_items FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ purchase_orders ]===
DROP POLICY IF EXISTS "po:staff_select"    ON public.purchase_orders;
DROP POLICY IF EXISTS "po:manager_insert"  ON public.purchase_orders;
DROP POLICY IF EXISTS "po:manager_update"  ON public.purchase_orders;
DROP POLICY IF EXISTS "po:owner_delete"    ON public.purchase_orders;
DROP POLICY IF EXISTS "po:service_role"    ON public.purchase_orders;

CREATE POLICY "po:staff_select"    ON public.purchase_orders FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "po:manager_insert"  ON public.purchase_orders FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "po:manager_update"  ON public.purchase_orders FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "po:owner_delete"    ON public.purchase_orders FOR DELETE
    USING (public.fn_is_owner() AND status = 'draft');
CREATE POLICY "po:service_role"    ON public.purchase_orders FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ purchase_order_items ]===
DROP POLICY IF EXISTS "po_items:staff_select"    ON public.purchase_order_items;
DROP POLICY IF EXISTS "po_items:manager_insert"  ON public.purchase_order_items;
DROP POLICY IF EXISTS "po_items:manager_update"  ON public.purchase_order_items;
DROP POLICY IF EXISTS "po_items:service_role"    ON public.purchase_order_items;

CREATE POLICY "po_items:staff_select"   ON public.purchase_order_items FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "po_items:manager_insert" ON public.purchase_order_items FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_owner_or_manager());
CREATE POLICY "po_items:manager_update" ON public.purchase_order_items FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "po_items:service_role"   ON public.purchase_order_items FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ inventory_movements ]===
DROP POLICY IF EXISTS "inv_mov:staff_select"   ON public.inventory_movements;
DROP POLICY IF EXISTS "inv_mov:system_insert"  ON public.inventory_movements;
DROP POLICY IF EXISTS "inv_mov:service_role"   ON public.inventory_movements;

CREATE POLICY "inv_mov:staff_select"   ON public.inventory_movements FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "inv_mov:system_insert"  ON public.inventory_movements FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "inv_mov:service_role"   ON public.inventory_movements FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ stock_movements ]===
DROP POLICY IF EXISTS "stk_mov:staff_select"   ON public.stock_movements;
DROP POLICY IF EXISTS "stk_mov:system_insert"  ON public.stock_movements;
DROP POLICY IF EXISTS "stk_mov:service_role"   ON public.stock_movements;

CREATE POLICY "stk_mov:staff_select"   ON public.stock_movements FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "stk_mov:system_insert"  ON public.stock_movements FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "stk_mov:service_role"   ON public.stock_movements FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ customer_debts ]===
DROP POLICY IF EXISTS "debts:staff_select"    ON public.customer_debts;
DROP POLICY IF EXISTS "debts:staff_insert"    ON public.customer_debts;
DROP POLICY IF EXISTS "debts:manager_update"  ON public.customer_debts;
DROP POLICY IF EXISTS "debts:owner_delete"    ON public.customer_debts;
DROP POLICY IF EXISTS "debts:service_role"    ON public.customer_debts;

CREATE POLICY "debts:staff_select"    ON public.customer_debts FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "debts:staff_insert"    ON public.customer_debts FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "debts:manager_update"  ON public.customer_debts FOR UPDATE
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "debts:owner_delete"    ON public.customer_debts FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "debts:service_role"    ON public.customer_debts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ debt_payments ]===
DROP POLICY IF EXISTS "debt_pay:staff_select"  ON public.debt_payments;
DROP POLICY IF EXISTS "debt_pay:staff_insert"  ON public.debt_payments;
DROP POLICY IF EXISTS "debt_pay:owner_delete"  ON public.debt_payments;
DROP POLICY IF EXISTS "debt_pay:service_role"  ON public.debt_payments;

CREATE POLICY "debt_pay:staff_select"  ON public.debt_payments FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "debt_pay:staff_insert"  ON public.debt_payments FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "debt_pay:owner_delete"  ON public.debt_payments FOR DELETE
    USING (public.fn_is_owner());
CREATE POLICY "debt_pay:service_role"  ON public.debt_payments FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ cashier_actions ]===
DROP POLICY IF EXISTS "actions:own_select"      ON public.cashier_actions;
DROP POLICY IF EXISTS "actions:manager_select"  ON public.cashier_actions;
DROP POLICY IF EXISTS "actions:staff_insert"    ON public.cashier_actions;
DROP POLICY IF EXISTS "actions:service_role"    ON public.cashier_actions;

CREATE POLICY "actions:own_select"      ON public.cashier_actions FOR SELECT
    USING (cashier_id = auth.uid());
CREATE POLICY "actions:manager_select"  ON public.cashier_actions FOR SELECT
    USING (public.fn_is_owner_or_manager());
CREATE POLICY "actions:staff_insert"    ON public.cashier_actions FOR INSERT
    WITH CHECK (public.fn_is_staff());
CREATE POLICY "actions:service_role"    ON public.cashier_actions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ settings ]===
DROP POLICY IF EXISTS "settings:staff_select"  ON public.settings;
DROP POLICY IF EXISTS "settings:owner_write"   ON public.settings;
DROP POLICY IF EXISTS "settings:service_role"  ON public.settings;

CREATE POLICY "settings:staff_select"  ON public.settings FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "settings:owner_write"   ON public.settings FOR ALL
    USING (public.fn_is_owner());
CREATE POLICY "settings:service_role"  ON public.settings FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ daily_reports ]===
DROP POLICY IF EXISTS "daily_reports:staff_select"  ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports:service_role"  ON public.daily_reports;

CREATE POLICY "daily_reports:staff_select"  ON public.daily_reports FOR SELECT
    USING (public.fn_is_staff());
CREATE POLICY "daily_reports:service_role"  ON public.daily_reports FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ===[ audit_logs ]===
DROP POLICY IF EXISTS "audit:owner_select"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit:system_insert"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit:service_role"   ON public.audit_logs;

CREATE POLICY "audit:owner_select"   ON public.audit_logs FOR SELECT
    USING (public.fn_is_owner());
CREATE POLICY "audit:system_insert"  ON public.audit_logs FOR INSERT
    WITH CHECK (true);
CREATE POLICY "audit:service_role"   ON public.audit_logs FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =====================================================================
-- 9. STORAGE BUCKETS & RLS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('product-images', 'product-images', true,  5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/gif']),
    ('avatars',        'avatars',        false, 2097152,
        ARRAY['image/jpeg','image/png','image/webp']),
    ('receipts',       'receipts',       false, 1048576,
        ARRAY['image/jpeg','image/png','application/pdf']),
    ('attachments',    'attachments',    false, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
    public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images:public_select"  ON storage.objects;
DROP POLICY IF EXISTS "product_images:manager_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images:manager_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images:owner_delete"   ON storage.objects;
DROP POLICY IF EXISTS "avatars:own_select"            ON storage.objects;
DROP POLICY IF EXISTS "avatars:own_insert"            ON storage.objects;
DROP POLICY IF EXISTS "avatars:own_update"            ON storage.objects;
DROP POLICY IF EXISTS "avatars:own_delete"            ON storage.objects;
DROP POLICY IF EXISTS "avatars:owner_all"             ON storage.objects;
DROP POLICY IF EXISTS "receipts:own_select"           ON storage.objects;
DROP POLICY IF EXISTS "receipts:cashier_insert"       ON storage.objects;
DROP POLICY IF EXISTS "receipts:manager_select"       ON storage.objects;
DROP POLICY IF EXISTS "receipts:owner_delete"         ON storage.objects;
DROP POLICY IF EXISTS "attachments:owner_all"         ON storage.objects;
DROP POLICY IF EXISTS "storage:service_role"          ON storage.objects;

CREATE POLICY "product_images:public_select"  ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'product-images');
CREATE POLICY "product_images:manager_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images' AND public.fn_is_owner_or_manager());
CREATE POLICY "product_images:manager_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'product-images' AND public.fn_is_owner_or_manager());
CREATE POLICY "product_images:owner_delete"   ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'product-images' AND public.fn_is_owner());

CREATE POLICY "avatars:own_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars:own_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars:own_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars:own_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars:owner_all"  ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'avatars' AND public.fn_is_owner());

CREATE POLICY "receipts:own_select"     ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "receipts:cashier_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'receipts' AND public.fn_is_staff()
        AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "receipts:manager_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'receipts' AND public.fn_is_owner_or_manager());
CREATE POLICY "receipts:owner_delete"   ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'receipts' AND public.fn_is_owner());

CREATE POLICY "attachments:owner_all" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'attachments' AND public.fn_is_owner());
CREATE POLICY "storage:service_role"  ON storage.objects FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =====================================================================
-- 10. FUNCTION GRANTS
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.fn_get_user_role()                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_owner()                                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_owner_or_manager()                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_staff()                                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_pin(TEXT)                                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_pin(TEXT)                                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_adjust_stock(UUID, INTEGER, public.movement_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_close_shift(UUID, INTEGER, TEXT)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_search_products(TEXT, INTEGER)                          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fn_sales_report(TIMESTAMPTZ, TIMESTAMPTZ)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_generate_transaction_code()                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_generate_po_number()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_generate_slug(TEXT)                                     TO authenticated, anon;

GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON storage.buckets                       TO authenticated;

-- =====================================================================
-- 11. SEED DATA
-- =====================================================================

-- Units
INSERT INTO public.units (name, abbreviation) VALUES
    ('Pieces',     'pcs'), ('Kilogram',   'kg'),  ('Gram',     'gr'),
    ('Liter',      'ltr'), ('Milliliter', 'ml'),  ('Pack',     'pack'),
    ('Box',        'box'), ('Dozen',      'dus'),  ('Lusin',   'lsn'),
    ('Ikat',       'ikt'), ('Botol',      'btl'),  ('Kaleng',  'klg'),
    ('Sachet',     'sct'), ('Meter',      'mtr')
ON CONFLICT (name) DO NOTHING;

-- Settings (dengan category + data_type)
INSERT INTO public.settings (category, key, value, description, data_type) VALUES
    -- Store
    ('store',    'store_name',          'Kelontong POS',     'Nama toko',                       'string'),
    ('store',    'store_address',       '',                  'Alamat toko',                     'string'),
    ('store',    'store_phone',         '',                  'Nomor telepon toko',               'string'),
    ('store',    'store_logo',          '',                  'URL logo toko',                   'string'),
    ('store',    'store_timezone',      'Asia/Jakarta',      'Timezone toko',                   'string'),
    -- Transaction
    ('tx',       'tax_rate',            '0',                 'PPN default (%)',                 'integer'),
    ('tx',       'receipt_header',      'Terima kasih!',     'Header struk',                    'string'),
    ('tx',       'receipt_footer',      'Selamat berbelanja','Footer struk',                    'string'),
    ('tx',       'auto_print_receipt',  'false',             'Auto cetak struk',                'boolean'),
    -- Payment
    ('payment',  'enable_qris',         'true',              'Aktifkan QRIS',                   'boolean'),
    ('payment',  'enable_cash',         'true',              'Aktifkan tunai',                  'boolean'),
    ('payment',  'enable_transfer',     'true',              'Aktifkan transfer bank',          'boolean'),
    ('payment',  'enable_debt',         'true',              'Aktifkan hutang',                 'boolean'),
    ('payment',  'qris_expired_minutes','15',                'Expired QRIS (menit)',            'integer'),
    -- Stock
    ('stock',    'low_stock_alert',     'true',              'Notifikasi stok rendah',          'boolean'),
    ('stock',    'auto_deduct_stock',   'true',              'Auto kurangi stok saat transaksi','boolean'),
    -- Shift
    ('shift',    'require_shift',       'true',              'Wajib buka shift sebelum transaksi','boolean'),
    ('shift',    'single_session',      'true',              'Satu kasir hanya satu sesi aktif','boolean'),
    -- Loyalty
    ('loyalty',  'loyalty_enabled',     'false',             'Aktifkan poin loyalitas',         'boolean'),
    ('loyalty',  'loyalty_rate',        '1',                 'Poin per Rp 1000 transaksi',      'integer')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- =====================================================================
-- POST-DEPLOY NOTES
-- =====================================================================
-- 1. ROLE HIERARCHY: owner > manager > cashier
--    owner   : full access + delete + audit_logs + settings
--    manager : CRUD operasional, tidak bisa delete master data
--    cashier : transaksi + shift sendiri + baca produk/customer
--
-- 2. STOCK FLOW (ATOMIC + RACE-FREE):
--    Semua event → INSERT inventory_movements
--    → BEFORE trigger: row-lock FOR UPDATE + set session flag
--    → UPDATE products SET stock/cached_stock
--    → reset session flag
--    Direct UPDATE products.stock → BLOCKED (kecuali via flag)
--    is_consignment = true → stok tidak dipotong
--
-- 3. AUDIT TRAIL — isi dari aplikasi sebelum query:
--    SELECT set_config('app.client_ip',  $ip, true);
--    SELECT set_config('app.user_agent', $ua, true);
--
-- 4. GENERATED COLUMNS (tidak bisa di-set manual):
--    customer_debts.remaining         → amount - paid_amount
--    shifts.cash_difference           → closing_cash - expected_cash
--    transaction_items.gross_profit   → total_price - (cost_price * quantity)
--    purchase_order_items.total_cost  → received_qty * unit_cost
--    inventory_movements.total_cost   → ABS(qty_change) * unit_cost
--    daily_reports.gross_profit       → total_revenue - total_cogs
--    units.symbol                     → alias dari abbreviation
--
-- 5. IMMUTABLE LEDGER (inventory_movements):
--    Tidak ada UPDATE, tidak ada DELETE.
--    Koreksi stok: INSERT entry baru dengan qty_change berlawanan.
--
-- 6. MIDTRANS / QRIS:
--    Simpan midtrans_order_id + qris_expires_at di transactions.
--    Expire QRIS via cron/edge function: UPDATE status='expired'
--    WHERE status='pending' AND qris_expires_at < NOW().
--
-- 7. DISCOUNT ELIGIBILITY:
--    target_type = 'all'      → berlaku semua produk (target_id NULL)
--    target_type = 'category' → target_id = category UUID
--    target_type = 'product'  → target_id = product UUID
--    target_type = 'variant'  → target_id = variant UUID
-- =====================================================================', file_path: