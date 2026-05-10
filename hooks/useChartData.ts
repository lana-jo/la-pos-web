"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChartData, DateRange } from "@/types/dashboard";

export const useChartData = (dateRange: DateRange) => {
  const [chartData, setChartData] = useState<ChartData>({
    dailyRevenue: [],
    topProducts: [],
    paymentMethods: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  const fetchChartData = async () => {
    try {
      console.log("Starting fetchChartData...");

      // Get date range for charts or default to last 7 days
      const now = new Date();
      let sevenDaysAgo: Date;

      if (dateRange.from && dateRange.to) {
        sevenDaysAgo = dateRange.from;
      } else {
        sevenDaysAgo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7,
        );
      }

      const sevenDaysAgoIso = sevenDaysAgo.toISOString();
      const filterToIso = dateRange.to
        ? new Date(
            dateRange.to.getFullYear(),
            dateRange.to.getMonth(),
            dateRange.to.getDate() + 1,
          ).toISOString()
        : now.toISOString();

      console.log(
        "Fetching transactions from:",
        sevenDaysAgoIso,
        "to:",
        filterToIso,
      );

      // Fetch daily revenue data
      const { data: dailyTransactions, error: dailyError } = await supabase
        .from("transactions")
        .select("total, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", sevenDaysAgoIso)
        .lt("created_at", filterToIso)
        .order("created_at", { ascending: true });

      if (dailyError) throw dailyError;

      console.log(
        "Daily transactions fetched:",
        dailyTransactions?.length || 0,
      );

      // Process daily revenue data
      const dailyRevenueMap = new Map<
        string,
        { displayDate: string; revenue: number; transactions: number }
      >();

      // Initialize date range
      const filterToDate = dateRange.to
        ? new Date(
            dateRange.to.getFullYear(),
            dateRange.to.getMonth(),
            dateRange.to.getDate() + 1,
          )
        : now;
      const daysDiff = Math.ceil(
        (filterToDate.getTime() - sevenDaysAgo.getTime()) /
        (1000 * 60 * 60 * 24),
      );
      const daysToShow = Math.min(Math.max(daysDiff, 1), 90); // Limit to 90 days max

      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const isoDate = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
        dailyRevenueMap.set(isoDate, { displayDate, revenue: 0, transactions: 0 });
      }

      // Aggregate daily data
      (dailyTransactions as any[])?.forEach((transaction: any) => {
        const isoDate = transaction.created_at.split('T')[0];
        const existing = dailyRevenueMap.get(isoDate);
        if (existing) {
          existing.revenue += transaction.total;
          existing.transactions += 1;
        }
      });

      const dailyRevenue = Array.from(dailyRevenueMap.values()).map((item) => ({
        date: item.displayDate,
        revenue: item.revenue,
        transactions: item.transactions,
      }));

      // Fetch top products (filtered by date range)
      const { data: topProductsData, error: topProductsError } = await supabase
        .from("transaction_items")
        .select(
          `
                    qty,
                    unit_price,
                    subtotal,
                    transactions!inner(
                        created_at,
                        payment_status
                    ),
                    products!inner(
                        name
                    )
                `,
        )
        .eq("transactions.payment_status", "paid")
        .gte("transactions.created_at", sevenDaysAgoIso)
        .lt("transactions.created_at", filterToIso)
        .order("subtotal", { ascending: false })
        .limit(50);

      if (topProductsError) throw topProductsError;

      // Process top products data
      const productSalesMap = new Map<
        string,
        { sales: number; revenue: number }
      >();

      (topProductsData as any[])?.forEach((item: any) => {
        const productName = item.products.name;
        const existing = productSalesMap.get(productName) || {
          sales: 0,
          revenue: 0,
        };
        productSalesMap.set(productName, {
          sales: existing.sales + item.qty,
          revenue: existing.revenue + item.subtotal,
        });
      });

      const topProducts = Array.from(productSalesMap.entries())
        .map(([name, data]) => ({
          name,
          sales: data.sales,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Fetch payment methods distribution (filtered by date range)
      const { data: paymentData, error: paymentError } = await supabase
        .from("transactions")
        .select("payment_method")
        .eq("payment_status", "paid")
        .gte("created_at", sevenDaysAgoIso)
        .lt("created_at", filterToIso);

      if (paymentError) throw paymentError;

      const paymentMethodsMap = new Map<string, number>();

      (paymentData as any[])?.forEach((transaction: any) => {
        const method = transaction.payment_method || "QRIS";
        paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + 1);
      });

      const totalTransactions = Array.from(paymentMethodsMap.values()).reduce(
        (sum, count) => sum + count,
        0,
      );
      const paymentMethods = Array.from(paymentMethodsMap.entries()).map(
        ([method, count]) => ({
          method: method.toUpperCase(),
          count,
          percentage:
            totalTransactions > 0
              ? Math.round((count / totalTransactions) * 100)
              : 0,
        }),
      );

      setChartData({
        dailyRevenue,
        topProducts,
        paymentMethods,
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      toast.error("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  return { chartData, loading, refetch: fetchChartData };
};
