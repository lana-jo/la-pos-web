"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductVariant, Database } from "@/types";

interface UsePOSCameraScannerProps {
  onProductFound: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  onError?: (error: string) => void;
}

export function usePOSCameraScanner({ 
  onProductFound, 
  onError 
}: UsePOSCameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [recentlyScanned, setRecentlyScanned] = useState<Set<string>>(new Set());
  const scanTimeoutRef = useRef<NodeJS.Timeout>();

  // Clear recently scanned barcodes after 2 seconds
  const clearRecentScan = useCallback((barcode: string) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    scanTimeoutRef.current = setTimeout(() => {
      setRecentlyScanned(prev => {
        const newSet = new Set(prev);
        newSet.delete(barcode);
        return newSet;
      });
    }, 2000);
  }, []);

  // Handle barcode detection from camera or USB scanner
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    // Prevent duplicate scans within 2 seconds
    if (recentlyScanned.has(barcode)) {
      return;
    }

    setRecentlyScanned(prev => new Set(prev).add(barcode));
    clearRecentScan(barcode);

    console.log("[POS Scanner] Processing barcode:", { barcode });

    try {
      // First try to find variant by barcode (more specific)
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select(`
          *,
          product:products(*)
        `)
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { 
          data: ProductVariant & { product: Product } | null, 
          error: any 
        };

      if (variant && variant.product) {
        console.log("[POS Scanner] Found variant:", {
          variant_id: variant.id,
          variant_name: variant.variant_name,
          product_name: variant.product.name,
          price: variant.price,
          conversion_qty: variant.conversion_qty
        });

        // Check stock availability
        const productStock = variant.product.stock || 0;
        if (productStock <= 0) {
          const errorMsg = `Product "${variant.product.name}" is out of stock`;
          console.log("[POS Scanner] Out of stock:", { variant_name: variant.variant_name, stock: productStock });
          toast.error(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Add variant to cart
        onProductFound(variant.product, 1, variant);
        toast.success(`Added ${variant.product.name} - ${variant.variant_name} to cart`);
        return;
      }

      // If not found in variants, try main products table
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(id, name, slug)
        `)
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { 
          data: Database["public"]["Tables"]["products"]["Row"] & {
            categories?: { id: string; name: string; slug: string } | null;
          } | null, 
          error: any 
        };

      if (error) {
        if (error.code === 'PGRST116') {
          const errorMsg = `Product not found for barcode: ${barcode}`;
          toast.error(errorMsg);
          onError?.(errorMsg);
        } else {
          console.error("[POS Scanner] Database error:", error);
          const errorMsg = "Failed to lookup product";
          toast.error(errorMsg);
          onError?.(errorMsg);
        }
        return;
      }

      if (!product) {
        const errorMsg = `Product not found for barcode: ${barcode}`;
        toast.error(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Check stock availability
      if (product.stock <= 0) {
        const errorMsg = `Product "${product.name}" is out of stock`;
        toast.error(errorMsg);
        onError?.(errorMsg);
        return;
      }

      console.log("[POS Scanner] Found product:", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        stock: product.stock
      });

      // Add product to cart
      onProductFound(product as Product, 1);
      toast.success(`Added ${product.name} to cart`);

    } catch (error) {
      console.error("[POS Scanner] Error processing barcode:", error);
      const errorMsg = "Failed to process barcode";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  }, [recentlyScanned, onProductFound, onError, clearRecentScan]);

  // Start scanning
  const startScanning = useCallback(() => {
    setIsScanning(true);
    setRecentlyScanned(new Set());
  }, []);

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    setRecentlyScanned(new Set());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return {
    isScanning,
    startScanning,
    stopScanning,
    handleBarcodeDetected,
  };
}
