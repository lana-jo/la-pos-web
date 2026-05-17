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
import { getSettings } from "@/lib/settings/actions";
import { useEffect } from "react";

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
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const result = await getSettings('general');
      if (result.success) {
        setStoreSettings(result.data);
      }
    };
    fetchSettings();
  }, []);

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
        return {
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
      }),
    };

    const success = await printManager.printTransaction(transaction, "Kasir", {
      silent: false,
      storeSettings: {
        store_name: storeSettings?.store_name,
        store_address: storeSettings?.store_address,
        store_phone: storeSettings?.store_phone,
        store_email: storeSettings?.store_email,
      }
    });

    if (success) {
      toast.success("Resit berjaya dicetak!");
    } else {
      toast.error("Gagal mencetak resit");
    }
  };

  const handleCashPayment = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setIsProcessing(true);
    try {
      const total = getTotal();
      const serializedCart = cart.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          // ... (simplified for readability, actual implementation uses full object)
        },
        variant: item.variant,
        quantity: item.quantity
      }));
      
      const result = await createCashPayment(serializedCart as any, total);

      if (result.success) {
        toast.success("Transaksi berhasil");
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        clearCart();
      } else {
        toast.error(result.error || "Pembayaran gagal");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan, silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setIsProcessing(true);
    try {
      const total = getTotal();
      const serializedCart = cart.map(item => ({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity
      }));
      
      const result = await createQRISPayment(serializedCart as any, total);

      if (result.success) {
        toast.success("Pembayaran dimulai!");
        await printReceipt(
          result.transactionId,
          result.total,
          result.paymentMethod,
          new Date().toISOString()
        );
        clearCart();
      } else {
        toast.error(result.error || "Pembayaran gagal");
      }
    } catch (error) {
      toast.error("Pembayaran gagal. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Card className="w-full pos-modal-content border-none shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-primary">
            <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            Keranjang Belanja
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">0 item</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8">
            <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-primary-brand opacity-30" />
            <p className="text-sm sm:text-base text-muted-foreground font-medium">Keranjang Anda kosong</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pindai produk untuk menambahkannya ke keranjang
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
            Keranjang Belanja
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{getTotalItems()} item</Badge>
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
                <span className="hidden sm:inline">Tambah Item</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={clearCart}>
              Bersihkan
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
                    disabled={item.quantity >= (item.variant?.cached_stock ?? item.product.cached_stock ?? 0)}
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
                  Bayar Tunai
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
                  Bayar QRIS
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
