-- =====================================================================
-- KELONTONG POS — COMPLETE SUPABASE DATABASE SETUP
-- Version : 6.0 (Production Ready — All Bugs Fixed)
-- Target  : Supabase PostgreSQL 15+
--
-- CHANGELOG dari v5.x:
--   [FIX-1]  customer_debts.remaining     → GENERATED ALWAYS AS (bukan DEFAULT)
--   [FIX-2]  shifts.cash_difference       → GENERATED ALWAYS AS (bukan DEFAULT)
--   [FIX-3]  stock_movements.reference_type → pakai ENUM (bukan text)
--   [FIX-4]  Konflik trigger block vs ledger → selesai via session variable
--             app.allow_stock_update (set_config) di fn_process_inventory_movement
--   [FIX-5]  inherit_cost_price           → pindah ke product_variants (sesuai DB aktual)
--   [FIX-6]  products kolom nullable      → ditambah NOT NULL yang hilang
--   [FIX-7]  fn_record_initial_stock      → fallback ke admin jika auth.uid() null
--   [FIX-8]  fn_block_direct_stock_update → check session var sebelum block
--   [NEW-1]  fn_adjust_stock              → clean RPC API untuk stock adjustment
--   [NEW-2]  fn_sync_variant_cost_price   → auto-hitung cost varian jika inherit
--   [NEW-3]  Trigger updated_at pada settings & daily_reports
-- =====================================================================
-- EXECUTION ORDER (PENTING — jangan diubah urutan):
--   1.  Extensions
--   2.  Enum Types
--   3.  Tables
--   4.  Indexes
--   5.  Functions & Triggers
--   6.  RLS Policies
--   7.  Storage Buckets & Policies
--   8.  Grants
--   9.  Seed Data
--  10.  Views
-- =====================================================================

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================
CREATE
EXTENSION IF NOT EXISTS pg_trgm;
CREATE
EXTENSION IF NOT EXISTS pgcrypto;
CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. ENUM TYPES
-- =====================================================================
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.action_type CASCADE;
DROP TYPE IF EXISTS public.movement_type CASCADE;
DROP TYPE IF EXISTS public.reference_type CASCADE;
DROP TYPE IF EXISTS public.shift_status CASCADE;
DROP TYPE IF EXISTS public.debt_status CASCADE;
DROP TYPE IF EXISTS public.discount_type CASCADE;
DROP TYPE IF EXISTS public.purchase_status CASCADE;

CREATE TYPE public.user_role AS ENUM (
  'admin', 'cashier', 'customer'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending', 'paid', 'expired', 'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash', 'qris', 'transfer', 'debt'
);

CREATE TYPE public.action_type AS ENUM (
  'void', 'discount', 'refund', 'stock_adjustment', 'shift_open', 'shift_close'
);

CREATE TYPE public.movement_type AS ENUM (
  'purchase', 'sale', 'adjustment', 'return_in', 'return_out', 'damage', 'void'
);

CREATE TYPE public.reference_type AS ENUM (
  'transaction', 'purchase_order', 'refund', 'manual'
);

CREATE TYPE public.shift_status AS ENUM (
  'open', 'closed'
);

CREATE TYPE public.debt_status AS ENUM (
  'outstanding', 'partial', 'paid'
);

CREATE TYPE public.discount_type AS ENUM (
  'percentage', 'fixed'
);

CREATE TYPE public.purchase_status AS ENUM (
  'draft', 'ordered', 'received', 'partial', 'cancelled'
);

-- =====================================================================
-- 3. TABLES
-- (urutan: dependency-safe)
-- =====================================================================

-- -------------------------------------------------------------------
-- 3.1 PROFILES
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles
(
    id
    UUID
    NOT
    NULL
    PRIMARY
    KEY
    REFERENCES
    auth
    .
    users
(
    id
) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer',
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    pin_hash TEXT,
    theme_preference TEXT DEFAULT 'system' CHECK
(
    theme_preference
    IN
(
    'light',
    'dark',
    'system'
)),
    email TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.profiles IS 'Extends Supabase auth.users — role, PIN, dan preferensi tampilan';

-- -------------------------------------------------------------------
-- 3.2 UNITS OF MEASURE
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.units IS 'Satuan produk: pcs, kg, liter, pack, dus, dll.';

-- -------------------------------------------------------------------
-- 3.3 CATEGORIES
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.categories IS 'Kategori produk dengan soft-delete via is_active';

-- -------------------------------------------------------------------
-- 3.4 SUPPLIERS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    email TEXT,
    contact_person TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.suppliers IS 'Data pemasok / distributor barang';

-- -------------------------------------------------------------------
-- 3.5 PRODUCTS
-- [FIX-5] inherit_cost_price TIDAK ada di sini — ada di product_variants
-- [FIX-6] track_stock, cached_stock, low_stock_threshold → NOT NULL
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    category_id UUID REFERENCES public.categories
(
    id
) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.units
(
    id
)
  ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers
(
    id
)
  ON DELETE SET NULL,
    name TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    description TEXT,
    cost_price INTEGER NOT NULL DEFAULT 0 CHECK
(
    cost_price
    >=
    0
),
    price INTEGER NOT NULL CHECK
(
    price
    >=
    0
),
    stock INTEGER NOT NULL DEFAULT 0 CHECK
(
    stock
    >=
    0
),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK
(
    min_stock
    >=
    0
),
    max_stock INTEGER CHECK
(
    max_stock
    >=
    0
),
    track_stock BOOLEAN NOT NULL DEFAULT true,
    cached_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_consignment BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.products IS 'Katalog produk dengan HPP dan harga jual';

-- -------------------------------------------------------------------
-- 3.6 PRODUCT VARIANTS
-- [FIX-5] inherit_cost_price ada di sini (sesuai DB aktual & semantik benar)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products
(
    id
) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    price INTEGER NOT NULL CHECK
(
    price
    >=
    0
),
    cost_price INTEGER NOT NULL DEFAULT 0 CHECK
(
    cost_price
    >=
    0
),
    conversion_qty INTEGER NOT NULL DEFAULT 1 CHECK
(
    conversion_qty >
    0
),
    min_qty INTEGER NOT NULL DEFAULT 1,
    cached_stock INTEGER NOT NULL DEFAULT 0,
    inherit_cost_price BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.product_variants IS
  'Varian harga produk (eceran/grosir/dus) dengan faktor konversi stok';
COMMENT
ON COLUMN public.product_variants.conversion_qty IS
  '1 Dus = 12 pcs → conversion_qty = 12';
COMMENT
ON COLUMN public.product_variants.inherit_cost_price IS
  'Jika true, cost_price = products.cost_price * conversion_qty (dihitung otomatis)';

-- -------------------------------------------------------------------
-- 3.7 DISCOUNTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discounts
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    discount_type public.discount_type NOT NULL DEFAULT 'percentage',
    value INTEGER NOT NULL CHECK
(
    value >
    0
),
    max_discount INTEGER,
    min_purchase INTEGER NOT NULL DEFAULT 0,
    max_usage INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.discounts IS 'Promo/diskon — persentase atau nominal tetap';

-- -------------------------------------------------------------------
-- 3.8 SHIFTS
-- [FIX-2] cash_difference → GENERATED ALWAYS AS STORED
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    cashier_id UUID NOT NULL REFERENCES public.profiles
(
    id
) ON DELETE RESTRICT,
    status public.shift_status NOT NULL DEFAULT 'open',
    opening_cash INTEGER NOT NULL DEFAULT 0 CHECK
(
    opening_cash
    >=
    0
),
    closing_cash INTEGER CHECK
(
    closing_cash
    >=
    0
),
    expected_cash INTEGER CHECK
(
    expected_cash
    >=
    0
),
    cash_difference INTEGER GENERATED ALWAYS AS
(
    CASE
    WHEN
    closing_cash
    IS
    NOT
    NULL
    THEN
    closing_cash
    -
    expected_cash
    ELSE
    NULL
    END
) STORED,
    notes TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    closed_at TIMESTAMPTZ
    );
COMMENT
ON TABLE public.shifts IS 'Shift kasir — rekap buka/tutup dengan selisih kas (computed)';

-- -------------------------------------------------------------------
-- 3.9 CUSTOMERS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    address TEXT,
    notes TEXT,
    total_debt INTEGER NOT NULL DEFAULT 0 CHECK
(
    total_debt
    >=
    0
),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.customers IS 'Pelanggan tetap — untuk hutang dan riwayat belanja';

-- -------------------------------------------------------------------
-- 3.10 TRANSACTIONS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    cashier_id UUID REFERENCES public.profiles
(
    id
) ON DELETE SET NULL,
    shift_id UUID REFERENCES public.shifts
(
    id
)
  ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers
(
    id
)
  ON DELETE SET NULL,
    discount_id UUID REFERENCES public.discounts
(
    id
)
  ON DELETE SET NULL,
    subtotal INTEGER NOT NULL DEFAULT 0 CHECK
(
    subtotal
    >=
    0
),
    discount_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    discount_amount
    >=
    0
),
    tax_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    tax_amount
    >=
    0
),
    total INTEGER NOT NULL DEFAULT 0 CHECK
(
    total
    >=
    0
),
    amount_paid INTEGER NOT NULL DEFAULT 0 CHECK
(
    amount_paid
    >=
    0
),
    change_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    change_amount
    >=
    0
),
    payment_method public.payment_method NOT NULL DEFAULT 'cash',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    midtrans_order_id TEXT UNIQUE,
    qris_url TEXT,
    qris_string TEXT,
    qris_expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.transactions IS 'Header transaksi — QRIS + void tracking';

