import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { CartItem, Product, ProductVariant, Discount } from '@/types'

interface CartStore {
  cart: CartItem[]
  appliedDiscount: Discount | null
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null) => void
  updateItemQuantity: (productId: string, quantity: number, variantId?: string | null) => void
  removeItem: (productId: string, variantId?: string | null) => void
  clearCart: () => void
  getTotal: () => number
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTotalItems: () => number
  // Add memoized selectors for better performance
  getCartSummary: () => { total: number; itemCount: number }
  // Helper functions for variant handling
  getItemKey: (productId: string, variantId?: string | null) => string
  findItem: (productId: string, variantId?: string | null) => CartItem | undefined
  applyDiscount: (discount: Discount | null) => void
}

export const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => {
    // Cache calculations to avoid recomputation
    let cachedSubtotal = 0
    let cachedDiscountAmount = 0
    let cachedTotal = 0
    let cachedItemCount = 0
    let cartVersion = 0
    let currentDiscount: Discount | null = null

    const calculateDiscountAmount = (subtotal: number, discount: Discount | null): number => {
      if (!discount) return 0
      if (subtotal < (discount.min_purchase || 0)) return 0

      let amt = 0
      if (discount.discount_type === 'percentage') {
        amt = Math.floor(subtotal * (discount.value / 100))
        if (discount.max_discount && amt > discount.max_discount) {
          amt = discount.max_discount
        }
      } else {
        amt = discount.value
      }
      return Math.min(amt, subtotal)
    }

    const recalculateCache = (cart: CartItem[], discount: Discount | null = currentDiscount) => {
      cachedSubtotal = cart.reduce((total, item) => total + item.unit_price * item.quantity, 0)
      cachedItemCount = cart.reduce((total, item) => total + item.quantity, 0)
      currentDiscount = discount
      cachedDiscountAmount = calculateDiscountAmount(cachedSubtotal, discount)
      cachedTotal = Math.max(0, cachedSubtotal - cachedDiscountAmount)
      cartVersion++
    }

    return {
      cart: [],
      appliedDiscount: null,

      addItem: (product, quantity = 1, variant = null) => {
        set((state) => {
          const existingItemIndex = state.cart.findIndex(
            (item) => item.product.id === product.id && 
                    (item.variant?.id || null) === (variant?.id || null)
          )
          
          let newCart: CartItem[]
          if (existingItemIndex >= 0) {
            const currentItem = state.cart[existingItemIndex]
            const maxStock = product.track_stock ? (
              variant ? Math.floor((product.cached_stock ?? product.stock ?? 0) / (variant.conversion_qty || 1))
              : (product.cached_stock ?? product.stock ?? 0)
            ) : Infinity

            const newQty = Math.min(currentItem.quantity + quantity, maxStock)
            newCart = [...state.cart]
            newCart[existingItemIndex] = {
              ...newCart[existingItemIndex],
              quantity: newQty
            }
          } else {
            const unitPrice = variant ? variant.price : product.price
            const maxStock = product.track_stock ? (
              variant ? Math.floor((product.cached_stock ?? product.stock ?? 0) / (variant.conversion_qty || 1))
              : (product.cached_stock ?? product.stock ?? 0)
            ) : Infinity

            const finalQty = Math.min(quantity, maxStock)
            newCart = [...state.cart, { product, variant, quantity: finalQty, unit_price: unitPrice }]
          }
          
          recalculateCache(newCart, state.appliedDiscount)
          return { cart: newCart }
        })
      },

      updateItemQuantity: (productId, quantity, variantId = null) => {
        console.log(`[Cart] Updating quantity: prod=${productId}, var=${variantId}, newQty=${quantity}`);
        set((state) => {
          const newCart = state.cart
            .map((item) => {
              if (item.product.id === productId && (item.variant?.id || null) === variantId) {
                const maxStock = item.product.track_stock ? (
                  item.variant ? Math.floor((item.product.cached_stock ?? item.product.stock ?? 0) / (item.variant.conversion_qty || 1))
                  : (item.product.cached_stock ?? item.product.stock ?? 0)
                ) : Infinity

                return { ...item, quantity: Math.min(Math.max(0, quantity), maxStock) }
              }
              return item
            })
            .filter((item) => item.quantity > 0)
          
          recalculateCache(newCart, state.appliedDiscount)
          return { cart: newCart }
        })
      },

      removeItem: (productId, variantId = null) => {
        set((state) => {
          const newCart = state.cart.filter(
            (item) => !(item.product.id === productId && 
                      (item.variant?.id || null) === variantId)
          )
          recalculateCache(newCart, state.appliedDiscount)
          return { cart: newCart }
        })
      },

      clearCart: () => {
        recalculateCache([], null)
        set({ cart: [], appliedDiscount: null })
      },

      getTotal: () => cachedTotal,

      getSubtotal: () => cachedSubtotal,

      getDiscountAmount: () => cachedDiscountAmount,

      getTotalItems: () => cachedItemCount,

      getCartSummary: () => ({
        total: cachedTotal,
        itemCount: cachedItemCount
      }),

      // Helper functions for variant handling
      getItemKey: (productId, variantId = null) => {
        return variantId ? `${productId}-${variantId}` : productId
      },

      findItem: (productId, variantId = null) => {
        const state = get()
        return state.cart.find(
          (item) => item.product.id === productId && 
                  (item.variant?.id || null) === variantId
        )
      },

      applyDiscount: (discount) => {
        set((state) => {
          recalculateCache(state.cart, discount)
          return { appliedDiscount: discount }
        })
      }
    }
  })
)
