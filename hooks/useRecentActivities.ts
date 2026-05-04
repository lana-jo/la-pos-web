"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RecentActivity } from "@/types/dashboard";

export const useRecentActivities = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      // Fetch recent transactions with user info
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

      if (transactionsError) throw transactionsError;

      // Fetch recent new users
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (usersError) throw usersError;

      // Combine and format activities
      const activities: RecentActivity[] = [];

      // Add transactions with proper typing
      (transactions as any[])?.forEach((transaction: any) => {
        activities.push({
          id: transaction.id,
          type: "transaction",
          description: "Transaction completed",
          user_name: transaction.profiles.full_name,
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

      setActivities(sortedActivities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      toast.error("Failed to load recent activities");
    } finally {
      setLoading(false);
    }
  };

  return { activities, loading, refetch: fetchRecentActivities };
};