-- -------------------------------------------------------------------
-- 3.11 TRANSACTION ITEMS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_items
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.transactions
(
    id
) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products
(
    id
)
  ON DELETE SET NULL,
    product_variant_id UUID REFERENCES public.product_variants
(
    id
)
  ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    barcode TEXT,
    qty INTEGER NOT NULL CHECK
(
    qty >
    0
),
    unit_price INTEGER NOT NULL CHECK
(
    unit_price
    >=
    0
),
    cost_price INTEGER NOT NULL DEFAULT 0 CHECK
(
    cost_price
    >=
    0
),
    discount_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    discount_amount
    >=
    0
),
    subtotal INTEGER NOT NULL CHECK
(
    subtotal
    >=
    0
)
    );
COMMENT
ON TABLE public.transaction_items IS
  'Line item transaksi — snapshot data produk saat transaksi terjadi';

-- -------------------------------------------------------------------
-- 3.12 PURCHASE ORDERS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    supplier_id UUID REFERENCES public.suppliers
(
    id
) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    received_by UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    status public.purchase_status NOT NULL DEFAULT 'draft',
    invoice_number TEXT,
    total INTEGER NOT NULL DEFAULT 0 CHECK
(
    total
    >=
    0
),
    paid_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    paid_amount
    >=
    0
),
    notes TEXT,
    ordered_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.purchase_orders IS 'Pembelian barang dari supplier / nota masuk';

-- -------------------------------------------------------------------
-- 3.13 PURCHASE ORDER ITEMS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_items
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders
(
    id
) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products
(
    id
)
  ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    barcode TEXT,
    qty_ordered INTEGER NOT NULL CHECK
(
    qty_ordered >
    0
),
    qty_received INTEGER NOT NULL DEFAULT 0 CHECK
(
    qty_received
    >=
    0
),
    unit_cost INTEGER NOT NULL CHECK
(
    unit_cost
    >=
    0
),
    subtotal INTEGER NOT NULL CHECK
(
    subtotal
    >=
    0
)
    );
COMMENT
ON TABLE public.purchase_order_items IS 'Detail item pembelian dari supplier';

-- -------------------------------------------------------------------
-- 3.14 STOCK MOVEMENTS (legacy — backward compat)
-- [FIX-3] reference_type → public.reference_type ENUM (bukan text)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products
(
    id
) ON DELETE RESTRICT,
    product_variant_id UUID REFERENCES public.product_variants
(
    id
)
  ON DELETE SET NULL,
    movement_type public.movement_type NOT NULL,
    reference_id UUID,
    reference_type public.reference_type,
    unit_cost NUMERIC
(
    12,
    2
) DEFAULT 0,
    qty_before INTEGER NOT NULL,
    qty_change INTEGER NOT NULL,
    qty_after INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.stock_movements IS 'Mutasi stok legacy — backward compat, tidak digunakan aktif';

-- -------------------------------------------------------------------
-- 3.15 INVENTORY MOVEMENTS (ledger baru — sumber kebenaran stok)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products
(
    id
) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES public.product_variants
(
    id
)
  ON DELETE CASCADE,
    movement_type public.movement_type NOT NULL,
    reference_type public.reference_type,
    reference_id UUID,
    qty_change INTEGER NOT NULL,
    qty_before INTEGER NOT NULL DEFAULT 0,
    qty_after INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC
(
    12,
    2
) DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users
(
    id
),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.inventory_movements IS
  'Buku besar stok — sumber kebenaran, atomic + row-locked';

-- -------------------------------------------------------------------
-- 3.16 CUSTOMER DEBTS
-- [FIX-1] remaining → GENERATED ALWAYS AS STORED (bukan DEFAULT)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_debts
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers
(
    id
) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions
(
    id
)
  ON DELETE SET NULL,
    cashier_id UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    status public.debt_status NOT NULL DEFAULT 'outstanding',
    amount INTEGER NOT NULL CHECK
(
    amount >
    0
),
    paid_amount INTEGER NOT NULL DEFAULT 0 CHECK
(
    paid_amount
    >=
    0
),
    remaining INTEGER GENERATED ALWAYS AS
(
    amount
    -
    paid_amount
) STORED,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.customer_debts IS 'Hutang pelanggan — remaining dihitung otomatis';

-- -------------------------------------------------------------------
-- 3.17 DEBT PAYMENTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_payments
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    debt_id UUID NOT NULL REFERENCES public.customer_debts
(
    id
) ON DELETE RESTRICT,
    cashier_id UUID REFERENCES public.profiles
(
    id
)
  ON DELETE SET NULL,
    amount INTEGER NOT NULL CHECK
(
    amount >
    0
),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.debt_payments IS 'Riwayat cicilan hutang pelanggan';

-- -------------------------------------------------------------------
-- 3.18 CASHIER ACTIONS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cashier_actions
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    cashier_id UUID REFERENCES public.profiles
(
    id
) ON DELETE SET NULL,
    shift_id UUID REFERENCES public.shifts
(
    id
)
  ON DELETE SET NULL,
    action_type public.action_type NOT NULL,
    target_id TEXT,
    target_type TEXT,
    pin_verified BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.cashier_actions IS 'Audit log setiap aksi sensitif kasir';

-- -------------------------------------------------------------------
-- 3.19 SETTINGS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    description TEXT,
    data_type TEXT NOT NULL DEFAULT 'string',
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    CONSTRAINT settings_unique_category_key UNIQUE
(
    category,
    key
)
    );
COMMENT
ON TABLE public.settings IS 'Pengaturan aplikasi category/key';

-- -------------------------------------------------------------------
-- 3.20 DAILY REPORTS
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_reports
(
    id
    UUID
    DEFAULT
    gen_random_uuid
(
) PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    total_sales BIGINT NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    paid_transactions INTEGER NOT NULL DEFAULT 0,
    pending_transactions INTEGER NOT NULL DEFAULT 0,
    cancelled_transactions INTEGER NOT NULL DEFAULT 0,
    expired_transactions INTEGER NOT NULL DEFAULT 0,
    average_transaction_value BIGINT NOT NULL DEFAULT 0,
    total_items_sold INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
)
    );
COMMENT
ON TABLE public.daily_reports IS 'Laporan harian agregasi penjualan';

-- =====================================================================
-- 4. INDEXES
-- =====================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- units
CREATE INDEX IF NOT EXISTS idx_units_symbol ON public.units(symbol);
CREATE INDEX IF NOT EXISTS idx_units_is_active ON public.units(is_active);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

-- products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock, min_stock)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products
    USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);

-- product_variants
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_is_active ON public.product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_is_default ON public.product_variants(is_default)
    WHERE is_default = true;

