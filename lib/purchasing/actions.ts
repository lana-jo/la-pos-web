"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { Database } from "@/types";
import { revalidatePath } from "next/cache";

type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderItem = Database["public"]["Tables"]["purchase_order_items"]["Row"];

export type POWithDetails = PurchaseOrder & {
  supplier?: { name: string | null };
  creator?: { full_name: string | null };
  items?: PurchaseOrderItem[];
};

export async function fetchPurchaseOrders() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(name),
        creator:profiles!purchase_orders_created_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data as POWithDetails[] };
  } catch (error: any) {
    console.error("Error fetching purchase orders:", error);
    return { success: false, error: error.message };
  }
}

export async function createPurchaseOrder(po: Database["public"]["Tables"]["purchase_orders"]["Insert"], items: any[]) {
  try {
    // 1. Create PO
    const { data: poData, error: poError } = await (supabaseServer as any)
      .from("purchase_orders")
      .insert(po)
      .select()
      .single();

    if (poError) throw poError;

    // 2. Create items
    const poItems = items.map(item => ({
      ...item,
      purchase_order_id: (poData as any).id
    }));

    const { error: itemsError } = await (supabaseServer as any)
      .from("purchase_order_items")
      .insert(poItems);

    if (itemsError) throw itemsError;

    revalidatePath("/dashboard/purchasing");
    return { success: true, data: poData };
  } catch (error: any) {
    console.error("Error creating purchase order:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchPOItems(poId: string) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", poId);

    if (error) throw error;
    return { success: true, data: data as PurchaseOrderItem[] };
  } catch (error: any) {
    console.error("Error fetching PO items:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePOStatus(id: string, status: string, receivedBy?: string) {
  try {
    const updateData: any = { status };
    if (status === "received") {
      updateData.received_at = new Date().toISOString();
      if (receivedBy) updateData.received_by = receivedBy;
    }

    const { error } = await (supabaseServer as any)
      .from("purchase_orders")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/dashboard/purchasing");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating PO status:", error);
    return { success: false, error: error.message };
  }
}
