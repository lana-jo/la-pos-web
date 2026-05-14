"use server";

console.log("[POS Payment] Server action module loaded");

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

  // Always insert as "pending" first; items will be inserted next.
  // The DB trigger blocks item inserts if parent is "paid".
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
      payment_status: "pending",
      ...(method === "qris" && { midtrans_order_id: orderId }),
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

async function markTransactionPaid(transactionId: string) {
  console.log("[POS Payment] Marking transaction as paid:", transactionId);
  const { error } = await db("transactions")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (error) {
    console.error("[POS Payment] Failed to mark transaction as paid:", error);
    throw new Error(`Failed to finalize transaction: ${error.message}`);
  }

  console.log("[POS Payment] Transaction marked as paid:", transactionId);
}

async function insertTransactionItems(transactionId: string, cart: CartItem[]) {
  console.log("[POS Payment] Inserting transaction items:", { transactionId, itemCount: cart.length });

  const items: Database["public"]["Tables"]["transaction_items"]["Insert"][] =
    cart.map((item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      
      // Calculate cost price: inherit from product if specified
      let costPrice = item.product.cost_price || 0;
      if (item.variant) {
        if (item.variant.inherit_cost_price) {
          costPrice = (item.product.cost_price || 0) * (item.variant.conversion_qty || 1);
        } else {
          costPrice = item.variant.cost_price;
        }
      }

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

  console.log("[POS Payment] Attempting to insert transaction items:", JSON.stringify(items, null, 2));

  // Try inserting with RLS bypass using service role
  const { data, error } = await db("transaction_items").insert(items).select();

  if (error) {
    console.error("[POS Payment] Error inserting transaction items:", error);
    console.error("[POS Payment] Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to create transaction items: ${error.message}`);
  }

  console.log("[POS Payment] Transaction items inserted successfully:", { itemCount: items.length, insertedData: data });
}

// Helper to check if a string is a valid UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
// Inside createCashPayment in lib/payment/actions.ts
export async function createCashPayment(
  cart: CartItem[],
  total: number,
): Promise<PaymentResult> {
  const startTime = Date.now();
  console.log("[POS Payment] =========================================");
  console.log("[POS Payment] Starting cash payment server action");
  console.log("[POS Payment] Timestamp:", new Date().toISOString());
  console.log("[POS Payment] =========================================");
  console.log("[POS Payment] Input params:", { itemCount: cart.length, total });

  // Defensive validation
  if (!cart || cart.length === 0) {
    console.error("[POS Payment] Invalid input: cart is empty");
    return {
      success: false,
      error: "Cart is empty",
    };
  }

  if (!total || total <= 0) {
    console.error("[POS Payment] Invalid input: total is invalid", total);
    return {
      success: false,
      error: "Invalid total amount",
    };
  }

  try {
    console.log("[POS Payment] --- Step 1: Authentication ---");
    const authStart = Date.now();
    const sessionResult = await getServerSession();
    if (!sessionResult || !sessionResult.user) {
      console.error("[POS Payment] Authentication failed: no session or user");
      return {
        success: false,
        error: "Authentication failed",
      };
    }
    const { user } = sessionResult;
    const authEnd = Date.now();
    console.log("[POS Payment] ✓ Authentication successful in", authEnd - authStart, "ms");
    console.log("[POS Payment] User ID:", user.id);
    console.log("[POS Payment] User email:", user.email);
    console.log("[POS Payment] --- End Step 1 ---");

    console.log("[POS Payment] --- Step 2: Generate Order ID ---");
    const orderId = `POS-CASH-${Date.now()}`;
    console.log("[POS Payment] ✓ Order ID generated:", orderId);
    console.log("[POS Payment] --- End Step 2 ---");

    console.log("[POS Payment] --- Step 3: Insert Transaction ---");
    const txStart = Date.now();
    const transaction = await insertTransaction(
      user.id,
      total,
      orderId,
      "cash",
    );
    const txEnd = Date.now();
    console.log("[POS Payment] ✓ Transaction inserted in", txEnd - txStart, "ms");
    console.log("[POS Payment] Transaction ID:", transaction.id);
    console.log("[POS Payment] --- End Step 3 ---");

    console.log("[POS Payment] --- Step 4: Insert Transaction Items ---");
    const itemsStart = Date.now();
    await insertTransactionItems(transaction.id, cart);
    const itemsEnd = Date.now();
    console.log("[POS Payment] ✓ Transaction items inserted in", itemsEnd - itemsStart, "ms");
    console.log("[POS Payment] --- End Step 4 ---");

    console.log("[POS Payment] --- Step 5b: Finalize Transaction ---");
    const finalizeStart = Date.now();
    await markTransactionPaid(transaction.id);
    const finalizeEnd = Date.now();
    console.log("[POS Payment] ✓ Transaction finalized in", finalizeEnd - finalizeStart, "ms");
    console.log("[POS Payment] --- End Step 5b ---");

    console.log("[POS Payment] --- Step 6: Revalidate Path ---");
    revalidatePath("/cashier/pos");
    console.log("[POS Payment] ✓ Path revalidated");
    console.log("[POS Payment] --- End Step 6 ---");

    const result: PaymentResult = {
      success: true,
      transactionId: transaction.id,
      paymentMethod: "cash",
      total,
    };

    const endTime = Date.now();
    console.log("[POS Payment] ✓✓✓ Cash payment completed successfully");
    console.log("[POS Payment] Result:", result);
    console.log("[POS Payment] Total duration:", endTime - startTime, "ms");
    console.log("[POS Payment] =========================================");
    console.log("[POS Payment] Returning success result:", JSON.stringify(result));
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.error("[POS Payment] ❌❌❌ Cash payment error caught");
    console.error("[POS Payment] Error type:", error?.constructor?.name);
    console.error("[POS Payment] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[POS Payment] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[POS Payment] Full error object:", error);
    console.error("[POS Payment] Duration before error:", endTime - startTime, "ms");
    console.error("[POS Payment] =========================================");

    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
    console.error("[POS Payment] Returning error result:", { success: false, error: errorMessage });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function createQRISPayment(
  cart: CartItem[],
  total: number,
): Promise<PaymentResult> {
  console.log("[POS Payment] Starting QRIS payment process:", { itemCount: cart.length, total });

  try {
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
