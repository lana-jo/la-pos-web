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
    try {
      // First try to find variant by barcode
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('*, products(*)')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single() as { data: any, error: any }

      if (variant && !variantError) {
        // Found variant, check stock and add to cart
        // Check product stock (variants don't have separate stock)
        const productStock = variant.products?.stock || 0
        if (productStock <= 0) {
          toast.warning(`Product out of stock: ${variant.variant_name}`)
          return
        }

        const product = variant.products as Product
        addItem(product, 1, variant)
        toast.success(`Added: ${product.name} - ${variant.variant_name}`)
        
        // Play success sound
        const audio = new Audio('/data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
        audio.volume = 0.3
        audio.play().catch(() => {})
        return
      }

      // If not found in variants, try main products table
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single()

      if (error || !product) {
        toast.error(`Product not found: ${barcode}`)
        return
      }

      const typedProduct = product as Product
      
      if (typedProduct.stock <= 0) {
        toast.warning(`Product out of stock: ${typedProduct.name}`)
        return
      }

      addItem(typedProduct, 1)
      toast.success(`Added: ${typedProduct.name}`)
      
      // Play success sound
      const audio = new Audio('/data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore audio errors
    } catch (err) {
      toast.error(`Error processing barcode: ${barcode}`)
    }
  }, [addItem])

  const enqueue = useCallback((barcode: string) => {
    queue.current.push(barcode)
    
    if (!isProcessing.current) {
      processQueue()
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (queue.current.length === 0 || isProcessing.current) {
      return
    }

    isProcessing.current = true
    
    while (queue.current.length > 0) {
      const barcode = queue.current.shift()!
      await processBarcode(barcode)
    }
    
    isProcessing.current = false
  }, [processBarcode])

  return { enqueue }
}
