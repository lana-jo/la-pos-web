"use server";

import { createQRISCharge, saveQRISToDatabase } from "./midtrans";
import { QRISChargeResponse, Database } from "@/types";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/supabase/session"; // cookie-aware session
import { supabaseServer } from "@/lib/supabase/server"; // service-role DB client

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = {
  product: Database["public"]["Tables"]["products"]["Row"];
  quantity: number;
  variant?: Database["public"]["Tables"]["product_variants"]["Row"] | null;
};

type PaymentResult =
  | {
      success: true;
      transactionId: string;
      paymentMethod: string;
      total: number;
      qrisUrl?: string;
      qrisString?: string;
      expiryTime?: string;
    }
  | { success: false; error: string };

// Cast query builder to avoid `never` errors without generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabaseServer.from(table) as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSession() {
  // getServerSession sekarang mengembalikan { user }
  const { user } = await getServerSession(); 
  if (!user) throw new Error("Unauthorized");
  // Bungkus dalam objek agar kompatibel jika kode lain mengharapkan { user } di dalam sesuatu
  return { user };
}

async function insertTransaction(
  cashierId: string,
  total: number,
  orderId: string,
  method: "cash" | "qris",
) {
  const { data, error } = await db("transactions")
    .insert({
      cashier_id: cashierId,
      subtotal: total,
      discount_amount: 0,
      tax_amount: 0,
      total,
      amount_paid: method === "cash" ? total : 0,
      change_amount: 0,
      payment_method: method,
      payment_status: method === "cash" ? "paid" : "pending",
      ...(method === "qris" && { midtrans_order_id: orderId }),
      ...(method === "cash" && { paid_at: new Date().toISOString() }),
    })
    .select()
    .single();

  if (error) {
    console.error("[insertTransaction] Database error:", error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
  return data;
}

async function insertTransactionItems(transactionId: string, cart: CartItem[]) {
  const items: Database["public"]["Tables"]["transaction_items"]["Insert"][] =
    cart.map((item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      const costPrice = item.variant ? item.variant.cost_price : item.product.cost_price || 0;
      return {
        transaction_id: transactionId,
        // Set product_id to null for manual products (non-UUID format IDs)
        // to avoid foreign key constraint violation
        product_id: isValidUUID(item.product.id) ? item.product.id : null,
        // Include variant_id if variant is selected
        product_variant_id: item.variant?.id || null,
        product_name: item.product.name,
        variant_name: item.variant?.variant_name || null,
        barcode: item.variant?.barcode || item.product.barcode,
        qty: item.quantity,
        unit_price: unitPrice,
        cost_price: costPrice,
        discount_amount: 0,
        subtotal: unitPrice * item.quantity,
      };
    });

  const { error } = await db("transaction_items").insert(items);
  if (error) throw new Error("Failed to create transaction items");
}

// Helper to check if a string is a valid UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function deductStock(cart: CartItem[]) {
  // Run sequentially — preserve the transaction even if a stock update fails
  for (const item of cart) {
    // Skip stock deduction for manual products (non-UUID IDs)
    // since they don't exist in the products table
    if (!isValidUUID(item.product.id)) {
      console.log(`[deductStock] Skipping manual product: ${item.product.id}`);
      continue;
    }

    // Always deduct from main product stock (variants don't have separate stock)
    const { error } = await db("products")
      .update({ stock: item.product.stock - item.quantity })
      .eq("id", item.product.id);

    if (error)
      console.error(
        `Stock update failed for product ${item.product.id}:`,
        error,
      );
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
// Inside createCashPayment in lib/payment/actions.ts
export async function createCashPayment(
  cart: CartItem[],
  total: number,
): Promise<PaymentResult> {
  try {
    console.log("[createCashPayment] Starting, cart items:", cart.length);
    const { user } = await getServerSession();
    console.log("[createCashPayment] Got user:", user.id);
    const orderId = `POS-CASH-${Date.now()}`;
    const transaction = await insertTransaction(
      user.id,
      total,
      orderId,
      "cash",
    );
    console.log("[createCashPayment] Transaction created:", transaction.id);

    await insertTransactionItems(transaction.id, cart);
    await deductStock(cart);
    revalidatePath("/cashier/pos");

    return {
      success: true,
      transactionId: transaction.id,
      paymentMethod: "cash",
      total,
    };
  } catch (error) {
    console.error("[createCashPayment] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cash payment failed",
    };
  }
}

export async function createQRISPayment(
  cart: CartItem[],
  total: number,
): Promise<PaymentResult> {
  try {
    console.log("[createQRISPayment] Starting, cart items:", cart.length);
    const session = await getSession();
    console.log("[createQRISPayment] Got user:", session.user.id);
    const orderId = `POS-${Date.now()}`;
    const transaction = await insertTransaction(
      session.user.id,
      total,
      orderId,
      "qris",
    );
    console.log("[createQRISPayment] Transaction created:", transaction.id);

    await insertTransactionItems(transaction.id, cart);

    const qrisResponse: QRISChargeResponse = await createQRISCharge(
      orderId,
      total,
    );
    await saveQRISToDatabase(transaction.id, qrisResponse);
    revalidatePath("/cashier/pos");

    return {
      success: true,
      transactionId: transaction.id,
      paymentMethod: "qris",
      total,
      qrisUrl: qrisResponse.qris_url,
      qrisString: qrisResponse.qris_string,
      expiryTime: qrisResponse.expiry_time,
    };
  } catch (error) {
    console.error("QRIS payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}
