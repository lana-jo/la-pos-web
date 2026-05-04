"use client";

import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createQRISPayment, createCashPayment } from "@/lib/payment/actions";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { Banknote } from "lucide-react";
import { PrintManager } from "@/lib/printer/printManager";
import { Transaction, TransactionItem, ProductVariant } from "@/types";

export function CartPanel() {
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
        console.log("[product_variant] Cart item for transaction:", {
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

    console.log("[printReceipt] Transaction items:", transaction.items.length);
    console.log("[printReceipt] Transaction data:", transaction);

    const success = await printManager.printReceipt(transaction, "Cashier", {
      silent: false,
    });

    if (success) {
      toast.success("Receipt printed successfully!");
    } else {
      toast.error("Failed to print receipt");
    }
  };

  const handleCashPayment = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setIsProcessing(true);
    try {
      const total = getTotal();
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
          stock: item.product.stock,
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
      const result = await createCashPayment(serializedCart, total);

      if (result.success) {
        toast.success("Cash payment completed successfully!");
        // Print receipt
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        clearCart();
        console.log("Cash payment completed:", result);
      } else {
        toast.error(result.error || "Cash payment failed");
      }
    } catch (error) {
      console.error("Cash payment error:", error);
      toast.error("Cash payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setIsProcessing(true);
    try {
      const total = getTotal();
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
          stock: item.product.stock,
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
      const result = await createQRISPayment(serializedCart, total);

      if (result.success) {
        toast.success("Payment initiated successfully!");
        // Print receipt (Note: For QRIS, ideally print after webhook confirms payment)
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        clearCart();
        // TODO: Show QRIS modal with result.qrisUrl, result.qrisString, result.expiryTime
        console.log("Payment QRIS data:", result);
      } else {
        toast.error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Card className="w-full pos-scanner-ready">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            Shopping Cart
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">0 items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8">
            <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-primary-brand opacity-50" />
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
    <Card className="w-full pos-scanner-ready">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            Shopping Cart
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{getTotalItems()} items</Badge>
          </div>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm pos-action-button hover:scale-[1.02]" onClick={clearCart}>
            Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="pos-cart-item flex items-center justify-between p-2 sm:p-3 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">
                  {item.variant ? `${item.product.name} - ${item.variant.variant_name}` : item.product.name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {item.variant ? (
                    <>
                      Base: {formatCurrency(item.product.price)} → Variant: {formatCurrency(item.unit_price)} × {item.quantity}
                    </>
                  ) : (
                    <>
                      {formatCurrency(item.unit_price)} × {item.quantity}
                    </>
                  )}
                </p>
                {item.variant && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {item.variant.variant_name}
                    </Badge>
                    {item.product.price !== item.unit_price && (
                      <Badge variant="outline" className="text-xs">
                        {item.unit_price > item.product.price ? '+' : ''}{formatCurrency(item.unit_price - item.product.price)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-8 sm:w-8 p-0 pos-action-button hover:scale-[1.05]"
                    onClick={() =>
                      updateItemQuantity(item.product.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                  </Button>
                  <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 sm:h-8 sm:w-8 p-0 pos-action-button hover:scale-[1.05]"
                    onClick={() =>
                      updateItemQuantity(item.product.id, item.quantity + 1)
                    }
                    disabled={item.quantity >= (item.product.stock)}
                  >
                    <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                  onClick={() => removeItem(item.product.id)}
                >
                  <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base sm:text-lg font-semibold text-muted-foreground">Total:</span>
            <span className="text-xl sm:text-2xl font-bold text-primary-brand">{formatCurrency(getTotal())}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InteractiveButton
              className="w-full pos-cash-button text-xs sm:text-sm"
              size="sm"
              onClick={handleCashPayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <>
                  <Banknote className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Pay Cash</span>
                  <span className="sm:hidden">Cash</span>
                </>
              )}
            </InteractiveButton>

            <Button
              className="w-full pos-qris-button text-xs sm:text-sm"
              size="sm"
              onClick={handlePayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Pay QRIS</span>
                  <span className="sm:hidden">QRIS</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
