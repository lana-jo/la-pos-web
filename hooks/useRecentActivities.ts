"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RecentActivity } from "@/types/dashboard";

export const useRecentActivities = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentActivities = useCallback(async () => {
    console.log(`[DASHBOARD] fetchRecentActivities started`);
    const startTime = Date.now();
    
    try {
      // Fetch recent transactions with user info
      console.log(`[DASHBOARD] Fetching recent transactions`);
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select(
          `
                    id,
                    total,
                    payment_status,
                    created_at,
                    profiles!transactions_cashier_id_fkey(
                        full_name
                    )
                `,
        )
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(5);

      if (transactionsError) {
        console.error(`[DASHBOARD] Transactions fetch error:`, transactionsError);
        throw transactionsError;
      }
      
      console.log(`[DASHBOARD] Transactions fetched:`, {
        count: transactions?.length || 0,
        data: transactions
      });

      // Fetch recent new users
      console.log(`[DASHBOARD] Fetching recent users`);
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (usersError) {
        console.error(`[DASHBOARD] Users fetch error:`, usersError);
        throw usersError;
      }
      
      console.log(`[DASHBOARD] Users fetched:`, {
        count: users?.length || 0,
        data: users
      });

      // Combine and format activities
      const activities: RecentActivity[] = [];

      // Add transactions with proper typing
      (transactions as any[])?.forEach((transaction: any) => {
        const cashierName = transaction.profiles?.full_name ?? "Unknown";
        const description = `Transaction #${transaction.id.slice(-6)} completed — ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(transaction.total)}`;
        activities.push({
          id: transaction.id,
          type: "transaction",
          description,
          user_name: cashierName,
          amount: transaction.total,
          created_at: transaction.created_at,
        });
      });

      // Add new users with proper typing
      (users as any[])?.forEach((user: any) => {
        activities.push({
          id: user.id,
          type: "user",
          description: `${user.role} account created`,
          user_name: user.full_name,
          created_at: user.created_at,
        });
      });

      // Sort by date and take latest 10
      const sortedActivities = activities
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 10);

      console.log(`[DASHBOARD] Activities processed:`, {
        totalActivities: activities.length,
        finalCount: sortedActivities.length,
        activities: sortedActivities.map(a => ({
          id: a.id,
          type: a.type,
          description: a.description,
          created_at: a.created_at
        }))
      });

      setActivities(sortedActivities);
      
      const duration = Date.now() - startTime;
      console.log(`[DASHBOARD] fetchRecentActivities completed in ${duration}ms`);
    } catch (error) {
      console.error("[DASHBOARD] Error fetching recent activities:", {
        error,
        timestamp: new Date().toISOString()
      });
      toast.error("Failed to load recent activities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchRecentActivities();
    });
  }, [fetchRecentActivities]);

  return { activities, loading, refetch: fetchRecentActivities };
};
