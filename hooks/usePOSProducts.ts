"use client";

import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductVariant, Database } from "@/types";

interface UsePOSProductsProps {
  autoFetch?: boolean;
}

export function usePOSProducts({ autoFetch = true }: UsePOSProductsProps = {}) {
  const [products, setProducts] = useState<(Product & { variants?: ProductVariant[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Fetch categories for filtering
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  // Fetch products with variants
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products with category info
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;

      // Fetch variants separately to avoid RLS issues
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("is_active", true) as { data: ProductVariant[] | null; error: any };

      if (variantsError) {
        console.error("[Product Variants] Error fetching variants:", variantsError);
        throw variantsError;
      }

      console.log("[Product Variants] Fetched variants:", {
        count: variantsData?.length || 0,
        variants: variantsData?.map((v: ProductVariant) => ({
          id: v.id,
          product_id: v.product_id,
          variant_name: v.variant_name,
          barcode: v.barcode,
          price: v.price,
          cost_price: v.cost_price,
          conversion_qty: v.conversion_qty,
          is_default: v.is_default
        }))
      });

      // Attach variants to products
      const productsWithVariants = (productsData || []).map((product: Product) => {
        const productVariants = (variantsData || []).filter((v: ProductVariant) => v.product_id === product.id);
        
        // Sort variants: default first, then by name
        const sortedVariants = productVariants.sort((a, b) => {
          if (a.is_default && !b.is_default) return -1;
          if (!a.is_default && b.is_default) return 1;
          return a.variant_name.localeCompare(b.variant_name);
        });

        console.log(`[Product Variants] Product ${product.name} (${product.id}) has ${sortedVariants.length} variants:`, 
          sortedVariants.map((v: ProductVariant) => ({
            id: v.id,
            variant_name: v.variant_name,
            barcode: v.barcode,
            price: v.price,
            cost_price: v.cost_price,
            conversion_qty: v.conversion_qty,
            is_default: v.is_default
          }))
        );

        return {
          ...product,
          variants: sortedVariants
        };
      });

      setProducts(productsWithVariants);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        (p.variants && p.variants.some((v: ProductVariant) => 
          v.variant_name.toLowerCase().includes(searchLower)
        )) ||
        (p.barcode && p.barcode.includes(searchTerm))
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Get product by barcode (for manual lookup)
  const getProductByBarcode = useCallback(async (barcode: string) => {
    try {
      // First try variants
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
        return { product: variant.product, variant };
      }

      // Then try main products
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(id, name, slug)
        `)
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { 
          data: Product | null, 
          error: any 
        };

      if (product) {
        return { product, variant: null };
      }

      return null;
    } catch (error) {
      console.error("Error finding product by barcode:", error);
      return null;
    }
  }, []);

  // Check if product is in stock
  const isProductInStock = useCallback((product: Product, variant?: ProductVariant, quantity: number = 1) => {
    const stock = product.stock || 0;
    const conversionQty = variant?.conversion_qty || 1;
    const requiredStock = quantity * conversionQty;
    
    return stock >= requiredStock;
  }, []);

  // Get effective price (variant price if variant selected, otherwise product price)
  const getEffectivePrice = useCallback((product: Product, variant?: ProductVariant) => {
    return variant?.price || product.price;
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      startTransition(() => {
        fetchProducts();
        fetchCategories();
      });
    }
  }, [autoFetch, fetchProducts, fetchCategories]);

  return {
    // Data
    products: filteredProducts,
    allProducts: products,
    categories,
    loading,

    // Search/Filter state
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,

    // Actions
    fetchProducts,
    fetchCategories,
    getProductByBarcode,
    isProductInStock,
    getEffectivePrice,
  };
}
