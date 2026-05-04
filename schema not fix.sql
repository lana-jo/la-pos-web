-- =====================================================
-- COMPLETE DATABASE SETUP FOR POS WEB APPLICATION
-- Includes: Types, Tables, Indexes, Triggers, RLS Policies
-- =====================================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 2. ENUM TYPES
-- ============================================

-- Drop existing types if they exist (for clean setup)
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.action_type CASCADE;

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'cashier', 'customer');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'expired', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'qris');
CREATE TYPE public.action_type AS ENUM ('void', 'discount', 'refund');

-- ============================================
-- 3. TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  avatar_url TEXT,
  pin_hash TEXT,
  email TEXT UNIQUE,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method public.payment_method DEFAULT 'qris',
  payment_status public.payment_status DEFAULT 'pending',
  midtrans_order_id TEXT UNIQUE,
  qris_url TEXT,
  qris_string TEXT,
  qris_expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0)
);

-- Cashier actions table (audit log)
CREATE TABLE IF NOT EXISTS public.cashier_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type public.action_type NOT NULL,
  target_id TEXT,
  pin_verified BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  description TEXT,
  data_type TEXT DEFAULT 'string',
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT settings_unique_category_key UNIQUE (category, key)
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON public.transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_midtrans_order_id ON public.transactions(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_qris_expires_at ON public.transactions(qris_expires_at) WHERE payment_status = 'pending';

-- Transaction items indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON public.transaction_items(product_id);

-- Cashier actions indexes
CREATE INDEX IF NOT EXISTS idx_cashier_actions_cashier_id ON public.cashier_actions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_actions_action_type ON public.cashier_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_cashier_actions_created_at ON public.cashier_actions(created_at);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_category_key ON public.settings(category, key);

-- ============================================
-- 5. TRIGGER FUNCTIONS
-- ============================================

-- Function: Update updated_at timestamp (generic)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update product updated_at
CREATE OR REPLACE FUNCTION public.update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update settings updated_at
CREATE OR REPLACE FUNCTION public.update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-set cashier_id on transaction insert
CREATE OR REPLACE FUNCTION public.set_transaction_cashier_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cashier_id IS NULL THEN
        NEW.cashier_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-deactivate products when category is deactivated
CREATE OR REPLACE FUNCTION public.deactivate_products_when_category_inactive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = false AND OLD.is_active = true THEN
        UPDATE public.products
        SET is_active = false, updated_at = NOW()
        WHERE category_id = NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Prevent negative stock on product updates
CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for product: %', NEW.name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update transaction total when items change
CREATE OR REPLACE FUNCTION public.update_transaction_total()
RETURNS TRIGGER AS $$
DECLARE
    v_total INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Determine which transaction ID to use
    IF TG_OP = 'DELETE' THEN
        v_transaction_id := OLD.transaction_id;
    ELSE
        v_transaction_id := NEW.transaction_id;
    END IF;

    -- Calculate new total from all items
    SELECT COALESCE(SUM(subtotal), 0) INTO v_total
    FROM public.transaction_items
    WHERE transaction_id = v_transaction_id;

    -- Update the transaction total
    UPDATE public.transactions
    SET total = v_total
    WHERE id = v_transaction_id;

    -- Return appropriate row based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Prevent modification of paid transactions (items)
CREATE OR REPLACE FUNCTION public.prevent_paid_transaction_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_status public.payment_status;
    v_transaction_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_transaction_id := OLD.transaction_id;
    ELSE
        v_transaction_id := NEW.transaction_id;
    END IF;

    SELECT payment_status INTO v_status
    FROM public.transactions
    WHERE id = v_transaction_id;

    IF v_status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify items of a paid transaction';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Prevent updates to completed transactions (transactions table)
CREATE OR REPLACE FUNCTION public.prevent_completed_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
        RAISE EXCEPTION 'Cannot modify paid transaction status';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log cashier void actions
CREATE OR REPLACE FUNCTION public.log_cashier_void_action()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.payment_status != 'cancelled' AND NEW.payment_status = 'cancelled' THEN
        INSERT INTO public.cashier_actions (cashier_id, action_type, target_id, notes)
        VALUES (NEW.cashier_id, 'void', NEW.id::text, 'Transaction voided');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-cleanup expired pending transactions
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_transactions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qris_expires_at < NOW() AND NEW.payment_status = 'pending' THEN
        NEW.payment_status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify cashier PIN
CREATE OR REPLACE FUNCTION public.verify_cashier_pin(p_user_id UUID, p_pin_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_stored_hash TEXT;
BEGIN
    SELECT pin_hash INTO v_stored_hash
    FROM public.profiles
    WHERE id = p_user_id AND role IN ('cashier', 'admin');

    IF v_stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Uses crypt() from pgcrypto extension (enabled by default in Supabase)
    RETURN crypt(p_pin_text, v_stored_hash) = v_stored_hash;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Products: Auto-update updated_at on modification
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_timestamp();

-- Profiles: Auto-update updated_at on modification
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Settings: Auto-update updated_at on modification
DROP TRIGGER IF EXISTS trigger_settings_updated_at ON public.settings;
CREATE TRIGGER trigger_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_settings_timestamp();

-- Transactions: Auto-set cashier_id on insert
DROP TRIGGER IF EXISTS set_transaction_cashier_id_trigger ON public.transactions;
CREATE TRIGGER set_transaction_cashier_id_trigger
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_transaction_cashier_id();

-- Categories: Auto-deactivate products when category deactivated
DROP TRIGGER IF EXISTS trigger_category_deactivate_products ON public.categories;
CREATE TRIGGER trigger_category_deactivate_products
    AFTER UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.deactivate_products_when_category_inactive();

-- Products: Prevent negative stock
DROP TRIGGER IF EXISTS trigger_products_check_stock ON public.products;
CREATE TRIGGER trigger_products_check_stock
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_negative_stock();

-- Transaction items: Update transaction total
DROP TRIGGER IF EXISTS trigger_transaction_items_update_total ON public.transaction_items;
CREATE TRIGGER trigger_transaction_items_update_total
    AFTER INSERT OR UPDATE OR DELETE ON public.transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_transaction_total();

-- Transaction items: Prevent modification of paid transactions
DROP TRIGGER IF EXISTS transaction_items_no_modify_paid ON public.transaction_items;
CREATE TRIGGER transaction_items_no_modify_paid
    BEFORE UPDATE OR DELETE ON public.transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_paid_transaction_modification();

-- Transactions: Prevent paid transaction modifications
DROP TRIGGER IF EXISTS prevent_completed_transaction_update_trigger ON public.transactions;
CREATE TRIGGER prevent_completed_transaction_update_trigger
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_completed_transaction_update();

-- Transactions: Log void actions
DROP TRIGGER IF EXISTS trigger_log_transaction_void ON public.transactions;
CREATE TRIGGER trigger_log_transaction_void
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
    EXECUTE FUNCTION public.log_cashier_void_action();

-- Transactions: Auto-cleanup expired pending transactions
DROP TRIGGER IF EXISTS trigger_check_expired_transactions ON public.transactions;
CREATE TRIGGER trigger_check_expired_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_expired_pending_transactions();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Profiles: Admin full access" ON public.profiles;
CREATE POLICY "Profiles: Admin full access"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Profiles: Cashier view own profile" ON public.profiles;
CREATE POLICY "Profiles: Cashier view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "Profiles: Customer view own profile" ON public.profiles;
CREATE POLICY "Profiles: Customer view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'customer'
    )
  );

