"use client";

import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Plus as AddIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createQRISPayment, createCashPayment } from "@/lib/payment/actions";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { Banknote } from "lucide-react";
import { PrintManager } from "@/lib/printer/printManager";
import { Transaction, TransactionItem, ProductVariant } from "@/types";

interface CartPanelProps {
  onAddItem?: () => void;
}

export function CartPanel({ onAddItem }: CartPanelProps) {
  const cart = useCartStore((state) => state.cart);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const printReceipt = async (
    transactionId: string,
    total: number,
    paymentMethod: string,
    paidAt?: string
  ) => {
    console.log("[POS Cart] Starting receipt printing:", { transactionId, total, paymentMethod, paidAt });
    const printManager = PrintManager.getInstance();

    
    // Build transaction object for printing
    const transaction: Transaction & { items: TransactionItem[] } = {
      id: transactionId,
      cashier_id: null,
      shift_id: null,
      customer_id: null,
      discount_id: null,
      subtotal: total,
      discount_amount: 0,
      tax_amount: 0,
      total,
      amount_paid: total,
      change_amount: 0,
      payment_method: paymentMethod as "cash" | "qris",
      payment_status: "paid",
      notes: null,
      midtrans_order_id: null,
      qris_url: null,
      qris_string: null,
      qris_expires_at: null,
      paid_at: paidAt || new Date().toISOString(),
      voided_at: null,
      voided_by: null,
      void_reason: null,
      created_at: new Date().toISOString(),
      items: cart.map((item) => {
        const transactionItem = {
          id: "",
          transaction_id: transactionId,
          product_id: item.product.id,
          product_variant_id: item.variant?.id || null,
          product_name: item.product.name,
          variant_name: item.variant?.variant_name || null,
          barcode: item.variant?.barcode || item.product.barcode,
          qty: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.variant?.cost_price || item.product.cost_price || 0,
          discount_amount: 0,
          subtotal: item.unit_price * item.quantity,
        };
        console.log("[POS Cart] Cart item for transaction:", {
          product_name: item.product.name,
          variant_name: item.variant?.variant_name || null,
          variant_id: item.variant?.id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: transactionItem.subtotal
        });
        return transactionItem;
      }),
    };

    console.log("[POS Cart] Transaction items:", transaction.items.length);
    console.log("[POS Cart] Transaction data:", transaction);

    console.log("[POS Cart] Sending to print manager");
    const success = await printManager.printReceipt(transaction, "Cashier", {
      silent: false,
    });

    if (success) {
      console.log("[POS Cart] Receipt printed successfully");
      toast.success("Receipt printed successfully!");
    } else {
      console.error("[POS Cart] Failed to print receipt");
      toast.error("Failed to print receipt");
    }
  };

  const handleCashPayment = async () => {
    const startTime = Date.now();
    console.log("[POS Cart] =========================================");
    console.log("[POS Cart] Starting cash payment process");
    console.log("[POS Cart] Timestamp:", new Date().toISOString());
    console.log("[POS Cart] =========================================");

    if (cart.length === 0) {
      console.log("[POS Cart] ❌ Cart is empty, cannot process payment");
      toast.error("Cart is empty");
      return;
    }

    console.log("[POS Cart] ✓ Cart validation passed");
    console.log("[POS Cart] Cart items for payment:", { itemCount: cart.length, total: getTotal() });
    console.log("[POS Cart] Payment status check: BELUM BAYAR (pending)");

    // Log each cart item in detail
    console.log("[POS Cart] --- Cart Item Details ---");
    cart.forEach((item, index) => {
      console.log(`[POS Cart] Item ${index + 1}/${cart.length}:`, {
        product_id: item.product.id,
        product_name: item.product.name,
        barcode: item.product.barcode,
        variant_id: item.variant?.id || null,
        variant_name: item.variant?.variant_name || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
        track_stock: item.product.track_stock,
        stock: item.product.track_stock ? item.product.cached_stock : item.product.stock
      });
    });
    console.log("[POS Cart] --- End Cart Item Details ---");

    setIsProcessing(true);
    console.log("[POS Cart] ✓ Processing state set to true");

    try {
      const total = getTotal();
      console.log("[POS Cart] Calculated total:", total);

      console.log("[POS Cart] --- Starting Cart Serialization ---");
      const serializationStart = Date.now();
      // Serialize cart to plain JSON for Server Action
      const serializedCart = cart.map((item, index) => {
        const serializedItem = {
          product: {
            id: item.product.id,
            category_id: item.product.category_id,
            unit_id: item.product.unit_id,
            supplier_id: item.product.supplier_id,
            name: item.product.name,
            barcode: item.product.barcode,
            description: item.product.description,
            cost_price: item.product.cost_price,
            price: item.product.price,
            stock: item.product.track_stock ? item.product.cached_stock : item.product.stock,
            cached_stock: item.product.cached_stock,
            track_stock: item.product.track_stock,
            low_stock_threshold: item.product.low_stock_threshold,
            min_stock: item.product.min_stock,
            max_stock: item.product.max_stock,
            image_url: item.product.image_url,
            is_active: item.product.is_active,
            is_consignment: item.product.is_consignment,
            created_at: item.product.created_at,
            updated_at: item.product.updated_at,
          },
          variant: item.variant ? {
            id: item.variant.id,
            product_id: item.variant.product_id,
            variant_name: item.variant.variant_name,
            barcode: item.variant.barcode,
            price: item.variant.price,
            cost_price: item.variant.cost_price,
            conversion_qty: item.variant.conversion_qty,
            min_qty: item.variant.min_qty,
            is_active: item.variant.is_active,
            is_default: item.variant.is_default,
            created_at: item.variant.created_at,
            updated_at: item.variant.updated_at,
          } : null,
          quantity: item.quantity
        };
        console.log(`[POS Cart] Serialized item ${index + 1}:`, {
          product_name: serializedItem.product.name,
          has_variant: !!serializedItem.variant,
          quantity: serializedItem.quantity
        });
        return serializedItem;
      });
      const serializationEnd = Date.now();
      console.log("[POS Cart] ✓ Cart serialization completed in", serializationEnd - serializationStart, "ms");
      console.log("[POS Cart] Serialized cart size:", JSON.stringify(serializedCart).length, "bytes");
      console.log("[POS Cart] --- End Cart Serialization ---");

      console.log("[POS Cart] --- Calling Server Action ---");
      const serverActionStart = Date.now();
      console.log("[POS Cart] Action: createCashPayment");
      console.log("[POS Cart] Payload:", { itemCount: serializedCart.length, total });
      const result = await createCashPayment(serializedCart, total);
      const serverActionEnd = Date.now();
      console.log("[POS Cart] ✓ Server action completed in", serverActionEnd - serverActionStart, "ms");
      console.log("[POS Cart] Server action result:", result);
      console.log("[POS Cart] Result type:", typeof result);
      console.log("[POS Cart] Result keys:", Object.keys(result || {}));
      console.log("[POS Cart] Result success value:", result?.success);
      console.log("[POS Cart] Result error value:", (result as any)?.error);
      console.log("[POS Cart] --- End Server Action ---");

      if (result.success) {
        console.log("[POS Cart] ✓✓✓ Cash payment successful!");
        console.log("[POS Cart] Transaction ID:", result.transactionId);
        console.log("[POS Cart] Total:", result.total);
        console.log("[POS Cart] Payment Method:", result.paymentMethod);
        console.log("[POS Cart] Payment status: BELUM BAYAR → LUNAS (paid)");
        toast.success("Transaksi berhasil terbayar");

        // Print receipt
        console.log("[POS Cart] --- Starting Receipt Printing ---");
        const printStart = Date.now();
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        const printEnd = Date.now();
        console.log("[POS Cart] ✓ Receipt printing completed in", printEnd - printStart, "ms");
        console.log("[POS Cart] --- End Receipt Printing ---");

        console.log("[POS Cart] --- Clearing Cart ---");
        clearCart();
        console.log("[POS Cart] ✓ Cart cleared successfully");
        console.log("[POS Cart] ✓ Payment status: TERBAYAR");
        console.log("[POS Cart] --- End Cart Clearing ---");
      } else {
        console.error("[POS Cart] ❌ Cash payment failed");
        console.error("[POS Cart] Error message:", result.error);
        console.error("[POS Cart] Full error result:", result);
        toast.error(result.error || "Cash payment failed");
      }
    } catch (error) {
      console.error("[POS Cart] ❌❌❌ Cash payment exception caught");
      console.error("[POS Cart] Error type:", error?.constructor?.name);
      console.error("[POS Cart] Error message:", error instanceof Error ? error.message : String(error));
      console.error("[POS Cart] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("[POS Cart] Full error object:", error);
      toast.error("Cash payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
      const endTime = Date.now();
      console.log("[POS Cart] ✓ Processing state set to false");
      console.log("[POS Cart] =========================================");
      console.log("[POS Cart] Cash payment process completed");
      console.log("[POS Cart] Total duration:", endTime - startTime, "ms");
      console.log("[POS Cart] =========================================");
    }
  };

  const handlePayment = async () => {
    console.log("[POS Cart] Starting QRIS payment process");
    if (cart.length === 0) {
      console.log("[POS Cart] Cart is empty, cannot process payment");
      toast.error("Cart is empty");
      return;
    }

    console.log("[POS Cart] Cart items for QRIS payment:", { itemCount: cart.length, total: getTotal() });
    setIsProcessing(true);
    try {
      const total = getTotal();
      console.log("[POS Cart] Serializing cart for QRIS server action:", { itemCount: cart.length, total });
      // Serialize cart to plain JSON for Server Action
      const serializedCart = cart.map(item => ({
        product: {
          id: item.product.id,
          category_id: item.product.category_id,
          unit_id: item.product.unit_id,
          supplier_id: item.product.supplier_id,
          name: item.product.name,
          barcode: item.product.barcode,
          description: item.product.description,
          cost_price: item.product.cost_price,
          price: item.product.price,
          stock: item.product.track_stock ? item.product.cached_stock : item.product.stock,
          cached_stock: item.product.cached_stock,
          track_stock: item.product.track_stock,
          low_stock_threshold: item.product.low_stock_threshold,
          min_stock: item.product.min_stock,
          max_stock: item.product.max_stock,
          image_url: item.product.image_url,
          is_active: item.product.is_active,
          is_consignment: item.product.is_consignment,
          created_at: item.product.created_at,
          updated_at: item.product.updated_at,
        },
        variant: item.variant ? {
          id: item.variant.id,
          product_id: item.variant.product_id,
          variant_name: item.variant.variant_name,
          barcode: item.variant.barcode,
          price: item.variant.price,
          cost_price: item.variant.cost_price,
          conversion_qty: item.variant.conversion_qty,
          min_qty: item.variant.min_qty,
          is_active: item.variant.is_active,
          is_default: item.variant.is_default,
          created_at: item.variant.created_at,
          updated_at: item.variant.updated_at,
        } : null,
        quantity: item.quantity
      }));
      
      console.log("[POS Cart] Calling createQRISPayment server action");
      const result = await createQRISPayment(serializedCart, total);

      if (result.success) {
        console.log("[POS Cart] QRIS payment initiated successfully:", result);
        toast.success("Payment initiated successfully!");
        // Print receipt (Note: For QRIS, ideally print after webhook confirms payment)
        console.log("[POS Cart] Printing receipt for QRIS payment");
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        clearCart();
        console.log("[POS Cart] Cart cleared after QRIS payment initiation");
        // TODO: Show QRIS modal with result.qrisUrl, result.qrisString, result.expiryTime
        console.log("[POS Cart] QRIS data for modal:", result);
      } else {
        console.error("[POS Cart] QRIS payment failed:", result.error);
        toast.error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("[POS Cart] QRIS payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
      console.log("[POS Cart] QRIS payment process completed");
    }
  };

  if (cart.length === 0) {
    return (
      <Card className="w-full pos-modal-content border-none shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-primary">
            <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            Shopping Cart
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">0 items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8">
            <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-primary-brand opacity-30" />
            <p className="text-sm sm:text-base text-muted-foreground font-medium">Your cart is empty</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Scan products to add them to your cart
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

    return (
    <Card className="w-full pos-modal-content border-none shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            Shopping Cart
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{getTotalItems()} items</Badge>
          </div>
          <div className="flex items-center gap-2">
            {onAddItem && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm border-primary-brand text-primary-brand hover:bg-primary-brand hover:text-white"
                onClick={onAddItem}
              >
                <AddIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={clearCart}>
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto pr-2">
          {cart.map((item) => (
            <div
              key={item.product.id + (item.variant?.id || '')}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate text-foreground">
                  {item.variant ? `${item.product.name} - ${item.variant.variant_name}` : item.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={() =>
                      updateItemQuantity(item.product.id, item.quantity - 1, item.variant?.id || null)
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-bold text-sm text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={() =>
                      updateItemQuantity(item.product.id, item.quantity + 1, item.variant?.id || null)
                    }
                    disabled={(() => {
                      if (!item.product.track_stock) return false;
                      const productStock = item.product.cached_stock || item.product.stock || 0;
                      if (item.variant) {
                        const conversionQty = item.variant.conversion_qty || 1;
                        const availableStock = conversionQty > 1
                          ? Math.floor(productStock / conversionQty)
                          : productStock;
                        return item.quantity >= availableStock;
                      }
                      return item.quantity >= productStock;
                    })()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(item.product.id, item.variant?.id || null)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base sm:text-lg font-bold text-muted-foreground">Total:</span>
            <span className="text-xl sm:text-2xl font-black text-primary-brand">{formatCurrency(getTotal())}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="w-full h-11 pos-button-primary text-sm shadow-lg font-bold"
              size="sm"
              onClick={handleCashPayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Banknote className="h-4 w-4 mr-2" />
                  Pay Cash
                </>
              )}
            </Button>

            <Button
              className="w-full h-11 pos-qris-button text-sm shadow-lg font-bold"
              size="sm"
              onClick={handlePayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Pay QRIS
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
