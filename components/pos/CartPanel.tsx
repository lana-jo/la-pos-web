"use client";

import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Plus as AddIcon, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createQRISPayment, createCashPayment } from "@/lib/payment/actions";
import { Banknote } from "lucide-react";
import { PrintManager } from "@/lib/printer/printManager";
import { Transaction, TransactionItem, ProductVariant, Discount } from "@/types";
import { getSettings } from "@/lib/settings/actions";
import { useEffect } from "react";
import { PinVerificationModal, DiscountModal } from "@/components/pos/modals";

interface CartPanelProps {
  onAddItem?: () => void;
}

export function CartPanel({ onAddItem }: CartPanelProps) {
  const cart = useCartStore((state) => state.cart);
  const appliedDiscount = useCartStore((state) => state.appliedDiscount);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [isProcessing, setIsProcessing] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  useEffect(() => {
    getSettings('general').then((res) => {
      if (res.success) setStoreSettings(res.data);
    });
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
    const subtotal = getSubtotal();
    const discountAmount = getDiscountAmount();
    const transaction: Transaction & { items: TransactionItem[] } = {
      id: transactionId,
      cashier_id: null,
      shift_id: null,
      customer_id: null,
      discount_id: appliedDiscount?.id ?? null,
      subtotal,
      discount_amount: discountAmount,
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
      items: cart.map((item) => ({
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
        discount_id: null,
        discount_type: null,
        subtotal: item.unit_price * item.quantity,
      })),
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
      const discountAmount = getDiscountAmount();
      const serializedCart = cart.map((item) => ({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
      }));
      const result = await createCashPayment(
        serializedCart as any,
        total,
        appliedDiscount?.id ?? null,
        discountAmount,
      );
      if (result.success) {
        toast.success("Transaksi berhasil");
        await printReceipt(result.transactionId, result.total, result.paymentMethod, new Date().toISOString());
        clearCart();
      } else {
        toast.error(result.error || "Pembayaran gagal");
      }
    } catch {
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
      const discountAmount = getDiscountAmount();
      const serializedCart = cart.map((item) => ({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
      }));
      const result = await createQRISPayment(
        serializedCart as any,
        total,
        appliedDiscount?.id ?? null,
        discountAmount,
      );
      if (result.success) {
        toast.success("Pembayaran dimulai!");
        await printReceipt(result.transactionId, result.total, result.paymentMethod, new Date().toISOString());
        clearCart();
      } else {
        toast.error(result.error || "Pembayaran gagal");
      }
    } catch {
      toast.error("Pembayaran gagal. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscountClick = () => setShowPinModal(true);
  const handlePinSuccess = () => { setShowPinModal(false); setShowDiscountModal(true); };
  const handleApplyDiscount = (discount: Discount | null) => {
    applyDiscount(discount);
    toast[discount ? "success" : "info"](discount ? `Diskon "${discount.name}" diterapkan` : "Diskon dihapus");
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
    <>
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
                    disabled={
                      item.product.track_stock ? (
                        item.variant ? (
                          item.quantity >= Math.floor((item.product.cached_stock ?? item.product.stock ?? 0) / (item.variant.conversion_qty || 1))
                        ) : (
                          item.quantity >= (item.product.cached_stock ?? item.product.stock ?? 0)
                        )
                      ) : false
                    }
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

        <div className="border-t border-border pt-4 space-y-2">
          {/* Subtotal (only shown when discount is active) */}
          {appliedDiscount && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
          )}

          {/* Discount row */}
          {appliedDiscount && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-700 font-medium truncate max-w-[140px]">{appliedDiscount.name}</span>
                {appliedDiscount.code && (
                  <Badge variant="secondary" className="text-xs font-mono px-1 py-0">{appliedDiscount.code}</Badge>
                )}
                <button
                  onClick={() => applyDiscount(null)}
                  className="h-4 w-4 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center"
                  title="Hapus diskon"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
              <span className="text-green-600 font-semibold">−{formatCurrency(getDiscountAmount())}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-base sm:text-lg font-bold text-muted-foreground">Total:</span>
            <span className="text-xl sm:text-2xl font-black text-primary-brand">{formatCurrency(getTotal())}</span>
          </div>

          {/* Discount button */}
          <Button
            variant="outline"
            size="sm"
            className={`w-full h-9 text-xs font-medium gap-1.5 ${
              appliedDiscount
                ? "border-green-500 text-green-700 bg-green-50/50 hover:bg-green-50"
                : "border-dashed border-primary/40 text-primary hover:bg-primary/5"
            }`}
            onClick={handleDiscountClick}
            disabled={isProcessing}
          >
            <Tag className="h-3.5 w-3.5" />
            {appliedDiscount ? "Ganti Diskon" : "Terapkan Diskon"}
          </Button>

          {/* Payment buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Button
              className="w-full h-11 pos-button-primary text-sm shadow-lg font-bold"
              size="sm"
              onClick={handleCashPayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Banknote className="h-4 w-4 mr-2" />Bayar Tunai</>}
            </Button>
            <Button
              className="w-full h-11 pos-qris-button text-sm shadow-lg font-bold"
              size="sm"
              onClick={handlePayment}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4 mr-2" />Bayar QRIS</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* PIN gate */}
    <PinVerificationModal
      isOpen={showPinModal}
      onClose={() => setShowPinModal(false)}
      onSuccess={handlePinSuccess}
      title="Verifikasi PIN Diskon"
      description="Masukkan PIN kasir untuk menerapkan diskon pada transaksi ini"
    />

    {/* Discount picker */}
    <DiscountModal
      isOpen={showDiscountModal}
      onClose={() => setShowDiscountModal(false)}
      cartSubtotal={getSubtotal()}
      onApply={handleApplyDiscount}
      currentDiscount={appliedDiscount}
    />
  </>
  );
}