DROP POLICY IF EXISTS "Profiles: Allow registration insert" ON public.profiles;
CREATE POLICY "Profiles: Allow registration insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Service role policy for API routes (server-side profile creation)
DROP POLICY IF EXISTS "Profiles: Service role can manage" ON public.profiles;
CREATE POLICY "Profiles: Service role can manage"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CATEGORIES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Categories: Admin full access" ON public.categories;
CREATE POLICY "Categories: Admin full access"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Categories: All users view active" ON public.categories;
CREATE POLICY "Categories: All users view active"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Categories: Public view active" ON public.categories;
CREATE POLICY "Categories: Public view active"
  ON public.categories
  FOR SELECT
  TO anon
  USING (is_active = true);

-- =====================================================
-- PRODUCTS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Products: Admin full access" ON public.products;
CREATE POLICY "Products: Admin full access"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Products: Cashier view active" ON public.products;
CREATE POLICY "Products: Cashier view active"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "Products: Customer view active" ON public.products;
CREATE POLICY "Products: Customer view active"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'customer'
    )
  );

DROP POLICY IF EXISTS "Products: Public view active" ON public.products;
CREATE POLICY "Products: Public view active"
  ON public.products
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Service role policy for stock management (server-side payment processing)
DROP POLICY IF EXISTS "Products: Service role can manage" ON public.products;
CREATE POLICY "Products: Service role can manage"
  ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRANSACTIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Transactions: Admin full access" ON public.transactions;
