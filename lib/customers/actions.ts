"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { Database } from "@/types";
import { revalidatePath } from "next/cache";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerDebt = Database["public"]["Tables"]["customer_debts"]["Row"];

export async function fetchCustomers() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("customers")
      .select("*")
      .order("name");

    if (error) throw error;
    return { success: true, data: data as Customer[] };
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return { success: false, error: error.message };
  }
}

export async function createCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at" | "total_debt">) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("customers")
      .insert({ ...customer, total_debt: 0 })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/customers");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: string, customer: Partial<Customer>) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("customers")
      .update(customer)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/customers");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchCustomerDebts(customerId: string) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("customer_debts")
      .select(`
        *,
        transaction:transactions(total, created_at)
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching customer debts:", error);
    return { success: false, error: error.message };
  }
}

export async function payDebt(debtId: string, amount: number, cashierId: string, notes?: string) {
  try {
    // 1. Insert debt payment
    const { error: paymentError } = await (supabaseServer as any)
      .from("debt_payments")
      .insert({
        debt_id: debtId,
        cashier_id: cashierId,
        amount: amount,
        notes: notes
      });

    if (paymentError) throw paymentError;

    // The DB trigger should handle updating the remaining amount in customer_debts
    // and total_debt in customers.
    
    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Error paying debt:", error);
    return { success: false, error: error.message };
  }
}
