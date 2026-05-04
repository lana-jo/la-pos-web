"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Grid3x3, X, Package, Search } from "lucide-react";
import type { Product, ProductVariant } from "@/types";

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: (Product & { variants?: ProductVariant[] })[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: { id: string; name: string }[];
  onProductSelect: (product: Product & { variants?: ProductVariant[] }, variant?: ProductVariant) => void;
}

export function ProductSelectionModal({
  isOpen,
  onClose,
  products,
  loading,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onProductSelect,
}: ProductSelectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <Grid3x3 className="h-5 w-5" />
            Select Product
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col pos-modal-body">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pos-search-input pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange("all")}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <div className="pos-loading-spinner mx-auto"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading products...
                  </p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No products found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or category filter
                  </p>
                </div>
              </div>
            ) : (
              <div className="pos-product-grid">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="pos-product-card"
                    onClick={() => onProductSelect(product)}
                  >
                    <div className="pos-product-image">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="pos-product-info">
                      <h3 className="pos-product-name">
                        {product.name}
                      </h3>
                      {product.variants && product.variants.length > 0 ? (
                        <>
                          <p className="pos-product-price">
                            Rp {Math.min(...product.variants.map(v => v.price)).toLocaleString("id-ID")} - 
                            Rp {Math.max(...product.variants.map(v => v.price)).toLocaleString("id-ID")}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="pos-product-stock">
                              {product.variants.length} variants
                            </p>
                            {product.categories && (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1 py-0.5"
                              >
                                {product.categories.name.length > 8 ? product.categories.name.slice(0, 8) + '.' : product.categories.name}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="pos-product-price">
                            Rp {product.price.toLocaleString("id-ID")}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="pos-product-stock">
                              Stock: {product.stock}
                            </p>
                            {product.categories && (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1 py-0.5"
                              >
                                {product.categories.name.length > 8 ? product.categories.name.slice(0, 8) + '.' : product.categories.name}
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pos-modal-footer">
          <Button
            className="pos-button-secondary"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
