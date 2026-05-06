"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Transaction, Database } from "@/types";

interface TransactionWithItems extends Transaction {
  items: Database["public"]["Tables"]["transaction_items"]["Row"][];
}

interface UsePOSTransactionsProps {
  cashierId?: string;
}

export function usePOSTransactions({ cashierId }: UsePOSTransactionsProps = {}) {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalItems: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch transaction history for the current cashier
  const fetchTransactions = useCallback(async (limit: number = 20) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return;
      }

      const targetCashierId = cashierId || session.user.id;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items(
            *,
            product:products(id, name),
            product_variant:product_variants(id, variant_name)
          ),
          cashier:profiles(id, full_name),
          customer:customers(id, name)
        `)
        .eq("cashier_id", targetCashierId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      setTransactions((data || []) as TransactionWithItems[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [cashierId]);

  // Generate end of day report
  const generateReport = useCallback(async (date?: string) => {
    setLoadingReport(true);
    try {
      const reportDate = date || reportData.date;
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return null;
      }

      const targetCashierId = cashierId || session.user.id;

      // Fetch transactions for the selected date
      const { data: dayTransactions, error } = await supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items(*)
        `)
        .eq("cashier_id", targetCashierId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .eq("payment_status", "paid");

      if (error) throw error;

      const transactions = (dayTransactions || []) as TransactionWithItems[];
      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalItems = transactions.reduce(
        (sum, t) => sum + (t.items?.length || 0),
        0,
      );

      const newReportData = {
        totalSales,
        totalTransactions: transactions.length,
        totalItems,
        date: reportDate,
      };

      setReportData(newReportData);
      return newReportData;
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
      return null;
    } finally {
      setLoadingReport(false);
    }
  }, [cashierId, reportData.date]);

  // Create a new transaction
  const createTransaction = useCallback(async (
    transactionData: Omit<Database["public"]["Tables"]["transactions"]["Insert"], "id" | "created_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // Refresh transactions list
      await fetchTransactions();
      
      return data;
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction");
      return null;
    }
  }, [fetchTransactions]);

  // Add items to a transaction
  const addTransactionItems = useCallback(async (
    transactionId: string,
    items: Omit<Database["public"]["Tables"]["transaction_items"]["Insert"], "id">[]
  ) => {
    try {
      const { data, error } = await supabase
        .from("transaction_items")
        .insert(items)
        .select();

      if (error) throw error;

      // Refresh transactions list
      await fetchTransactions();
      
      return data;
    } catch (error) {
      console.error("Error adding transaction items:", error);
      toast.error("Failed to add items to transaction");
      return null;
    }
  }, [fetchTransactions]);

  // Void a transaction (requires PIN verification)
  const voidTransaction = useCallback(async (
    transactionId: string,
    pin: string,
    reason?: string
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return false;
      }

      // Verify PIN first
      const { data: pinValid, error: pinError } = await supabase
        .rpc('fn_verify_pin', { 
          p_user_id: session.user.id, 
          p_pin: pin 
        });

      if (pinError || !pinValid) {
        toast.error("Invalid PIN");
        return false;
      }

      // Update transaction status
      const { error } = await supabase
        .from("transactions")
        .update({
          payment_status: 'cancelled',
          voided_at: new Date().toISOString(),
          voided_by: session.user.id,
          void_reason: reason
        })
        .eq("id", transactionId);

      if (error) throw error;

      // Refresh transactions list
      await fetchTransactions();
      
      toast.success("Transaction voided successfully");
      return true;
    } catch (error) {
      console.error("Error voiding transaction:", error);
      toast.error("Failed to void transaction");
      return false;
    }
  }, [fetchTransactions]);

  // Get transaction by ID with full details
  const getTransactionById = useCallback(async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items(
            *,
            product:products(id, name, barcode),
            product_variant:product_variants(id, variant_name, barcode)
          ),
          cashier:profiles(id, full_name),
          customer:customers(id, name, phone),
          discount:discounts(id, name, discount_type, value)
        `)
        .eq("id", transactionId)
        .single();

      if (error) throw error;

      return data as TransactionWithItems;
    } catch (error) {
      console.error("Error fetching transaction:", error);
      toast.error("Failed to load transaction details");
      return null;
    }
  }, []);

  // Search transactions by date range or other criteria
  const searchTransactions = useCallback(async (criteria: {
    startDate?: Date;
    endDate?: Date;
    paymentStatus?: string[];
    paymentMethod?: string[];
    cashierId?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items(*),
          cashier:profiles(id, full_name),
          customer:customers(id, name)
        `);

      // Apply filters
      if (criteria.startDate) {
        query = query.gte("created_at", criteria.startDate.toISOString());
      }
      if (criteria.endDate) {
        query = query.lte("created_at", criteria.endDate.toISOString());
      }
      if (criteria.paymentStatus?.length) {
        query = query.in("payment_status", criteria.paymentStatus);
      }
      if (criteria.paymentMethod?.length) {
        query = query.in("payment_method", criteria.paymentMethod);
      }
      if (criteria.cashierId) {
        query = query.eq("cashier_id", criteria.cashierId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as TransactionWithItems[];
    } catch (error) {
      console.error("Error searching transactions:", error);
      toast.error("Failed to search transactions");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Data
    transactions,
    reportData,
    loading,
    loadingReport,

    // Actions
    fetchTransactions,
    generateReport,
    createTransaction,
    addTransactionItems,
    voidTransaction,
    getTransactionById,
    searchTransactions,

    // Setters
    setReportData,
  };
}
