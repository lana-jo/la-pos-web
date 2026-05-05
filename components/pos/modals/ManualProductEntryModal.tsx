"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { BaseModal } from "./BaseModal";

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
        cached_stock: 999999,
        track_stock: false,
        low_stock_threshold: 0,
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
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <Package className="h-5 w-5" />
          Manual Product Entry
        </>
      }
      size="sm"
    >
      <div className="space-y-4">
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
      <div className="flex gap-2">
        <Button className="pos-button-secondary" onClick={handleClose}>
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
      </div>
    </BaseModal>
  );
}
