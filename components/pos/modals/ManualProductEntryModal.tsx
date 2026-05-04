"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Package, X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";

interface ManualProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product, quantity: number) => void;
}

export function ManualProductEntryModal({
  isOpen,
  onClose,
  onAddProduct,
}: ManualProductEntryModalProps) {
  const [manualProduct, setManualProduct] = useState({
    name: "",
    price: "",
    quantity: "1",
  });

  const handleAddManualProduct = () => {
    try {
      const price = parseFloat(manualProduct.price);
      const quantity = parseInt(manualProduct.quantity) || 1;

      if (!manualProduct.name || isNaN(price) || price <= 0) {
        toast.error("Please enter valid product name and price");
        return;
      }

      const manualProductData: Product = {
        id: `manual-${Date.now()}`,
        category_id: null,
        unit_id: null,
        supplier_id: null,
        name: manualProduct.name,
        description: null,
        cost_price: 0,
        price: price,
        stock: 999999,
        min_stock: 0,
        max_stock: null,
        barcode: "",
        image_url: null,
        is_active: true,
        is_consignment: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[Manual Entry] Adding product:", manualProductData);
      console.log("[Manual Entry] Quantity:", quantity);

      // Add to cart using callback
      onAddProduct(manualProductData, quantity);

      toast.success(`Added ${quantity}x ${manualProduct.name} to cart`);

      // Reset form and close modal
      setManualProduct({ name: "", price: "", quantity: "1" });
      onClose();
    } catch (error) {
      console.error("[Manual Entry] Error:", error);
      toast.error(
        `Failed to add manual product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleClose = () => {
    setManualProduct({ name: "", price: "", quantity: "1" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <Package className="h-5 w-5" />
            Manual Product Entry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pos-modal-body">
          <div className="space-y-2">
            <Label htmlFor="product-name" className="pos-form-label">Product Name</Label>
            <Input
              id="product-name"
              placeholder="Enter product name"
              value={manualProduct.name}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, name: e.target.value })
              }
              className="pos-form-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-price" className="pos-form-label">Price (IDR)</Label>
            <Input
              id="product-price"
              type="number"
              placeholder="Enter price"
              value={manualProduct.price}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, price: e.target.value })
              }
              className="pos-form-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-quantity" className="pos-form-label">Quantity</Label>
            <Input
              id="product-quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={manualProduct.quantity}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  quantity: e.target.value,
                })
              }
              className="pos-form-input"
            />
          </div>
        </div>
        <DialogFooter className="pos-modal-footer">
          <Button className="pos-button-secondary" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="pos-button-primary"
            onClick={handleAddManualProduct}
            disabled={!manualProduct.name || !manualProduct.price}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
