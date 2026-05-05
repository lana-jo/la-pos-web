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
  console.log("[POS Payment] Inserting transaction:", { cashierId, total, orderId, method });
  
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
    console.error("[POS Payment] Database error inserting transaction:", error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
  
  console.log("[POS Payment] Transaction inserted successfully:", { transactionId: data.id, method });
  return data;
}

async function insertTransactionItems(transactionId: string, cart: CartItem[]) {
  console.log("[POS Payment] Inserting transaction items:", { transactionId, itemCount: cart.length });
  
  const items: Database["public"]["Tables"]["transaction_items"]["Insert"][] =
    cart.map((item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      const costPrice = item.variant ? item.variant.cost_price : item.product.cost_price || 0;
      
      const transactionItem = {
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
      
      console.log("[POS Payment] Creating transaction item:", {
        productName: item.product.name,
        variantName: item.variant?.variant_name,
        quantity: item.quantity,
        unitPrice,
        subtotal: transactionItem.subtotal
      });
      
      return transactionItem;
    });

  const { error } = await db("transaction_items").insert(items);
  if (error) {
    console.error("[POS Payment] Error inserting transaction items:", error);
    throw new Error("Failed to create transaction items");
  }
  
  console.log("[POS Payment] Transaction items inserted successfully:", { itemCount: items.length });
}

// Helper to check if a string is a valid UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function deductStock(cart: CartItem[]) {
  console.log("[POS Payment] Starting stock deduction for:", { itemCount: cart.length });
  
  // Run sequentially — preserve transaction even if a stock update fails
  for (const item of cart) {
    // Skip stock deduction for manual products (non-UUID IDs)
    // since they don't exist in products table
    if (!isValidUUID(item.product.id)) {
      console.log(`[POS Payment] Skipping manual product stock deduction: ${item.product.id}`);
      continue;
    }

    console.log(`[POS Payment] Deducting stock for product: ${item.product.name}, quantity: ${item.quantity}, current stock: ${item.product.stock}`);
    
    // Always deduct from main product stock (variants don't have separate stock)
    const { error } = await db("products")
      .update({ stock: item.product.stock - item.quantity })
      .eq("id", item.product.id);

    if (error) {
      console.error(
        `[POS Payment] Stock update failed for product ${item.product.id}:`,
        error,
      );
    } else {
      console.log(`[POS Payment] Stock deducted successfully for product: ${item.product.name}, new stock: ${item.product.stock - item.quantity}`);
    }
  }
  
  console.log("[POS Payment] Stock deduction process completed");
}

// ─── Actions ──────────────────────────────────────────────────────────────────
// Inside createCashPayment in lib/payment/actions.ts
export async function createCashPayment(
  cart: CartItem[],
  total: number,
): Promise<PaymentResult> {
  try {
    console.log("[POS Payment] Starting cash payment process:", { itemCount: cart.length, total });
    
    const { user } = await getServerSession();
    console.log("[POS Payment] Cash payment - authenticated user:", user.id);
    
    const orderId = `POS-CASH-${Date.now()}`;
    console.log("[POS Payment] Generated order ID for cash payment:", orderId);
    
    const transaction = await insertTransaction(
      user.id,
      total,
      orderId,
      "cash",
    );
    console.log("[POS Payment] Cash transaction created:", { transactionId: transaction.id });

    await insertTransactionItems(transaction.id, cart);
    console.log("[POS Payment] Cash transaction items inserted");
    
    await deductStock(cart);
    console.log("[POS Payment] Stock deducted for cash payment");
    
    revalidatePath("/cashier/pos");
    console.log("[POS Payment] Path revalidated for cash payment");

    const result: PaymentResult = {
      success: true,
      transactionId: transaction.id,
      paymentMethod: "cash",
      total,
    };
    
    console.log("[POS Payment] Cash payment completed successfully:", result);
    return result;
  } catch (error) {
    console.error("[POS Payment] Cash payment error:", error);
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
    console.log("[POS Payment] Starting QRIS payment process:", { itemCount: cart.length, total });
    
    const session = await getSession();
    console.log("[POS Payment] QRIS payment - authenticated user:", session.user.id);
    
    const orderId = `POS-${Date.now()}`;
    console.log("[POS Payment] Generated order ID for QRIS payment:", orderId);
    
    const transaction = await insertTransaction(
      session.user.id,
      total,
      orderId,
      "qris",
    );
    console.log("[POS Payment] QRIS transaction created:", { transactionId: transaction.id });

    await insertTransactionItems(transaction.id, cart);
    console.log("[POS Payment] QRIS transaction items inserted");

    console.log("[POS Payment] Creating QRIS charge with Midtrans:", { orderId, total });
    const qrisResponse: QRISChargeResponse = await createQRISCharge(
      orderId,
      total,
    );
    console.log("[POS Payment] QRIS charge created:", { 
      qrisUrl: qrisResponse.qris_url, 
      expiryTime: qrisResponse.expiry_time 
    });
    
    await saveQRISToDatabase(transaction.id, qrisResponse);
    console.log("[POS Payment] QRIS data saved to database");
    
    revalidatePath("/cashier/pos");
    console.log("[POS Payment] Path revalidated for QRIS payment");

    const result: PaymentResult = {
      success: true,
      transactionId: transaction.id,
      paymentMethod: "qris",
      total,
      qrisUrl: qrisResponse.qris_url,
      qrisString: qrisResponse.qris_string,
      expiryTime: qrisResponse.expiry_time,
    };
    
    console.log("[POS Payment] QRIS payment initiated successfully:", result);
    return result;
  } catch (error) {
    console.error("[POS Payment] QRIS payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}