-- discounts
CREATE INDEX IF NOT EXISTS idx_discounts_code ON public.discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_is_active ON public.discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_valid_until ON public.discounts(valid_until)
    WHERE is_active = true;

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON public.shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON public.shifts(opened_at);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers
    USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON public.transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON public.transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON public.transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_midtrans_order_id ON public.transactions(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_qris_expires_at ON public.transactions(qris_expires_at)
    WHERE payment_status = 'pending';

-- transaction_items
CREATE INDEX IF NOT EXISTS idx_tx_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_product_id ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_product_variant_id ON public.transaction_items(product_variant_id);

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON public.purchase_orders(created_at);

-- purchase_order_items
CREATE INDEX IF NOT EXISTS idx_poi_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON public.purchase_order_items(product_id);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_mov_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_movement_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_mov_reference_id ON public.stock_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_created_at ON public.stock_movements(created_at);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_inv_mov_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_variant_id ON public.inventory_movements(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created_at ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_mov_reference ON public.inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_type ON public.inventory_movements(movement_type);

-- customer_debts
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON public.customer_debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_transaction_id ON public.customer_debts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.customer_debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON public.customer_debts(due_date)
    WHERE status != 'paid';

-- debt_payments
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_cashier_id ON public.debt_payments(cashier_id);

-- cashier_actions
CREATE INDEX IF NOT EXISTS idx_ca_cashier_id ON public.cashier_actions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_ca_shift_id ON public.cashier_actions(shift_id);
CREATE INDEX IF NOT EXISTS idx_ca_action_type ON public.cashier_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ca_created_at ON public.cashier_actions(created_at);

-- settings
CREATE INDEX IF NOT EXISTS idx_settings_category_key ON public.settings(category, key);

-- daily_reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at ON public.daily_reports(created_at);

-- =====================================================================
-- 5. FUNCTIONS & TRIGGERS
-- =====================================================================

-- -------------------------------------------------------------------
-- 5.1 UTILITY — Generic updated_at trigger
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at
= NOW();
RETURN NEW;
END;
$$;

DO
$$
DECLARE
tbl TEXT;
BEGIN
  FOREACH
tbl IN ARRAY ARRAY[
    'profiles','suppliers','products','product_variants',
    'purchase_orders','customer_debts','customers',
    'settings','daily_reports'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
    ', tbl, tbl, tbl, tbl);
END LOOP;
END;
$$;

-- -------------------------------------------------------------------
-- 5.2 AUTH — Auto-create profile on signup
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->>'full_name', split_part(NEW.email,'@',1)),
        COALESCE((NEW.raw_user_meta_data ->>'role') ::public.user_role, 'customer')) ON CONFLICT (id) DO NOTHING;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT
    ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- -------------------------------------------------------------------
-- 5.3 PIN — Verify & Set
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_verify_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_hash TEXT;
BEGIN
SELECT pin_hash
INTO v_hash
FROM public.profiles
WHERE id = p_user_id
  AND role IN ('cashier', 'admin')
  AND is_active = true;
IF
v_hash IS NULL THEN RETURN FALSE;
END IF;
RETURN crypt(p_pin, v_hash) = v_hash;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

CREATE
OR REPLACE FUNCTION public.fn_set_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
length(p_pin) < 4 OR length(p_pin) > 8 THEN
    RAISE EXCEPTION 'PIN harus 4–8 digit';
END IF;
UPDATE public.profiles
SET pin_hash = crypt(p_pin, gen_salt('bf'))
WHERE id = p_user_id;
RETURN
FOUND;
END;
$$;

-- -------------------------------------------------------------------
-- 5.4 ROLES — Null-safe helpers
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_get_user_role(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
v_role TEXT;
BEGIN
  IF
p_user_id IS NULL THEN RETURN NULL;
END IF;
SELECT role::TEXT
INTO v_role
FROM public.profiles
WHERE id = p_user_id
  AND is_active = true;
RETURN v_role;
END;
$$;

CREATE
OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
RETURN COALESCE(public.fn_get_user_role(auth.uid()), '') = 'admin';
END;
$$;

CREATE
OR REPLACE FUNCTION public.fn_is_cashier_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
RETURN COALESCE(public.fn_get_user_role(auth.uid()), '') IN ('cashier', 'admin');
END;
$$;

-- -------------------------------------------------------------------
-- 5.5 TRANSACTIONS — Auto-set cashier_id & shift_id
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_set_transaction_cashier()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.cashier_id IS NULL THEN
    NEW.cashier_id := auth.uid();
END IF;
  IF
NEW.shift_id IS NULL THEN
SELECT id
INTO NEW.shift_id
FROM public.shifts
WHERE cashier_id = NEW.cashier_id
  AND status = 'open'
ORDER BY opened_at DESC LIMIT 1;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_set_cashier ON public.transactions;
CREATE TRIGGER trg_transactions_set_cashier
    BEFORE INSERT
    ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_transaction_cashier();

-- -------------------------------------------------------------------
-- 5.6 TRANSACTIONS — Recalculate total dari items
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_recalculate_transaction_total()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_tid UUID;
  v_sub
INTEGER;
BEGIN
  v_tid
:= CASE WHEN TG_OP = 'DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id
END;
SELECT COALESCE(SUM(subtotal), 0)
INTO v_sub
FROM public.transaction_items
WHERE transaction_id = v_tid;
UPDATE public.transactions
SET subtotal = v_sub,
    total    = v_sub - discount_amount + tax_amount
WHERE id = v_tid;
RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_items_recalc_total ON public.transaction_items;
CREATE TRIGGER trg_tx_items_recalc_total
    AFTER INSERT OR
UPDATE OR
DELETE
ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_transaction_total();

-- -------------------------------------------------------------------
-- 5.7 TRANSACTIONS — Block modify item pada transaksi paid
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_prevent_paid_tx_modification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_status public.payment_status;
BEGIN
SELECT payment_status
INTO v_status
FROM public.transactions
WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id END;
IF
v_status = 'paid' THEN
    RAISE EXCEPTION 'Tidak bisa mengubah item transaksi yang sudah LUNAS';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_items_no_modify_paid ON public.transaction_items;
CREATE TRIGGER trg_tx_items_no_modify_paid
    BEFORE INSERT OR
UPDATE OR
DELETE
ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_paid_tx_modification();

-- -------------------------------------------------------------------
-- 5.8 TRANSACTIONS — Prevent downgrade dari 'paid'
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_prevent_unpay_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Status transaksi LUNAS tidak bisa diubah kembali';
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_prevent_unpay ON public.transactions;
CREATE TRIGGER trg_transactions_prevent_unpay
    BEFORE UPDATE
    ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_unpay_transaction();

-- -------------------------------------------------------------------
-- 5.9 TRANSACTIONS — Auto-expire pending QRIS
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_auto_expire_qris()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.payment_status = 'pending'
     AND NEW.qris_expires_at IS NOT NULL
     AND NEW.qris_expires_at < NOW() THEN
    NEW.payment_status := 'expired';
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_auto_expire ON public.transactions;
CREATE TRIGGER trg_transactions_auto_expire
    BEFORE UPDATE
    ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_auto_expire_qris();

-- -------------------------------------------------------------------
-- 5.10 TRANSACTIONS — Log void ke cashier_actions
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_log_transaction_void()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
OLD.payment_status IS DISTINCT FROM NEW.payment_status
     AND NEW.payment_status = 'cancelled' THEN
    INSERT INTO public.cashier_actions
      (cashier_id, shift_id, action_type, target_id, target_type, pin_verified, notes)
    VALUES
      (NEW.cashier_id, NEW.shift_id, 'void',
       NEW.id::TEXT, 'transaction', true,
       COALESCE(NEW.void_reason, 'Transaction voided'));
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_log_void ON public.transactions;
CREATE TRIGGER trg_transactions_log_void
    AFTER UPDATE
    ON public.transactions
    FOR EACH ROW
    WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.fn_log_transaction_void();

-- -------------------------------------------------------------------
-- 5.11 STOCK — Block direct update ke kolom stock
-- [FIX-4] Cek session variable app.allow_stock_update sebelum block.
--         Jika diset 'true' oleh fn_process_inventory_movement → allow.
--         Jika tidak → reject (mencegah update langsung dari luar ledger).
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_block_direct_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.stock IS DISTINCT FROM OLD.stock THEN
    -- Izinkan hanya jika flag diset oleh fn_process_inventory_movement
    IF current_setting('app.allow_stock_update', true) = 'true' THEN
      RETURN NEW;
END IF;
    RAISE
EXCEPTION
      'Direct stock update dilarang! '
      'Gunakan fn_adjust_stock() atau alur inventory_movements. '
      'Produk: % (id: %)', OLD.name, OLD.id;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_direct_stock_update ON public.products;
CREATE TRIGGER trg_block_direct_stock_update
    BEFORE UPDATE
    ON public.products
    FOR EACH ROW
    WHEN (NEW.stock IS DISTINCT FROM OLD.stock)
  EXECUTE FUNCTION public.fn_block_direct_stock_update();

-- -------------------------------------------------------------------
-- 5.12 INVENTORY MOVEMENTS — Process atomic stock (INTI LEDGER)
-- [FIX-4] Set session var app.allow_stock_update='true' sebelum
--         UPDATE products — reset ke 'false' setelahnya.
--         Ini SATU-SATUNYA fungsi yang boleh mengubah stock.
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
current_stock INTEGER;
  is_tracking
BOOLEAN;
BEGIN
SELECT track_stock
INTO is_tracking
FROM public.products
WHERE id = NEW.product_id;

IF
NOT COALESCE(is_tracking, true) THEN
    NEW.qty_before := 0;
    NEW.qty_after
:= 0;
RETURN NEW;
END IF;

  -- Row Locking — cegah race condition / overselling
  IF
NEW.product_variant_id IS NOT NULL THEN
SELECT cached_stock
INTO current_stock
FROM public.product_variants
WHERE id = NEW.product_variant_id
    FOR UPDATE;
ELSE
SELECT cached_stock
INTO current_stock
FROM public.products
WHERE id = NEW.product_id
    FOR UPDATE;
END IF;

  current_stock
:= COALESCE(current_stock, 0);
  NEW.qty_before
:= current_stock;
  NEW.qty_after
:= current_stock + NEW.qty_change;

  -- Validasi overselling
  IF
NEW.qty_after < 0 AND NEW.movement_type IN ('sale','return_out','damage') THEN
    RAISE EXCEPTION
      'Stok tidak cukup untuk produk ID: %. Tersedia: %, dibutuhkan: %',
      NEW.product_id, current_stock, ABS(NEW.qty_change);
END IF;

  -- [FIX-4] Izinkan UPDATE products.stock via session variable
  PERFORM
set_config('app.allow_stock_update', 'true', true);

  IF
NEW.product_variant_id IS NOT NULL THEN
UPDATE public.product_variants
SET cached_stock = NEW.qty_after
WHERE id = NEW.product_variant_id;
ELSE
UPDATE public.products
SET cached_stock = NEW.qty_after,
    stock        = NEW.qty_after
WHERE id = NEW.product_id;
END IF;

  -- Reset flag setelah UPDATE selesai
  PERFORM
set_config('app.allow_stock_update', 'false', true);

RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_movement_process ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movement_process
    BEFORE INSERT
    ON public.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_process_inventory_movement();

-- -------------------------------------------------------------------
-- 5.13 STOCK — Kurangi stok saat transaksi paid
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
r            RECORD;
  v_deduct_qty
INTEGER;
BEGIN
  IF
OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN RETURN NEW;
END IF;
  IF
NEW.payment_status != 'paid' THEN RETURN NEW;
END IF;

FOR r IN
SELECT ti.product_id,
       ti.product_variant_id,
       ti.qty,
       ti.cost_price,
       COALESCE(pv.conversion_qty, 1) AS conversion_qty
FROM public.transaction_items ti
         LEFT JOIN public.product_variants pv ON pv.id = ti.product_variant_id
WHERE ti.transaction_id = NEW.id LOOP
    v_deduct_qty := r.qty * r.conversion_qty;
INSERT INTO public.inventory_movements
(product_id, product_variant_id, movement_type,
 reference_id, reference_type, qty_change, unit_cost, notes, created_by)
VALUES (r.product_id, r.product_variant_id, 'sale',
        NEW.id, 'transaction', -v_deduct_qty, r.cost_price,
        'Penjualan transaksi ' || NEW.id::TEXT,
        NEW.cashier_id);
END LOOP;

RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_deduct_stock ON public.transactions;
CREATE TRIGGER trg_transactions_deduct_stock
    AFTER UPDATE
    ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_deduct_stock_on_payment();

-- -------------------------------------------------------------------
-- 5.14 STOCK — Kembalikan stok saat void
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_return_stock_on_void()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
r            RECORD;
  v_return_qty
INTEGER;
BEGIN
  IF
OLD.payment_status = 'paid' AND NEW.payment_status = 'cancelled' THEN
    FOR r IN
SELECT ti.product_id,
       ti.product_variant_id,
       ti.qty,
       ti.cost_price,
       COALESCE(pv.conversion_qty, 1) AS conversion_qty
FROM public.transaction_items ti
         LEFT JOIN public.product_variants pv ON pv.id = ti.product_variant_id
WHERE ti.transaction_id = NEW.id LOOP
      v_return_qty := r.qty * r.conversion_qty;
INSERT INTO public.inventory_movements
(product_id, product_variant_id, movement_type,
 reference_id, reference_type, qty_change, unit_cost, notes, created_by)
VALUES (r.product_id, r.product_variant_id, 'void',
        NEW.id, 'transaction', +v_return_qty, r.cost_price,
        'Stok kembali akibat void transaksi ' || NEW.id::TEXT,
        NEW.voided_by);
END LOOP;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_return_stock_void ON public.transactions;
CREATE TRIGGER trg_transactions_return_stock_void
    AFTER UPDATE
    ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_return_stock_on_void();

-- -------------------------------------------------------------------
-- 5.15 STOCK — Tambah stok saat purchase received
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_add_stock_on_purchase_received()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
r RECORD;
BEGIN
  IF
OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('received','partial') THEN
    FOR r IN
SELECT product_id, qty_received, unit_cost
FROM public.purchase_order_items
WHERE purchase_order_id = NEW.id
  AND qty_received > 0
    LOOP
INSERT
INTO public.inventory_movements
(product_id, movement_type, reference_id, reference_type,
 qty_change, unit_cost, notes, created_by)
VALUES
    (r.product_id, 'purchase', NEW.id, 'purchase_order', r.qty_received, r.unit_cost, 'Penerimaan PO ' || NEW.id::TEXT, NEW.received_by);

-- Update HPP saja — bukan update stok langsung
UPDATE public.products
SET cost_price = r.unit_cost
WHERE id = r.product_id;
END LOOP;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_orders_add_stock ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_add_stock
    AFTER UPDATE
    ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_add_stock_on_purchase_received();

-- -------------------------------------------------------------------
-- 5.16 PRODUCTS — Auto-record initial stock saat produk baru
-- [FIX-7] Fallback ke admin jika auth.uid() null (untuk migration/seed)
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_record_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_uid UUID;
BEGIN
  IF
NEW.stock > 0 THEN
    v_uid := auth.uid();

    IF
v_uid IS NULL THEN
      -- Fallback untuk migration/seed script via SQL Editor
SELECT id
INTO v_uid
FROM public.profiles
WHERE role = 'admin'
  AND is_active = true LIMIT 1;

IF
v_uid IS NULL THEN
        RAISE EXCEPTION
          'Gagal buat stok awal: tidak ada auth.uid() maupun admin aktif. '
          'Pastikan sudah ada user admin atau jalankan via sesi aplikasi.';
END IF;
END IF;

INSERT INTO public.inventory_movements (product_id, product_variant_id, movement_type,
                                        reference_type, reference_id, qty_change,
                                        unit_cost, notes, created_by)
VALUES (NEW.id, NULL, 'adjustment',
        'manual', NEW.id, NEW.stock,
        NEW.cost_price, 'Stok awal saat pendaftaran produk', v_uid);
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
    AFTER INSERT
    ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.fn_record_initial_stock();

-- -------------------------------------------------------------------
-- 5.17 PRODUCTS — Block stok negatif (safety net terakhir)
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_prevent_negative_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.stock < 0 THEN
    RAISE EXCEPTION 'Stok tidak bisa negatif untuk produk: % (id: %)',
      NEW.name, NEW.id;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_check_stock ON public.products;
CREATE TRIGGER trg_products_check_stock
    BEFORE UPDATE
    ON public.products
    FOR EACH ROW
    WHEN (NEW.stock < 0)
    EXECUTE FUNCTION public.fn_prevent_negative_stock();

-- -------------------------------------------------------------------
-- 5.18 CATEGORIES — Cascade deactivate produk
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_deactivate_category_products()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.is_active = false AND OLD.is_active = true THEN
UPDATE public.products
SET is_active = false
WHERE category_id = NEW.id
  AND is_active = true;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_deactivate_products ON public.categories;
CREATE TRIGGER trg_categories_deactivate_products
    AFTER UPDATE
    ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_deactivate_category_products();

-- -------------------------------------------------------------------
-- 5.19 PRODUCT VARIANTS — Enforce single default per produk
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_ensure_single_default_variant()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.is_default = true THEN
UPDATE public.product_variants
SET is_default = false
WHERE product_id = NEW.product_id
  AND id != NEW.id;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_variants_single_default ON public.product_variants;
CREATE TRIGGER trg_variants_single_default
    BEFORE INSERT OR
UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_single_default_variant();

-- -------------------------------------------------------------------
-- 5.20 PRODUCT VARIANTS — Auto-hitung cost_price jika inherit = true
-- [NEW-2] Fitur inherit_cost_price: cost_price = parent.cost_price * conversion_qty
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_sync_variant_cost_price()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_parent_cost INTEGER;
BEGIN
  IF
NEW.inherit_cost_price = true THEN
SELECT cost_price
INTO v_parent_cost
FROM public.products
WHERE id = NEW.product_id;
NEW
.
cost_price
:= COALESCE(v_parent_cost, 0) * NEW.conversion_qty;
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_variants_sync_cost_price ON public.product_variants;
CREATE TRIGGER trg_variants_sync_cost_price
    BEFORE INSERT OR
UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_variant_cost_price();

-- -------------------------------------------------------------------
-- 5.21 CUSTOMER DEBTS — Auto-update status hutang
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_update_debt_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
NEW.paid_amount >= NEW.amount THEN
    NEW.status := 'paid';
  ELSIF
NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
ELSE
    NEW.status := 'outstanding';
END IF;

UPDATE public.customers
SET total_debt = (SELECT COALESCE(SUM(remaining), 0)
                  FROM public.customer_debts
                  WHERE customer_id = NEW.customer_id
                    AND status != 'paid'
    )
WHERE id = NEW.customer_id;

RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debts_update_status ON public.customer_debts;
CREATE TRIGGER trg_debts_update_status
    BEFORE UPDATE
    ON public.customer_debts
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_debt_status();

-- -------------------------------------------------------------------
-- 5.22 DEBT PAYMENTS — Apply pembayaran ke hutang
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_apply_debt_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
UPDATE public.customer_debts
SET paid_amount = paid_amount + NEW.amount
WHERE id = NEW.debt_id;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debt_payments_apply ON public.debt_payments;
CREATE TRIGGER trg_debt_payments_apply
    AFTER INSERT
    ON public.debt_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_apply_debt_payment();

-- -------------------------------------------------------------------
-- 5.23 SHIFTS — Prevent duplicate shift terbuka
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_prevent_duplicate_open_shift()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF
EXISTS (
    SELECT 1 FROM public.shifts
    WHERE cashier_id = NEW.cashier_id
      AND status = 'open'
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Kasir ini sudah memiliki shift yang sedang buka';
END IF;
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shifts_prevent_duplicate ON public.shifts;
CREATE TRIGGER trg_shifts_prevent_duplicate
    BEFORE INSERT
    ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_duplicate_open_shift();

-- -------------------------------------------------------------------
-- 5.24 UTILITY — Product search dengan trigram
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_search_products(
  p_query    TEXT,
  p_category UUID    DEFAULT NULL,
  p_limit    INTEGER DEFAULT 20,
  p_offset   INTEGER DEFAULT 0
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  barcode     TEXT,
  price       INTEGER,
  stock       INTEGER,
  image_url   TEXT,
  category_id UUID,
  similarity  REAL
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
RETURN QUERY
SELECT p.id,
       p.name,
       p.barcode,
       p.price,
       p.stock,
       p.image_url,
       p.category_id,
       similarity(p.name, p_query) AS similarity
FROM public.products p
WHERE p.is_active = true
  AND (p_category IS NULL OR p.category_id = p_category)
  AND (
    p.name ILIKE '%' || p_query || '%'
      OR p.barcode = p_query
      OR similarity(p.name, p_query) > 0.2
    )
ORDER BY CASE WHEN p.barcode = p_query THEN 0 ELSE 1 END,
         similarity(p.name, p_query) DESC,
         p.name ASC LIMIT p_limit
OFFSET p_offset;
END;
$$;

-- -------------------------------------------------------------------
-- 5.25 UTILITY — Sales report per periode
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_sales_report(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE (
  total_transactions BIGINT,
  total_revenue      BIGINT,
  total_cost         BIGINT,
  gross_profit       BIGINT,
  total_items_sold   BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
RETURN QUERY
SELECT COUNT(DISTINCT t.id),
       COALESCE(SUM(t.total)::BIGINT, 0),
       COALESCE(SUM(ti.cost_price * ti.qty)::BIGINT, 0),
       COALESCE(SUM(t.total) ::BIGINT - SUM(ti.cost_price * ti.qty) ::BIGINT, 0),
       COALESCE(SUM(ti.qty)::BIGINT, 0)
FROM public.transactions t
         JOIN public.transaction_items ti ON ti.transaction_id = t.id
WHERE t.payment_status = 'paid'
  AND t.created_at BETWEEN p_from AND p_to;
END;
$$;

-- -------------------------------------------------------------------
-- 5.26 UTILITY — Generate daily report
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.generate_daily_report(
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
report_id                  UUID;
  total_sales_val
BIGINT  := 0;
  total_transactions_val
INTEGER := 0;
  paid_transactions_val
INTEGER := 0;
  pending_transactions_val
INTEGER := 0;
  cancelled_transactions_val
INTEGER := 0;
  expired_transactions_val
INTEGER := 0;
  average_transaction_val
BIGINT  := 0;
  total_items_sold_val
INTEGER := 0;
  start_ts
TIMESTAMPTZ;
  end_ts
TIMESTAMPTZ;
BEGIN
  start_ts
:= (target_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta');
  end_ts
:= start_ts + INTERVAL '1 day';

SELECT COALESCE(SUM(total) FILTER(WHERE payment_status = 'paid'), 0),
       COUNT(*),
       COUNT(*) FILTER (WHERE payment_status = 'paid'), COUNT(*) FILTER (WHERE payment_status = 'pending'), COUNT(*) FILTER (WHERE payment_status = 'cancelled'), COUNT(*) FILTER (WHERE payment_status = 'expired'), CASE
    WHEN COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
        THEN SUM(total) FILTER (WHERE payment_status = 'paid')
           / COUNT(*) FILTER (WHERE payment_status = 'paid')
      ELSE 0
END
INTO
    total_sales_val, total_transactions_val,
    paid_transactions_val, pending_transactions_val,
    cancelled_transactions_val, expired_transactions_val,
    average_transaction_val
  FROM public.transactions
  WHERE created_at >= start_ts AND created_at < end_ts;

SELECT COALESCE(SUM(ti.qty), 0)
INTO total_items_sold_val
FROM public.transaction_items ti
         JOIN public.transactions t ON ti.transaction_id = t.id
WHERE t.created_at >= start_ts
  AND t.created_at < end_ts
  AND t.payment_status = 'paid';

INSERT INTO public.daily_reports (report_date, total_sales, total_transactions,
                                  paid_transactions, pending_transactions, cancelled_transactions,
                                  expired_transactions, average_transaction_value, total_items_sold)
VALUES (target_date, total_sales_val, total_transactions_val,
        paid_transactions_val, pending_transactions_val, cancelled_transactions_val,
        expired_transactions_val, average_transaction_val, total_items_sold_val) ON CONFLICT (report_date) DO
UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_transactions = EXCLUDED.total_transactions,
    paid_transactions = EXCLUDED.paid_transactions,
    pending_transactions = EXCLUDED.pending_transactions,
    cancelled_transactions = EXCLUDED.cancelled_transactions,
    expired_transactions = EXCLUDED.expired_transactions,
    average_transaction_value = EXCLUDED.average_transaction_value,
    total_items_sold = EXCLUDED.total_items_sold,
    updated_at = NOW()
    RETURNING id
INTO report_id;

RETURN report_id;
END;
$$;

-- -------------------------------------------------------------------
-- 5.27 [NEW-1] fn_adjust_stock — Clean RPC API untuk stock adjustment
-- Hanya admin yang bisa memanggil ini. Mencatat ke inventory_movements
-- sehingga semua mutasi tetap ter-audit di ledger.
-- -------------------------------------------------------------------
CREATE
OR REPLACE FUNCTION public.fn_adjust_stock(
  p_product_id UUID,
  p_qty_change  INTEGER,
  p_notes       TEXT    DEFAULT NULL,
  p_variant_id  UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
v_movement_id UUID;
  v_uid
UUID := auth.uid();
BEGIN
  IF
NOT public.fn_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang bisa melakukan stock adjustment manual';
END IF;

  IF
p_qty_change = 0 THEN
    RAISE EXCEPTION 'qty_change tidak boleh 0';
END IF;

INSERT INTO public.inventory_movements (product_id, product_variant_id, movement_type,
                                        reference_type, qty_change, notes, created_by)
VALUES (p_product_id, p_variant_id, 'adjustment',
        'manual', p_qty_change,
        COALESCE(p_notes, 'Manual stock adjustment by admin'),
        v_uid) RETURNING id
INTO v_movement_id;

RETURN v_movement_id;
END;
$$;
COMMENT
ON FUNCTION public.fn_adjust_stock IS
  'RPC untuk admin adjustment stok. Semua perubahan masuk ke inventory_movements (auditable).';

-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES -------------------------------------------------------
DROP
POLICY IF EXISTS "profiles:own_select"   ON public.profiles;
DROP
POLICY IF EXISTS "profiles:own_update"   ON public.profiles;
DROP
POLICY IF EXISTS "profiles:own_insert"   ON public.profiles;
DROP
POLICY IF EXISTS "profiles:admin_select" ON public.profiles;
DROP
POLICY IF EXISTS "profiles:admin_insert" ON public.profiles;
DROP
POLICY IF EXISTS "profiles:admin_update" ON public.profiles;
DROP
POLICY IF EXISTS "profiles:admin_delete" ON public.profiles;
DROP
POLICY IF EXISTS "profiles:service_role" ON public.profiles;

CREATE
POLICY "profiles:own_select"
  ON public.profiles FOR
SELECT TO authenticated
    USING (id = auth.uid());
CREATE
POLICY "profiles:own_update"
  ON public.profiles FOR
UPDATE TO authenticated
    USING (id = auth.uid())
WITH CHECK (id = auth.uid());
CREATE
POLICY "profiles:own_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE
POLICY "profiles:admin_select"
  ON public.profiles FOR
SELECT TO authenticated
    USING (public.fn_is_admin());
CREATE
POLICY "profiles:admin_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "profiles:admin_update"
  ON public.profiles FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "profiles:admin_delete"
  ON public.profiles FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "profiles:service_role"
  ON public.profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- UNITS ----------------------------------------------------------
DROP
POLICY IF EXISTS "units:admin_insert" ON public.units;
DROP
POLICY IF EXISTS "units:admin_update" ON public.units;
DROP
POLICY IF EXISTS "units:admin_delete" ON public.units;
DROP
POLICY IF EXISTS "units:auth_select"  ON public.units;
DROP
POLICY IF EXISTS "units:anon_select"  ON public.units;
DROP
POLICY IF EXISTS "units:service_role" ON public.units;

CREATE
POLICY "units:admin_insert"
  ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "units:admin_update"
  ON public.units FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "units:admin_delete"
  ON public.units FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "units:auth_select"
  ON public.units FOR
SELECT TO authenticated
    USING (is_active = true);
CREATE
POLICY "units:anon_select"
  ON public.units FOR
SELECT TO anon
    USING (is_active = true);
CREATE
POLICY "units:service_role"
  ON public.units FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- CATEGORIES -----------------------------------------------------
DROP
POLICY IF EXISTS "categories:admin_insert" ON public.categories;
DROP
POLICY IF EXISTS "categories:admin_update" ON public.categories;
DROP
POLICY IF EXISTS "categories:admin_delete" ON public.categories;
DROP
POLICY IF EXISTS "categories:auth_select"  ON public.categories;
DROP
POLICY IF EXISTS "categories:anon_select"  ON public.categories;
DROP
POLICY IF EXISTS "categories:service_role" ON public.categories;

CREATE
POLICY "categories:admin_insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "categories:admin_update"
  ON public.categories FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "categories:admin_delete"
  ON public.categories FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "categories:auth_select"
  ON public.categories FOR
SELECT TO authenticated
    USING (is_active = true);
CREATE
POLICY "categories:anon_select"
  ON public.categories FOR
SELECT TO anon
    USING (is_active = true);
CREATE
POLICY "categories:service_role"
  ON public.categories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- SUPPLIERS ------------------------------------------------------
DROP
POLICY IF EXISTS "suppliers:admin_insert"   ON public.suppliers;
DROP
POLICY IF EXISTS "suppliers:admin_update"   ON public.suppliers;
DROP
POLICY IF EXISTS "suppliers:admin_delete"   ON public.suppliers;
DROP
POLICY IF EXISTS "suppliers:cashier_select" ON public.suppliers;
DROP
POLICY IF EXISTS "suppliers:service_role"   ON public.suppliers;

CREATE
POLICY "suppliers:admin_insert"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "suppliers:admin_update"
  ON public.suppliers FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "suppliers:admin_delete"
  ON public.suppliers FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "suppliers:cashier_select"
  ON public.suppliers FOR
SELECT TO authenticated
    USING (is_active = true AND public.fn_is_cashier_or_admin());
CREATE
POLICY "suppliers:service_role"
  ON public.suppliers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- PRODUCTS -------------------------------------------------------
DROP
POLICY IF EXISTS "products:admin_insert"   ON public.products;
DROP
POLICY IF EXISTS "products:admin_update"   ON public.products;
DROP
POLICY IF EXISTS "products:admin_delete"   ON public.products;
DROP
POLICY IF EXISTS "products:cashier_select" ON public.products;
DROP
POLICY IF EXISTS "products:anon_select"    ON public.products;
DROP
POLICY IF EXISTS "products:service_role"   ON public.products;

CREATE
POLICY "products:admin_insert"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "products:admin_update"
  ON public.products FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "products:admin_delete"
  ON public.products FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "products:cashier_select"
  ON public.products FOR
SELECT TO authenticated
    USING (is_active = true AND public.fn_is_cashier_or_admin());
CREATE
POLICY "products:anon_select"
  ON public.products FOR
SELECT TO anon
    USING (is_active = true);
CREATE
POLICY "products:service_role"
  ON public.products FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- PRODUCT VARIANTS -----------------------------------------------
DROP
POLICY IF EXISTS "variants:admin_insert" ON public.product_variants;
DROP
POLICY IF EXISTS "variants:admin_update" ON public.product_variants;
DROP
POLICY IF EXISTS "variants:admin_delete" ON public.product_variants;
DROP
POLICY IF EXISTS "variants:auth_select"  ON public.product_variants;
DROP
POLICY IF EXISTS "variants:anon_select"  ON public.product_variants;
DROP
POLICY IF EXISTS "variants:service_role" ON public.product_variants;

CREATE
POLICY "variants:admin_insert"
  ON public.product_variants FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "variants:admin_update"
  ON public.product_variants FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "variants:admin_delete"
  ON public.product_variants FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "variants:auth_select"
  ON public.product_variants FOR
SELECT TO authenticated
    USING (is_active = true);
CREATE
POLICY "variants:anon_select"
  ON public.product_variants FOR
SELECT TO anon
    USING (is_active = true);
CREATE
POLICY "variants:service_role"
  ON public.product_variants FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- DISCOUNTS ------------------------------------------------------
DROP
POLICY IF EXISTS "discounts:admin_insert" ON public.discounts;
DROP
POLICY IF EXISTS "discounts:admin_update" ON public.discounts;
DROP
POLICY IF EXISTS "discounts:admin_delete" ON public.discounts;
DROP
POLICY IF EXISTS "discounts:auth_select"  ON public.discounts;
DROP
POLICY IF EXISTS "discounts:service_role" ON public.discounts;

CREATE
POLICY "discounts:admin_insert"
  ON public.discounts FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "discounts:admin_update"
  ON public.discounts FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "discounts:admin_delete"
  ON public.discounts FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "discounts:auth_select"
  ON public.discounts FOR
SELECT TO authenticated
    USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));
CREATE
POLICY "discounts:service_role"
  ON public.discounts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- SHIFTS ---------------------------------------------------------
DROP
POLICY IF EXISTS "shifts:admin_insert"       ON public.shifts;
DROP
POLICY IF EXISTS "shifts:admin_update"       ON public.shifts;
DROP
POLICY IF EXISTS "shifts:admin_delete"       ON public.shifts;
DROP
POLICY IF EXISTS "shifts:admin_select"       ON public.shifts;
DROP
POLICY IF EXISTS "shifts:cashier_own_select" ON public.shifts;
DROP
POLICY IF EXISTS "shifts:cashier_insert"     ON public.shifts;
DROP
POLICY IF EXISTS "shifts:cashier_update_own" ON public.shifts;
DROP
POLICY IF EXISTS "shifts:service_role"       ON public.shifts;

CREATE
POLICY "shifts:admin_select"
  ON public.shifts FOR
SELECT TO authenticated
    USING (public.fn_is_admin());
CREATE
POLICY "shifts:admin_insert"
  ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "shifts:admin_update"
  ON public.shifts FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "shifts:admin_delete"
  ON public.shifts FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "shifts:cashier_own_select"
  ON public.shifts FOR
SELECT TO authenticated
    USING (cashier_id = auth.uid());
CREATE
POLICY "shifts:cashier_insert"
  ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "shifts:cashier_update_own"
  ON public.shifts FOR
UPDATE TO authenticated
    USING (cashier_id = auth.uid() AND status = 'open')
WITH CHECK (cashier_id = auth.uid());
CREATE
POLICY "shifts:service_role"
  ON public.shifts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- CUSTOMERS ------------------------------------------------------
DROP
POLICY IF EXISTS "customers:admin_insert"   ON public.customers;
DROP
POLICY IF EXISTS "customers:admin_update"   ON public.customers;
DROP
POLICY IF EXISTS "customers:admin_delete"   ON public.customers;
DROP
POLICY IF EXISTS "customers:cashier_select" ON public.customers;
DROP
POLICY IF EXISTS "customers:cashier_insert" ON public.customers;
DROP
POLICY IF EXISTS "customers:cashier_update" ON public.customers;
DROP
POLICY IF EXISTS "customers:service_role"   ON public.customers;

CREATE
POLICY "customers:admin_insert"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "customers:admin_update"
  ON public.customers FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "customers:admin_delete"
  ON public.customers FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "customers:cashier_select"
  ON public.customers FOR
SELECT TO authenticated
    USING (is_active = true AND public.fn_is_cashier_or_admin());
CREATE
POLICY "customers:cashier_insert"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_cashier_or_admin());
CREATE
POLICY "customers:cashier_update"
  ON public.customers FOR
UPDATE TO authenticated
    USING (public.fn_is_cashier_or_admin())
WITH CHECK (public.fn_is_cashier_or_admin());
CREATE
POLICY "customers:service_role"
  ON public.customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- TRANSACTIONS ---------------------------------------------------
DROP
POLICY IF EXISTS "tx:admin_select"       ON public.transactions;
DROP
POLICY IF EXISTS "tx:admin_insert"       ON public.transactions;
DROP
POLICY IF EXISTS "tx:admin_update"       ON public.transactions;
DROP
POLICY IF EXISTS "tx:admin_delete"       ON public.transactions;
DROP
POLICY IF EXISTS "tx:cashier_own_select" ON public.transactions;
DROP
POLICY IF EXISTS "tx:cashier_insert"     ON public.transactions;
DROP
POLICY IF EXISTS "tx:cashier_update"     ON public.transactions;
DROP
POLICY IF EXISTS "tx:service_role"       ON public.transactions;

CREATE
POLICY "tx:admin_select"
  ON public.transactions FOR
SELECT TO authenticated
    USING (public.fn_is_admin());
CREATE
POLICY "tx:admin_insert"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "tx:admin_update"
  ON public.transactions FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "tx:admin_delete"
  ON public.transactions FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "tx:cashier_own_select"
  ON public.transactions FOR
SELECT TO authenticated
    USING (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "tx:cashier_insert"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_cashier_or_admin());
CREATE
POLICY "tx:cashier_update"
  ON public.transactions FOR
UPDATE TO authenticated
    USING (cashier_id = auth.uid() AND payment_status = 'pending')
WITH CHECK (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "tx:service_role"
  ON public.transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- TRANSACTION ITEMS ----------------------------------------------
DROP
POLICY IF EXISTS "tx_items:admin_select"       ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:admin_insert"       ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:admin_update"       ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:admin_delete"       ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:cashier_own_select" ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:cashier_insert"     ON public.transaction_items;
DROP
POLICY IF EXISTS "tx_items:service_role"       ON public.transaction_items;

CREATE
POLICY "tx_items:admin_select"
  ON public.transaction_items FOR
SELECT TO authenticated
    USING (public.fn_is_admin());
CREATE
POLICY "tx_items:admin_insert"
  ON public.transaction_items FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "tx_items:admin_update"
  ON public.transaction_items FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "tx_items:admin_delete"
  ON public.transaction_items FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "tx_items:cashier_own_select"
  ON public.transaction_items FOR
SELECT TO authenticated
    USING (
    EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id AND t.cashier_id = auth.uid()
    )
    );
CREATE
POLICY "tx_items:cashier_insert"
  ON public.transaction_items FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_cashier_or_admin() AND
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND t.cashier_id = auth.uid()
    )
  );
CREATE
POLICY "tx_items:service_role"
  ON public.transaction_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- PURCHASE ORDERS ------------------------------------------------
DROP
POLICY IF EXISTS "po:admin_insert"   ON public.purchase_orders;
DROP
POLICY IF EXISTS "po:admin_update"   ON public.purchase_orders;
DROP
POLICY IF EXISTS "po:admin_delete"   ON public.purchase_orders;
DROP
POLICY IF EXISTS "po:cashier_select" ON public.purchase_orders;
DROP
POLICY IF EXISTS "po:service_role"   ON public.purchase_orders;

CREATE
POLICY "po:admin_insert"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "po:admin_update"
  ON public.purchase_orders FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "po:admin_delete"
  ON public.purchase_orders FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "po:cashier_select"
  ON public.purchase_orders FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "po:service_role"
  ON public.purchase_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- PURCHASE ORDER ITEMS -------------------------------------------
DROP
POLICY IF EXISTS "poi:admin_insert"   ON public.purchase_order_items;
DROP
POLICY IF EXISTS "poi:admin_update"   ON public.purchase_order_items;
DROP
POLICY IF EXISTS "poi:admin_delete"   ON public.purchase_order_items;
DROP
POLICY IF EXISTS "poi:cashier_select" ON public.purchase_order_items;
DROP
POLICY IF EXISTS "poi:service_role"   ON public.purchase_order_items;

CREATE
POLICY "poi:admin_insert"
  ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "poi:admin_update"
  ON public.purchase_order_items FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "poi:admin_delete"
  ON public.purchase_order_items FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "poi:cashier_select"
  ON public.purchase_order_items FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "poi:service_role"
  ON public.purchase_order_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- STOCK MOVEMENTS (legacy) ---------------------------------------
DROP
POLICY IF EXISTS "stock_mov:admin_insert"   ON public.stock_movements;
DROP
POLICY IF EXISTS "stock_mov:admin_update"   ON public.stock_movements;
DROP
POLICY IF EXISTS "stock_mov:admin_delete"   ON public.stock_movements;
DROP
POLICY IF EXISTS "stock_mov:cashier_select" ON public.stock_movements;
DROP
POLICY IF EXISTS "stock_mov:service_role"   ON public.stock_movements;

CREATE
POLICY "stock_mov:admin_insert"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "stock_mov:admin_update"
  ON public.stock_movements FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "stock_mov:admin_delete"
  ON public.stock_movements FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "stock_mov:cashier_select"
  ON public.stock_movements FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "stock_mov:service_role"
  ON public.stock_movements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- INVENTORY MOVEMENTS --------------------------------------------
DROP
POLICY IF EXISTS "inv_mov:admin_all"      ON public.inventory_movements;
DROP
POLICY IF EXISTS "inv_mov:cashier_insert" ON public.inventory_movements;
DROP
POLICY IF EXISTS "inv_mov:cashier_select" ON public.inventory_movements;
DROP
POLICY IF EXISTS "inv_mov:service_role"   ON public.inventory_movements;

CREATE
POLICY "inv_mov:admin_all"
  ON public.inventory_movements FOR ALL TO authenticated
  USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());
CREATE
POLICY "inv_mov:cashier_insert"
  ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (
    movement_type IN ('sale','return_in','void')
    AND created_by = auth.uid()
  );
CREATE
POLICY "inv_mov:cashier_select"
  ON public.inventory_movements FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "inv_mov:service_role"
  ON public.inventory_movements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- CUSTOMER DEBTS -------------------------------------------------
DROP
POLICY IF EXISTS "debts:admin_insert"   ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:admin_update"   ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:admin_delete"   ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:cashier_select" ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:cashier_insert" ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:cashier_update" ON public.customer_debts;
DROP
POLICY IF EXISTS "debts:service_role"   ON public.customer_debts;

CREATE
POLICY "debts:admin_insert"
  ON public.customer_debts FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "debts:admin_update"
  ON public.customer_debts FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "debts:admin_delete"
  ON public.customer_debts FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "debts:cashier_select"
  ON public.customer_debts FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "debts:cashier_insert"
  ON public.customer_debts FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "debts:cashier_update"
  ON public.customer_debts FOR
UPDATE TO authenticated
    USING (public.fn_is_cashier_or_admin())
WITH CHECK (public.fn_is_cashier_or_admin());
CREATE
POLICY "debts:service_role"
  ON public.customer_debts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- DEBT PAYMENTS --------------------------------------------------
DROP
POLICY IF EXISTS "debt_pay:admin_insert"   ON public.debt_payments;
DROP
POLICY IF EXISTS "debt_pay:admin_update"   ON public.debt_payments;
DROP
POLICY IF EXISTS "debt_pay:admin_delete"   ON public.debt_payments;
DROP
POLICY IF EXISTS "debt_pay:cashier_select" ON public.debt_payments;
DROP
POLICY IF EXISTS "debt_pay:cashier_insert" ON public.debt_payments;
DROP
POLICY IF EXISTS "debt_pay:service_role"   ON public.debt_payments;

CREATE
POLICY "debt_pay:admin_insert"
  ON public.debt_payments FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "debt_pay:admin_update"
  ON public.debt_payments FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "debt_pay:admin_delete"
  ON public.debt_payments FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "debt_pay:cashier_select"
  ON public.debt_payments FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "debt_pay:cashier_insert"
  ON public.debt_payments FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "debt_pay:service_role"
  ON public.debt_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- CASHIER ACTIONS ------------------------------------------------
DROP
POLICY IF EXISTS "ca:admin_select"       ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:admin_insert"       ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:admin_update"       ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:admin_delete"       ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:cashier_own_select" ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:cashier_insert"     ON public.cashier_actions;
DROP
POLICY IF EXISTS "ca:service_role"       ON public.cashier_actions;

CREATE
POLICY "ca:admin_select"
  ON public.cashier_actions FOR
SELECT TO authenticated
    USING (public.fn_is_admin());
CREATE
POLICY "ca:admin_insert"
  ON public.cashier_actions FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "ca:admin_update"
  ON public.cashier_actions FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "ca:admin_delete"
  ON public.cashier_actions FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "ca:cashier_own_select"
  ON public.cashier_actions FOR
SELECT TO authenticated
    USING (cashier_id = auth.uid());
CREATE
POLICY "ca:cashier_insert"
  ON public.cashier_actions FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid() AND public.fn_is_cashier_or_admin());
CREATE
POLICY "ca:service_role"
  ON public.cashier_actions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- SETTINGS -------------------------------------------------------
DROP
POLICY IF EXISTS "settings:admin_insert"       ON public.settings;
DROP
POLICY IF EXISTS "settings:admin_update"       ON public.settings;
DROP
POLICY IF EXISTS "settings:admin_delete"       ON public.settings;
DROP
POLICY IF EXISTS "settings:cashier_select"     ON public.settings;
DROP
POLICY IF EXISTS "settings:anon_public_select" ON public.settings;
DROP
POLICY IF EXISTS "settings:service_role"       ON public.settings;

CREATE
POLICY "settings:admin_insert"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin());
CREATE
POLICY "settings:admin_update"
  ON public.settings FOR
UPDATE TO authenticated
    USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());