CREATE POLICY "Transactions: Admin full access"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Transactions: Cashier view own" ON public.transactions;
CREATE POLICY "Transactions: Cashier view own"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "Transactions: Cashier insert own" ON public.transactions;
CREATE POLICY "Transactions: Cashier insert own"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "Transactions: Cashier update own pending" ON public.transactions;
CREATE POLICY "Transactions: Cashier update own pending"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    cashier_id = auth.uid() AND
    payment_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  )
  WITH CHECK (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

-- Service role policy for payment processing (server-side)
DROP POLICY IF EXISTS "Transactions: Service role can manage" ON public.transactions;
CREATE POLICY "Transactions: Service role can manage"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRANSACTION ITEMS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "TransactionItems: Admin full access" ON public.transaction_items;
CREATE POLICY "TransactionItems: Admin full access"
  ON public.transaction_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "TransactionItems: Cashier view linked to own transactions" ON public.transaction_items;
CREATE POLICY "TransactionItems: Cashier view linked to own transactions"
  ON public.transaction_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = transaction_items.transaction_id
        AND t.cashier_id = auth.uid()
        AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "TransactionItems: Cashier insert linked to own transactions" ON public.transaction_items;
CREATE POLICY "TransactionItems: Cashier insert linked to own transactions"
  ON public.transaction_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = transaction_items.transaction_id
        AND t.cashier_id = auth.uid()
        AND p.role = 'cashier'
    )
  );

-- Service role policy for payment processing (server-side)
DROP POLICY IF EXISTS "TransactionItems: Service role can manage" ON public.transaction_items;
CREATE POLICY "TransactionItems: Service role can manage"
  ON public.transaction_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CASHIER ACTIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "CashierActions: Admin read-only audit" ON public.cashier_actions;
CREATE POLICY "CashierActions: Admin read-only audit"
  ON public.cashier_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "CashierActions: Cashier insert own actions" ON public.cashier_actions;
CREATE POLICY "CashierActions: Cashier insert own actions"
  ON public.cashier_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "CashierActions: Cashier view own actions" ON public.cashier_actions;
CREATE POLICY "CashierActions: Cashier view own actions"
  ON public.cashier_actions
  FOR SELECT
  TO authenticated
  USING (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

-- Service role policy for audit logging (server-side)
DROP POLICY IF EXISTS "CashierActions: Service role can manage" ON public.cashier_actions;
CREATE POLICY "CashierActions: Service role can manage"
  ON public.cashier_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SETTINGS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Settings: Admin full access" ON public.settings;
CREATE POLICY "Settings: Admin full access"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Settings: Cashier view only" ON public.settings;
CREATE POLICY "Settings: Cashier view only"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier'
    )
  );

DROP POLICY IF EXISTS "Settings: Public view non-sensitive" ON public.settings;
CREATE POLICY "Settings: Public view non-sensitive"
  ON public.settings
  FOR SELECT
  TO anon
  USING (is_encrypted = false);

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TYPE public.user_role IS 'User roles: admin (full access), cashier (POS only), customer (catalog only)';
COMMENT ON TYPE public.payment_status IS 'Payment status: pending, paid, expired, cancelled';
COMMENT ON TYPE public.payment_method IS 'Payment methods: cash, qris';
COMMENT ON TYPE public.action_type IS 'Cashier audit actions: void, discount, refund';

COMMENT ON TABLE public.profiles IS 'Extends Supabase auth.users with role and profile data';
COMMENT ON TABLE public.categories IS 'Product categories with soft-delete via is_active';
COMMENT ON TABLE public.products IS 'Product catalog with barcode, price, and stock tracking';
COMMENT ON TABLE public.transactions IS 'Transaction header with QRIS payment integration';
COMMENT ON TABLE public.transaction_items IS 'Line items for each transaction';
COMMENT ON TABLE public.cashier_actions IS 'Audit log for sensitive cashier operations';
COMMENT ON TABLE public.settings IS 'Application settings with category/key structure';

COMMENT ON INDEX idx_products_barcode IS 'Fast lookup for barcode scanning';
COMMENT ON INDEX idx_products_name_trgm IS 'Full-text search on product names using trigram';
COMMENT ON INDEX idx_transactions_payment_status IS 'Query transactions by payment status for reports';
COMMENT ON INDEX idx_transactions_qris_expires_at IS 'Find pending transactions that may be expired';

-- ============================================
-- 9. POLICY SUMMARY
-- ============================================
-- profiles: Admin (ALL), Cashier/Customer (SELECT own), All (INSERT on register)
-- categories: Admin (ALL), Authenticated/Anon (SELECT active)
-- products: Admin (ALL), Cashier/Customer/Anon (SELECT active)
-- transactions: Admin (ALL), Cashier (SELECT/INSERT/UPDATE own, pending only)
-- transaction_items: Admin (ALL), Cashier (SELECT/INSERT linked to own transactions)
-- cashier_actions: Admin (SELECT), Cashier (INSERT/SELECT own)
-- settings: Admin (ALL), Cashier (SELECT), Anon (SELECT non-encrypted)
-- ============================================
