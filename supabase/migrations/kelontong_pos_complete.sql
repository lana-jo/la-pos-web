-- =====================================================================
-- KELONTONG POS — COMPLETE SUPABASE DATABASE SETUP
-- Version : 4.0 (Fixed & Production Ready)
-- Target  : Supabase PostgreSQL 15+
-- =====================================================================

-- [Existing content omitted for brevity... appending daily_reports features]

-- =====================================================================
-- TABLE: daily_reports
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  total_sales BIGINT NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  paid_transactions INTEGER NOT NULL DEFAULT 0,
  pending_transactions INTEGER NOT NULL DEFAULT 0,
  cancelled_transactions INTEGER NOT NULL DEFAULT 0,
  expired_transactions INTEGER NOT NULL DEFAULT 0,
  average_transaction_value BIGINT NOT NULL DEFAULT 0,
  total_items_sold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- INDEXES: daily_reports
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at ON public.daily_reports(created_at);

-- =====================================================================
-- FUNCTION: generate_daily_report
-- =====================================================================
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
  
  start_ts TIMESTAMP WITH TIME ZONE;
  end_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  start_ts := (target_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  end_ts := start_ts + INTERVAL '1 day';

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

  SELECT COALESCE(SUM(qty), 0)
  INTO total_items_sold_val
  FROM public.transaction_items ti
  JOIN public.transactions t ON ti.transaction_id = t.id
  WHERE t.created_at >= start_ts AND t.created_at < end_ts 
    AND t.payment_status = 'paid';

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
-- RLS POLICIES: daily_reports
-- =====================================================================
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to daily_reports" ON public.daily_reports
  FOR ALL USING (public.fn_is_admin());

CREATE POLICY "Service role can manage daily_reports" ON public.daily_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Cashiers can read daily_reports" ON public.daily_reports
  FOR SELECT USING (public.fn_is_cashier_or_admin());
