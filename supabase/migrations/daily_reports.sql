-- =====================================================================
-- DAILY INCOME REPORTS SYSTEM (UPGRADED)
-- =====================================================================

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  total_sales BIGINT NOT NULL DEFAULT 0, -- Upgrade ke BIGINT untuk aman dari limit Rupiah
  total_transactions INTEGER NOT NULL DEFAULT 0,
  paid_transactions INTEGER NOT NULL DEFAULT 0,
  pending_transactions INTEGER NOT NULL DEFAULT 0,
  cancelled_transactions INTEGER NOT NULL DEFAULT 0,
  expired_transactions INTEGER NOT NULL DEFAULT 0,
  average_transaction_value BIGINT NOT NULL DEFAULT 0, -- Upgrade ke BIGINT
  total_items_sold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at ON public.daily_reports(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid duplication errors during migrations
DROP TRIGGER IF EXISTS handle_daily_reports_updated_at ON public.daily_reports;
CREATE TRIGGER handle_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate daily report
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
  
  -- Variabel pembantu untuk SARGable query & Timezone
  start_ts TIMESTAMP WITH TIME ZONE;
  end_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set rentang waktu 00:00:00 hingga 23:59:59 berdasarkan zona waktu Jakarta
  start_ts := (target_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  end_ts := start_ts + INTERVAL '1 day';

  -- Calculate transaction stats for the target date (Index-Friendly & Timezone-Safe)
  SELECT 
    COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0), -- FIXED: Hanya hitung yang dibayar
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

  -- Insert or update the daily report
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

-- RLS Policies for daily_reports
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Drop policies before creating to ensure smooth reruns
DROP POLICY IF EXISTS "Admins have full access to daily_reports" ON public.daily_reports;
CREATE POLICY "Admins have full access to daily_reports" ON public.daily_reports
  FOR ALL USING (public.fn_is_admin());

DROP POLICY IF EXISTS "Service role can manage daily_reports" ON public.daily_reports;
CREATE POLICY "Service role can manage daily_reports" ON public.daily_reports
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Cashiers can read daily_reports" ON public.daily_reports;
CREATE POLICY "Cashiers can read daily_reports" ON public.daily_reports
  FOR SELECT USING (public.fn_is_cashier_or_admin());

-- Grant permissions (FIXED: Removed invalid USAGE on table)
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO service_role;