"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Grid3x3, X, Package } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types";

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product & { variants?: ProductVariant[] } | null;
  onVariantSelect: (product: Product, variant: ProductVariant, quantity: number) => void;
}

export function VariantSelectionModal({
  isOpen,
  onClose,
  product,
  onVariantSelect,
}: VariantSelectionModalProps) {
  // Menggunakan local state untuk quantity agar responsif dan tidak membebani parent
  const [quantity, setQuantity] = useState(1);

  // Reset quantity setiap kali modal dibuka atau produk berganti
  useEffect(() => {
    if (isOpen) {
      // Use a small delay to avoid synchronous setState during effect execution
      const timer = setTimeout(() => {
        setQuantity(1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, product]);

  // LOGIKA INTI: Menghitung ketersediaan unit varian berdasarkan stok mentah (pcs)
  const getVariantStatus = (variant: ProductVariant) => {
    if (!product) return { available: 0, isDisabled: true };

    const conversionQty = variant.conversion_qty || 1;
    // Mengambil stok mentah (pcs) dari kolom cached_stock atau stock
    const rawStock = (product.cached_stock || 0) > 0 ? product.cached_stock : (product.stock || 0);
    
    // Menghitung berapa unit varian yang bisa dibentuk (pembulatan ke bawah)
    // Contoh: Stok 10 pcs, Varian "Isi 3", maka tersedia 3 unit varian.
    const availableInVariantUnit = Math.floor(rawStock / conversionQty);
    
    const isOutOfStock = availableInVariantUnit <= 0;
    const isNotEnough = quantity > availableInVariantUnit;
    const isBelowMinQty = quantity < (variant.min_qty || 1);

    return {
      available: availableInVariantUnit,
      isDisabled: isOutOfStock || isNotEnough || isBelowMinQty,
      isOutOfStock,
      isNotEnough,
      conversionQty
    };
  };

  const handleSelect = (variant: ProductVariant) => {
    const { available, isNotEnough } = getVariantStatus(variant);

    if (isNotEnough) {
      toast.error(`Stok tidak cukup. Hanya tersedia ${available} ${variant.variant_name}`);
      return;
    }

    if (product) {
      onVariantSelect(product, variant, quantity);
      onClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Pilih Varian - {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="pos-modal-body py-4">
          {/* Kontrol Kuantitas */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium mb-3">Tentukan Jumlah Beli:</p>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              > - </Button>
              <span className="text-xl font-bold w-12 text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => setQuantity(q => q + 1)}
              > + </Button>
            </div>
          </div>

          {/* List Varian */}
          <div className="space-y-3">
            {product.variants?.map((variant) => {
              const { available, isDisabled, isOutOfStock, conversionQty } = getVariantStatus(variant);
              
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(variant)}
                  className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all ${
                    isDisabled 
                      ? 'opacity-50 bg-muted/20 cursor-not-allowed grayscale' 
                      : 'hover:border-primary hover:bg-primary/5 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOutOfStock ? 'bg-red-50' : 'bg-primary/10'}`}>
                      <Package className={`h-5 w-5 ${isOutOfStock ? 'text-red-400' : 'text-primary'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{variant.variant_name}</p>
                      <p className="text-xs text-muted-foreground">Isi: {conversionQty} pcs/unit</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">Rp {variant.price.toLocaleString("id-ID")}</p>
                    <p className={`text-[11px] font-bold mt-1 ${isOutOfStock ? "text-red-500 uppercase" : "text-green-600"}`}>
                      {isOutOfStock ? "Stok Habis" : `Tersedia: ${available} unit`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pos-modal-footer">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" /> Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}