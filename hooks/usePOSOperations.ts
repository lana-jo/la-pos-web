"use client";

import { useState, useCallback, useEffect, startTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductVariant, Database } from "@/types";
import { useCartStore } from "@/store/cart";

interface UsePOSOperationsProps {
  cashierId?: string;
}

export function usePOSOperations({ cashierId }: UsePOSOperationsProps = {}) {
  const addItem = useCartStore((state) => state.addItem);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    role: string;
    id: string;
  } | null>(null);

  // Check user role and profile
  const checkUserRole = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: "No session" };
      }

      // Get role and full_name from database profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name, id")
        .eq("id", session.user.id)
        .maybeSingle() as {
          data: {
            role: "admin" | "cashier" | "customer";
            full_name: string;
            id: string;
          } | null;
          error: any;
        };

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        return { success: false, error: "Profile not found" };
      }

      // Store user profile data
      setUserProfile({
        full_name: profile.full_name || "Unknown User",
        role: profile.role,
        id: profile.id,
      });

      // Role validation
      if (profile.role !== "cashier" && profile.role !== "admin") {
        return { success: false, error: "Access denied" };
      }

      return { success: true, profile };
    } catch (error) {
      console.error("Error checking user role:", error);
      return { success: false, error: "Failed to check role" };
    }
  }, []);

  // Handle manual product entry
  const handleAddManualProduct = useCallback((
    product: Product,
    quantity: number
  ) => {
    try {
      console.log("[Manual Entry] Adding product:", product);
      console.log("[Manual Entry] Quantity:", quantity);

      // Add to cart using cart store
      addItem(product, quantity);

      toast.success(`Added ${quantity}x ${product.name} to cart`);
      return { success: true };
    } catch (error) {
      console.error("[Manual Entry] Error:", error);
      const errorMsg = `Failed to add manual product: ${error instanceof Error ? error.message : "Unknown error"}`;
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [addItem]);

  // Handle product selection (with variant support)
  const handleProductSelection = useCallback((
    product: Product & { variants?: ProductVariant[] },
    selectedVariant?: ProductVariant,
    quantity: number = 1
  ) => {
    try {
      // Add product or selected variant
      addItem(product, quantity, selectedVariant || null);
      const itemName = selectedVariant 
        ? `${product.name} - ${selectedVariant.variant_name}` 
        : product.name;
      toast.success(`Added ${quantity}x ${itemName} to cart`);
      return { success: true, hasVariants: product.variants && product.variants.length > 0 };
    } catch (error) {
      console.error("Product selection error:", error);
      toast.error("Failed to add product to cart");
      return { success: false, hasVariants: false };
    }
  }, [addItem]);

  // Handle variant selection
  const handleVariantSelection = useCallback((
    product: Product & { variants?: ProductVariant[] },
    variant: ProductVariant,
    quantity: number
  ) => {
    console.log("[Variant Selection] Variant selected:", {
      product_id: product.id,
      product_name: product.name,
      variant_id: variant.id,
      variant_name: variant.variant_name,
      barcode: variant.barcode,
      price: variant.price,
      conversion_qty: variant.conversion_qty,
      quantity: quantity
    });

    return handleProductSelection(product, variant, quantity);
  }, [handleProductSelection]);

  // Handle barcode detection (from both camera and USB scanner)
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    console.log("[Barcode Detection] Processing barcode:", { barcode });

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
        console.log("[Barcode Detection] Found variant:", {
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
          console.log("[Barcode Detection] Out of stock:", { variant_name: variant.variant_name, stock: productStock });
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Add variant to cart
        const result = handleProductSelection(variant.product, variant, 1);
        if (result.success) {
          toast.success(`Added ${variant.product.name} - ${variant.variant_name} to cart`);
        }
        return result;
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
          return { success: false, error: errorMsg };
        } else {
          console.error("[Barcode Detection] Database error:", error);
          const errorMsg = "Failed to lookup product";
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      if (!product) {
        const errorMsg = `Product not found for barcode: ${barcode}`;
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check stock availability
      if (product.stock <= 0) {
        const errorMsg = `Product "${product.name}" is out of stock`;
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log("[Barcode Detection] Found product:", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        stock: product.stock
      });

      // Add product to cart
      const result = handleProductSelection(product as Product, undefined, 1);
      if (result.success) {
        toast.success(`Added ${product.name} to cart`);
      }
      return result;

    } catch (error) {
      console.error("[Barcode Detection] Error processing barcode:", error);
      const errorMsg = "Failed to process barcode";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [handleProductSelection]);

  // Verify PIN for sensitive operations
  const verifyPIN = useCallback(async (pin: string, userId?: string) => {
    try {
      const targetUserId = userId || userProfile?.id || cashierId;
      
      if (!targetUserId) {
        return { success: false, error: "User ID not found" };
      }

      const { data, error } = await (supabase as any)
        .rpc('fn_verify_pin', { 
          p_user_id: targetUserId, 
          pinhash: pin 
        });

      if (error) {
        console.error("PIN verification error:", error);
        return { success: false, error: "PIN verification failed" };
      }

      return { success: !!data, error: !data ? "Invalid PIN" : null };
    } catch (error) {
      console.error("PIN verification error:", error);
      return { success: false, error: "PIN verification failed" };
    }
  }, [userProfile, cashierId]);

  // Create a new transaction
  const createTransaction = useCallback(async (
    transactionData: Omit<Database["public"]["Tables"]["transactions"]["Insert"], "id" | "created_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionData as any)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }, []);

  // Add items to a transaction
  const addTransactionItems = useCallback(async (
    transactionId: string,
    items: Omit<Database["public"]["Tables"]["transaction_items"]["Insert"], "id">[]
  ) => {
    try {
      const { data, error } = await supabase
        .from("transaction_items")
        .insert(items as any)
        .select();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error adding transaction items:", error);
      toast.error("Failed to add items to transaction");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }, []);

  // Auto-check user role on mount
  useEffect(() => {
    if (!userProfile) {
      startTransition(() => {
        checkUserRole();
      });
    }
  }, [userProfile, checkUserRole]);

  return {
    // User data
    userProfile,
    setUserProfile,

    // Cart operations
    handleAddManualProduct,
    handleProductSelection,
    handleVariantSelection,
    handleBarcodeDetected,

    // Transaction operations
    createTransaction,
    addTransactionItems,

    // Security
    verifyPIN,
    checkUserRole,
  };
}
