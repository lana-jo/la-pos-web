"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { Database } from "@/types";
import { revalidatePath } from "next/cache";

type Discount = Database["public"]["Tables"]["discounts"]["Row"];

export async function fetchDiscounts() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("discounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data as Discount[] };
  } catch (error: any) {
    console.error("Error fetching discounts:", error);
    return { success: false, error: error.message };
  }
}

export async function createDiscount(discount: Omit<Discount, "id" | "created_at" | "usage_count">) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("discounts")
      .insert({ ...discount, usage_count: 0 })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/discounts");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error creating discount:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDiscount(id: string, discount: Partial<Discount>) {
  try {
    const { data, error } = await (supabaseServer as any)
      .from("discounts")
      .update(discount)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/discounts");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error updating discount:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDiscount(id: string) {
  try {
    const { error } = await (supabaseServer as any)
      .from("discounts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/dashboard/discounts");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting discount:", error);
    return { success: false, error: error.message };
  }
}
