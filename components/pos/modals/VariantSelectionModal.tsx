"use client";

import { useState } from "react";
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
import type { Product, ProductVariant } from "@/types";

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product & { variants?: ProductVariant[] } | null;
  onVariantSelect: (product: Product & { variants?: ProductVariant[] }, variant: ProductVariant, quantity: number) => void;
}

export function VariantSelectionModal({
  isOpen,
  onClose,
  product,
  onVariantSelect,
}: VariantSelectionModalProps) {
  const [variantQuantity, setVariantQuantity] = useState(1);

  const handleVariantSelection = (variant: ProductVariant) => {
    console.log("[Variant Selection] Variant selected:", {
      product_id: product?.id,
      product_name: product?.name,
      variant_id: variant.id,
      variant_name: variant.variant_name,
      barcode: variant.barcode,
      price: variant.price,
      conversion_qty: variant.conversion_qty,
      quantity: variantQuantity
    });
    
    if (product) {
      onVariantSelect(product, variant, variantQuantity);
      handleClose();
    }
  };

  const handleClose = () => {
    setVariantQuantity(1);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <Grid3x3 className="h-5 w-5" />
            Select Variant - {product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="pos-modal-body">
          {/* Quantity Selector */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <label className="pos-form-label mb-2 block">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                disabled={variantQuantity <= 1}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <div className="w-16 text-center">
                <span className="font-medium text-lg">{variantQuantity}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVariantQuantity(variantQuantity + 1)}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>

          {product.variants && product.variants.length > 0 ? (
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`pos-variant-card cursor-pointer transition-all p-4 rounded-lg border ${
                    (product.stock || 0) <= 0 
                      ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                      : 'hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02]'
                  }`}
                  onClick={() => (product.stock || 0) > 0 && handleVariantSelection(variant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center border ${
                        (product.stock || 0) <= 0 ? 'bg-red-50 border-red-200' : 'bg-muted'
                      }`}>
                        <Package className={`h-5 w-5 ${
                          (product.stock || 0) <= 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h4 className={`font-medium ${
                          (product.stock || 0) <= 0 ? 'text-muted-foreground' : ''
                        }`}>{variant.variant_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {variant.barcode ? `Barcode: ${variant.barcode}` : 'No barcode'}
                        </p>
                        {variant.conversion_qty > 1 && (
                          <p className="text-xs text-muted-foreground">
                            Conversion: {variant.conversion_qty} units
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        (product.stock || 0) <= 0 ? 'text-muted-foreground line-through' : 'text-primary-brand'
                      }`}>
                        Rp {variant.price.toLocaleString("id-ID")}
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <p className={`text-xs ${
                          (product.stock || 0) <= 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'
                        }`}>
                          {(product.stock || 0) <= 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
                        </p>
                        {variant.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No variants available</p>
            </div>
          )}
        </div>
        <DialogFooter className="pos-modal-footer">
          <Button
            className="pos-button-secondary"
            onClick={handleClose}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
