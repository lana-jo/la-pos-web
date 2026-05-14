'use client'

import { useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'

export function useBarcodeQueue() {
  const queue = useRef<string[]>([])
  const isProcessing = useRef(false)
  const addItem = useCartStore((state) => state.addItem)

  const processBarcode = useCallback(async (barcode: string) => {
    console.log("[POS Barcode Queue] Processing barcode:", { barcode, queueLength: queue.current.length });
    try {
      // First try to find variant by barcode
      console.log("[POS Barcode Queue] Looking up variant by barcode:", barcode);
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('*, product:products(*)')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single() as { data: any, error: any }

      if (variant && !variantError) {
        console.log("[POS Barcode Queue] Found variant:", {
          variantId: variant.id,
          variantName: variant.variant_name,
          productName: variant.product?.name,
          price: variant.price
        });
        
        // Found variant, check stock and add to cart
        // Calculate actual available stock for this variant based on conversion quantity
        const conversionQty = variant.conversion_qty || 1;
        // Use cached_stock if available, otherwise fallback to stock
        const productStock = variant.product?.cached_stock ?? variant.product?.stock ?? 0;
        const availableVariantStock = conversionQty > 1 
          ? Math.floor(productStock / conversionQty)
          : productStock;
        
        console.log("[POS Barcode Queue] Stock check for variant:", {
          variantName: variant.variant_name,
          productStock,
          conversionQty,
          availableVariantStock
        });
        
        if (availableVariantStock <= 0) {
          console.log("[POS Barcode Queue] Variant out of stock:", { variantName: variant.variant_name });
          toast.warning(`Product out of stock: ${variant.variant_name}`)
          return
        }

        const product = variant.product as Product
        console.log("[POS Barcode Queue] Adding variant to cart:", { productName: product.name, variantName: variant.variant_name });
        addItem(product, 1, variant)
        toast.success(`Added: ${product.name} - ${variant.variant_name}`)
        
        // Play success sound
        const audio = new Audio('/data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
        audio.volume = 0.3
        audio.play().catch(() => {})
        console.log("[POS Barcode Queue] Variant processing completed successfully");
        return
      }

      // If not found in variants, try main products table
      console.log("[POS Barcode Queue] No variant found, looking up main product by barcode:", barcode);
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single()

      if (error || !product) {
        console.log("[POS Barcode Queue] Product not found for barcode:", { barcode, error });
        toast.error(`Product not found: ${barcode}`)
        return
      }

      const typedProduct = product as Product
      console.log("[POS Barcode Queue] Found main product:", { productName: typedProduct.name, stock: typedProduct.stock });
      
      if (typedProduct.stock <= 0) {
        console.log("[POS Barcode Queue] Main product out of stock:", { productName: typedProduct.name, stock: typedProduct.stock });
        toast.warning(`Product out of stock: ${typedProduct.name}`)
        return
      }

      console.log("[POS Barcode Queue] Adding main product to cart:", typedProduct.name);
      addItem(typedProduct, 1)
      toast.success(`Added: ${typedProduct.name}`)
      
      // Play success sound
      const audio = new Audio('/data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore audio errors
      console.log("[POS Barcode Queue] Main product processing completed successfully");
    } catch (err) {
      console.error("[POS Barcode Queue] Error processing barcode:", { barcode, error: err });
      toast.error(`Error processing barcode: ${barcode}`)
    }
  }, [addItem])

  const processQueue = useCallback(async () => {
    if (queue.current.length === 0 || isProcessing.current) {
      console.log("[POS Barcode Queue] Queue processing skipped:", { 
        queueLength: queue.current.length, 
        isProcessing: isProcessing.current 
      });
      return
    }

    isProcessing.current = true
    console.log("[POS Barcode Queue] Processing queue started:", { itemsInQueue: queue.current.length });
    
    while (queue.current.length > 0) {
      const barcode = queue.current.shift()!
      console.log("[POS Barcode Queue] Processing next barcode:", { barcode, remainingInQueue: queue.current.length });
      await processBarcode(barcode)
    }
    
    isProcessing.current = false
    console.log("[POS Barcode Queue] Queue processing completed");
  }, [processBarcode])

  const enqueue = useCallback((barcode: string) => {
    console.log("[POS Barcode Queue] Enqueuing barcode:", { barcode, currentQueueLength: queue.current.length });
    queue.current.push(barcode)
    
    if (!isProcessing.current) {
      console.log("[POS Barcode Queue] Starting queue processing");
      processQueue()
    } else {
      console.log("[POS Barcode Queue] Queue already processing, barcode queued");
    }
  }, [processQueue])

  return { enqueue }
}
