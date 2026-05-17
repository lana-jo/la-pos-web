import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { CartItem, Product, ProductVariant } from '@/types'

interface CartStore {
  cart: CartItem[]
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null) => void
  updateItemQuantity: (productId: string, quantity: number, variantId?: string | null) => void
  removeItem: (productId: string, variantId?: string | null) => void
  clearCart: () => void
  getTotal: () => number
  getTotalItems: () => number
  // Add memoized selectors for better performance
  getCartSummary: () => { total: number; itemCount: number }
  // Helper functions for variant handling
  getItemKey: (productId: string, variantId?: string | null) => string
  findItem: (productId: string, variantId?: string | null) => CartItem | undefined
}

export const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => {
    // Cache calculations to avoid recomputation
    let cachedTotal = 0
    let cachedItemCount = 0
    let cartVersion = 0

    const recalculateCache = (cart: CartItem[]) => {
      cachedTotal = cart.reduce((total, item) => total + item.unit_price * item.quantity, 0)
      cachedItemCount = cart.reduce((total, item) => total + item.quantity, 0)
      cartVersion++
    }

    return {
      cart: [],

      addItem: (product, quantity = 1, variant = null) => {
        set((state) => {
          const existingItemIndex = state.cart.findIndex(
            (item) => item.product.id === product.id && 
                    (item.variant?.id || null) === (variant?.id || null)
          )
          
          let newCart: CartItem[]
          if (existingItemIndex >= 0) {
            newCart = [...state.cart]
            newCart[existingItemIndex] = {
              ...newCart[existingItemIndex],
              quantity: newCart[existingItemIndex].quantity + quantity
            }
          } else {
            const unitPrice = variant ? variant.price : product.price
            newCart = [...state.cart, { product, variant, quantity, unit_price: unitPrice }]
          }
          
          recalculateCache(newCart)
          return { cart: newCart }
        })
      },

      updateItemQuantity: (productId, quantity, variantId = null) => {
        console.log(`[Cart] Updating quantity: prod=${productId}, var=${variantId}, newQty=${quantity}`);
        set((state) => {
          const newCart = state.cart
            .map((item) =>
              item.product.id === productId && 
              (item.variant?.id || null) === variantId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0)
          
          recalculateCache(newCart)
          return { cart: newCart }
        })
      },

      removeItem: (productId, variantId = null) => {
        set((state) => {
          const newCart = state.cart.filter(
            (item) => !(item.product.id === productId && 
                      (item.variant?.id || null) === variantId)
          )
          recalculateCache(newCart)
          return { cart: newCart }
        })
      },

      clearCart: () => {
        recalculateCache([])
        set({ cart: [] })
      },

      getTotal: () => cachedTotal,

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
      }
    }
  })
)
