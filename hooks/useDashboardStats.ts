"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { DashboardStats, DateRange, TransactionRow, DEFAULT_STATS } from "@/types/dashboard";

export const useDashboardStats = (dateRange: DateRange) => {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      // Build date bounds in local timezone for accurate day filtering
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const tomorrowStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      const yesterdayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      );

      // Use selected date range or default to today
      const filterFrom = dateRange.from
        ? new Date(
            dateRange.from.getFullYear(),
            dateRange.from.getMonth(),
            dateRange.from.getDate(),
          )
        : todayStart;
      const filterTo = dateRange.to
        ? new Date(
            dateRange.to.getFullYear(),
            dateRange.to.getMonth(),
            dateRange.to.getDate() + 1,
          )
        : tomorrowStart;
      const previousFrom = new Date(
        filterFrom.getTime() - (filterTo.getTime() - filterFrom.getTime()),
      );
      const previousTo = filterFrom;

      // Use actual today/yesterday for "Today" stats (not affected by date range filter)
      const todayIso = todayStart.toISOString();
      const tomorrowIso = tomorrowStart.toISOString();
      const yesterdayIso = yesterdayStart.toISOString();

      const [
        productsRes,
        profilesRes,
        allTransactionsRes,
        todayTransactionsRes,
        yesterdayTransactionsRes,
      ] = await Promise.all([
        supabase.from("products").select("id").eq("is_active", true),
        supabase.from("profiles").select("id"),
        // All paid transactions → total revenue & total count
        supabase
          .from("transactions")
          .select("total, payment_status")
          .eq("payment_status", "paid"),
        // Today's paid transactions (always actual today, not affected by date range)
        supabase
          .from("transactions")
          .select("total, payment_status")
          .eq("payment_status", "paid")
          .gte("created_at", todayIso)
          .lt("created_at", tomorrowIso),
        // Yesterday's paid transactions (for comparison)
        supabase
          .from("transactions")
          .select("total, payment_status")
          .eq("payment_status", "paid")
          .gte("created_at", yesterdayIso)
          .lt("created_at", todayIso),
      ]);

      const sumTotal = (rows: TransactionRow[] | null) =>
        (rows ?? []).reduce((sum, t) => sum + t.total, 0);

      const totalRevenue = sumTotal(
        allTransactionsRes.data as TransactionRow[],
      );
      const todayRevenue = sumTotal(
        todayTransactionsRes.data as TransactionRow[],
      );
      const yesterdayRevenue = sumTotal(
        yesterdayTransactionsRes.data as TransactionRow[],
      );

      const todayCount = todayTransactionsRes.data?.length ?? 0;
      const previousCount = yesterdayTransactionsRes.data?.length ?? 0;

      const revenueChange =
        yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : 0;

      const transactionChange =
        previousCount > 0
          ? ((todayCount - previousCount) / previousCount) * 100
          : 0;

      setStats({
        totalRevenue,
        totalTransactions: allTransactionsRes.data?.length ?? 0,
        totalProducts: productsRes.data?.length ?? 0,
        totalUsers: profilesRes.data?.length ?? 0,
        todayRevenue,
        todayTransactions: todayCount,
        revenueChange,
        transactionChange,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    startTransition(() => {
      fetchDashboardStats();
    });
  }, [dateRange, fetchDashboardStats]);

  return { stats, loading, refetch: fetchDashboardStats };
};