CREATE
POLICY "settings:admin_delete"
  ON public.settings FOR DELETE
TO authenticated
  USING (public.fn_is_admin());
CREATE
POLICY "settings:cashier_select"
  ON public.settings FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "settings:anon_public_select"
  ON public.settings FOR
SELECT TO anon
    USING (is_encrypted = false);
CREATE
POLICY "settings:service_role"
  ON public.settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- DAILY REPORTS --------------------------------------------------
DROP
POLICY IF EXISTS "daily_reports:admin_all"      ON public.daily_reports;
DROP
POLICY IF EXISTS "daily_reports:cashier_select" ON public.daily_reports;
DROP
POLICY IF EXISTS "daily_reports:service_role"   ON public.daily_reports;

CREATE
POLICY "daily_reports:admin_all"
  ON public.daily_reports FOR ALL TO authenticated
  USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());
CREATE
POLICY "daily_reports:cashier_select"
  ON public.daily_reports FOR
SELECT TO authenticated
    USING (public.fn_is_cashier_or_admin());
CREATE
POLICY "daily_reports:service_role"
  ON public.daily_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================================
-- 7. STORAGE BUCKETS & POLICIES
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
       ('avatars', 'avatars', false, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp']),
       ('receipts', 'receipts', false, 10485760,
        ARRAY['application/pdf', 'image/png', 'image/jpeg']),
       ('attachments', 'attachments', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png']) ON CONFLICT (id) DO
UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- product-images (public read, admin write) ----------------------
DROP
POLICY IF EXISTS "product_images:public_select" ON storage.objects;
DROP
POLICY IF EXISTS "product_images:admin_insert"  ON storage.objects;
DROP
POLICY IF EXISTS "product_images:admin_update"  ON storage.objects;
DROP
POLICY IF EXISTS "product_images:admin_delete"  ON storage.objects;

CREATE
POLICY "product_images:public_select"
  ON storage.objects FOR
SELECT TO public
    USING (bucket_id = 'product-images');
CREATE
POLICY "product_images:admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.fn_is_admin());
CREATE
POLICY "product_images:admin_update"
  ON storage.objects FOR
UPDATE TO authenticated
    USING (bucket_id = 'product-images' AND public.fn_is_admin());
CREATE
POLICY "product_images:admin_delete"
  ON storage.objects FOR DELETE
TO authenticated
  USING (bucket_id = 'product-images' AND public.fn_is_admin());

-- ---- avatars (per-user folder + admin all) --------------------------
DROP
POLICY IF EXISTS "avatars:own_select" ON storage.objects;
DROP
POLICY IF EXISTS "avatars:own_insert" ON storage.objects;
DROP
POLICY IF EXISTS "avatars:own_update" ON storage.objects;
DROP
POLICY IF EXISTS "avatars:own_delete" ON storage.objects;
DROP
POLICY IF EXISTS "avatars:admin_all"  ON storage.objects;

CREATE
POLICY "avatars:own_select"
  ON storage.objects FOR
SELECT TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE
POLICY "avatars:own_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE
POLICY "avatars:own_update"
  ON storage.objects FOR
UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE
POLICY "avatars:own_delete"
  ON storage.objects FOR DELETE
TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE
POLICY "avatars:admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND public.fn_is_admin())
  WITH CHECK (bucket_id = 'avatars' AND public.fn_is_admin());

-- ---- receipts (kasir per-folder + admin all) ------------------------
DROP
POLICY IF EXISTS "receipts:cashier_own"    ON storage.objects;
DROP
POLICY IF EXISTS "receipts:cashier_insert" ON storage.objects;
DROP
POLICY IF EXISTS "receipts:admin_all"      ON storage.objects;
DROP
POLICY IF EXISTS "receipts:service_role"   ON storage.objects;

CREATE
POLICY "receipts:cashier_own"
  ON storage.objects FOR
SELECT TO authenticated
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE
POLICY "receipts:cashier_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.fn_is_cashier_or_admin()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
CREATE
POLICY "receipts:admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'receipts' AND public.fn_is_admin())
  WITH CHECK (bucket_id = 'receipts' AND public.fn_is_admin());
CREATE
POLICY "receipts:service_role"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');

-- ---- attachments (admin only) ---------------------------------------
DROP
POLICY IF EXISTS "attachments:admin_all"    ON storage.objects;
DROP
POLICY IF EXISTS "attachments:service_role" ON storage.objects;

CREATE
POLICY "attachments:admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'attachments' AND public.fn_is_admin())
  WITH CHECK (bucket_id = 'attachments' AND public.fn_is_admin());
CREATE
POLICY "attachments:service_role"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

-- =====================================================================
-- 8. GRANTS
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.fn_is_admin
()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_cashier_or_admin
() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_user_role
(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_pin
(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_pin
(UUID,TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_search_products
(TEXT,UUID,INTEGER,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sales_report
(TIMESTAMPTZ,TIMESTAMPTZ)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_report
(DATE)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_adjust_stock
(UUID,INTEGER,TEXT,UUID)      TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.inventory_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inventory_movements TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO service_role;

GRANT
ALL
ON storage.buckets TO authenticated;
GRANT ALL
ON storage.objects TO authenticated;

-- =====================================================================
-- 9. SEED DATA
-- =====================================================================
INSERT INTO public.units (name, symbol)
VALUES ('Piece / Satuan', 'pcs'),
       ('Kilogram', 'kg'),
       ('Gram', 'gr'),
       ('Liter', 'ltr'),
       ('Mililiter', 'ml'),
       ('Pack / Bungkus', 'pck'),
       ('Box / Kotak', 'box'),
       ('Karton / Dus', 'dus'),
       ('Lusin', 'lsn'),
       ('Ikat', 'ikt'),
       ('Botol', 'btl'),
       ('Kaleng', 'klg'),
       ('Sachet', 'sct'),
       ('Meter', 'mtr') ON CONFLICT (symbol) DO NOTHING;

INSERT INTO public.settings (category, key, value, description, data_type)
VALUES ('store', 'name', 'Toko Kelontong', 'Nama toko', 'string'),
       ('store', 'address', '', 'Alamat toko', 'string'),
       ('store', 'phone', '', 'Nomor telepon toko', 'string'),
       ('store', 'tagline', '', 'Tagline / slogan toko', 'string'),
       ('store', 'logo_url', '', 'URL logo toko', 'string'),
       ('store', 'currency', 'IDR', 'Mata uang', 'string'),
       ('store', 'timezone', 'Asia/Jakarta', 'Timezone toko', 'string'),
       ('transaction', 'tax_percentage', '0', 'Pajak dalam persen (0 = tidak ada)', 'integer'),
       ('transaction', 'receipt_footer', 'Terima kasih atas kunjungan Anda!', 'Footer struk', 'string'),
       ('transaction', 'receipt_header', '', 'Header struk tambahan', 'string'),
       ('transaction', 'print_receipt', 'true', 'Cetak struk otomatis setelah bayar', 'boolean'),
       ('payment', 'qris_enabled', 'false', 'Aktifkan pembayaran QRIS', 'boolean'),
       ('payment', 'cash_enabled', 'true', 'Aktifkan pembayaran tunai', 'boolean'),
       ('payment', 'transfer_enabled', 'false', 'Aktifkan pembayaran transfer', 'boolean'),
       ('payment', 'debt_enabled', 'true', 'Aktifkan fitur hutang pelanggan', 'boolean'),
       ('payment', 'midtrans_env', 'sandbox', 'Midtrans environment: sandbox atau production', 'string'),
       ('stock', 'low_stock_alert', 'true', 'Aktifkan notifikasi stok minimum', 'boolean'),
       ('stock', 'auto_deduct', 'true', 'Kurangi stok otomatis setelah transaksi lunas', 'boolean'),
       ('shift', 'required', 'true', 'Wajib buka shift sebelum transaksi', 'boolean'),
       ('shift', 'single_session', 'true', 'Satu kasir hanya bisa punya satu shift aktif',
        'boolean') ON CONFLICT (category, key) DO NOTHING;

-- One-time sync: pastikan cached_stock = stock untuk data lama
UPDATE public.products
SET cached_stock = COALESCE(stock, 0)
WHERE cached_stock = 0
  AND stock > 0;

UPDATE public.product_variants pv
SET cached_stock = COALESCE(p.stock, 0) FROM public.products p
WHERE pv.product_id = p.id AND pv.cached_stock = 0;

-- =====================================================================
-- 10. VIEWS
-- =====================================================================

-- -------------------------------------------------------------------
-- 10.1 Produk stok menipis
-- -------------------------------------------------------------------
CREATE
OR REPLACE VIEW public.v_low_stock_products AS
SELECT p.id,
       p.name,
       p.barcode,
       p.stock,
       p.min_stock,
       p.min_stock - p.stock AS shortage,
       c.name                AS category_name,
       s.name                AS supplier_name,
       u.symbol              AS unit
FROM public.products p
         LEFT JOIN public.categories c ON c.id = p.category_id
         LEFT JOIN public.suppliers s ON s.id = p.supplier_id
         LEFT JOIN public.units u ON u.id = p.unit_id
WHERE p.is_active = true
  AND p.stock <= p.min_stock
ORDER BY shortage DESC;
COMMENT
ON VIEW public.v_low_stock_products IS
  'Produk yang stoknya <= minimum stok';

-- -------------------------------------------------------------------
-- 10.2 Hutang belum lunas
-- -------------------------------------------------------------------
CREATE
OR REPLACE VIEW public.v_outstanding_debts AS
SELECT cd.id,
       cu.name  AS customer_name,
       cu.phone AS customer_phone,
       cd.amount,
       cd.paid_amount,
       cd.remaining,
       cd.status,
       cd.due_date,
       cd.created_at,
       t.id     AS transaction_id
FROM public.customer_debts cd
         JOIN public.customers cu ON cu.id = cd.customer_id
         LEFT JOIN public.transactions t ON t.id = cd.transaction_id
WHERE cd.status != 'paid'
ORDER BY cd.due_date ASC NULLS LAST, cd.created_at ASC;
COMMENT
ON VIEW public.v_outstanding_debts IS 'Hutang pelanggan yang belum lunas';

-- -------------------------------------------------------------------
-- 10.3 Penjualan hari ini (WIB / Asia/Jakarta)
-- -------------------------------------------------------------------
CREATE
OR REPLACE VIEW public.v_today_sales AS
SELECT COUNT(DISTINCT t.id)                                    AS total_transactions,
       COALESCE(SUM(t.total), 0)                               AS total_revenue,
       COALESCE(SUM(ti.cost_price * ti.qty), 0)                AS total_cost,
       COALESCE(SUM(t.total) - SUM(ti.cost_price * ti.qty), 0) AS gross_profit,
       COALESCE(SUM(ti.qty), 0)                                AS items_sold,
       COUNT(DISTINCT t.cashier_id)                            AS cashier_count
FROM public.transactions t
         JOIN public.transaction_items ti ON ti.transaction_id = t.id
WHERE t.payment_status = 'paid'
  AND t.created_at >= (CURRENT_DATE::TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
  AND t.created_at < ((CURRENT_DATE + 1):: TIMESTAMP AT TIME ZONE 'Asia/Jakarta');
COMMENT
ON VIEW public.v_today_sales IS 'Ringkasan penjualan hari ini (WIB)';

-- =====================================================================
-- END OF SCRIPT — KELONTONG POS v6.0
-- =====================================================================
-- SUMMARY:
-- ✓ Extensions          : 3
-- ✓ Enum Types          : 10
-- ✓ Tables              : 20
--     └ customer_debts.remaining    → GENERATED ALWAYS AS [FIX-1]
--     └ shifts.cash_difference      → GENERATED ALWAYS AS [FIX-2]
--     └ stock_movements.ref_type    → ENUM (bukan text)  [FIX-3]
--     └ inherit_cost_price          → product_variants   [FIX-5]
--     └ track/cached/threshold      → NOT NULL           [FIX-6]
-- ✓ Indexes             : 60+
-- ✓ Functions           : 27
--     └ fn_block_direct_stock_update → cek session var   [FIX-4/FIX-8]
--     └ fn_process_inventory_movement→ set session var   [FIX-4]
--     └ fn_record_initial_stock      → fallback admin    [FIX-7]
--     └ fn_adjust_stock              → RPC admin API     [NEW-1]
--     └ fn_sync_variant_cost_price   → inherit feature   [NEW-2]
-- ✓ Triggers            : 23
-- ✓ RLS Enabled         : 20 tables
-- ✓ RLS Policies        : 75+
-- ✓ Storage Buckets     : 4
-- ✓ Storage Policies    : 16
-- ✓ Views               : 3
-- ✓ Seed Data           : 14 unit + 20 settings
--
-- ALUR MUTASI STOK (final — conflict-free):
--   Semua event → INSERT inventory_movements
--                    ↓ BEFORE INSERT trigger
--       fn_process_inventory_movement:
--         1. Row-lock produk
--         2. Validasi overselling
--         3. set_config('app.allow_stock_update','true',true)
--         4. UPDATE products SET stock=qty_after, cached_stock=qty_after
--              ↓ fn_block_direct_stock_update: sees flag='true' → allow
--         5. set_config('app.allow_stock_update','false',true)
--         6. RETURN NEW
-- =====================================================================