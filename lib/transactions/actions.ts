"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { Database } from "@/types";
import { revalidatePath } from "next/cache";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionItem = Database["public"]["Tables"]["transaction_items"]["Row"];

export type TransactionWithDetails = Transaction & {
  cashier?: { full_name: string | null };
  customer?: { name: string | null };
  items?: TransactionItem[];
};

export async function fetchTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}) {
  try {
    let query = (supabaseServer as any)
      .from("transactions")
      .select(`
        *,
        cashier:profiles!transactions_cashier_id_fkey(full_name),
        customer:customers(name)
      `)
      .order("created_at", { ascending: false });

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== "all") {
      query = query.eq("payment_status", filters.paymentStatus);
    }
    if (filters?.paymentMethod && filters.paymentMethod !== "all") {
      query = query.eq("payment_method", filters.paymentMethod);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data as TransactionWithDetails[] };
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchTransactionItems(transactionId: string) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", transactionId);

    if (error) throw error;
    return { success: true, data: data as TransactionItem[] };
  } catch (error: any) {
    console.error("Error fetching transaction items:", error);
    return { success: false, error: error.message };
  }
}

export async function voidTransaction(transactionId: string, reason: string, voidedBy: string) {
  try {
    const { error } = await (supabaseServer as any)
      .from("transactions")
      .update({
        payment_status: "cancelled",
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason
      })
      .eq("id", transactionId);

    if (error) throw error;
    
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error: any) {
    console.error("Error voiding transaction:", error);
    return { success: false, error: error.message };
  }
}
