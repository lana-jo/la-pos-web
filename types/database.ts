export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'cashier' | 'customer'
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled'
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debt'
export type ActionType = 'void' | 'discount' | 'refund' | 'stock_adjustment' | 'shift_open' | 'shift_close'
export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void'
export type ReferenceType = 'transaction' | 'purchase_order' | 'refund' | 'manual'
export type ShiftStatus = 'open' | 'closed'
export type DebtStatus = 'outstanding' | 'partial' | 'paid'
export type DiscountType = 'percentage' | 'fixed'
export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'partial' | 'cancelled'

export type Database = {
  public: {
    Enums: {
      user_role: UserRole
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      action_type: ActionType
      movement_type: MovementType
      reference_type: ReferenceType
      shift_status: ShiftStatus
      debt_status: DebtStatus
      discount_type: DiscountType
      purchase_status: PurchaseStatus
    }
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          pin_hash: string | null
          theme_preference: 'light' | 'dark' | 'system'
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          pin_hash?: string | null
          theme_preference?: 'light' | 'dark' | 'system'
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          pin_hash?: string | null
          theme_preference?: 'light' | 'dark' | 'system'
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          color: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      units: {
        Row: {
          id: string
          name: string
          symbol: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          is_active?: boolean
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          phone: string | null
          address: string | null
          email: string | null
          contact_person: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          address?: string | null
          email?: string | null
          contact_person?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          address?: string | null
          email?: string | null
          contact_person?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          address: string | null
          notes: string | null
          total_debt: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          total_debt?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          total_debt?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          unit_id: string | null
          supplier_id: string | null
          name: string
          barcode: string
          description: string | null
          cost_price: number
          price: number
          stock: number
          min_stock: number
          max_stock: number | null
          track_stock: boolean
          cached_stock: number
          low_stock_threshold: number
          image_url: string | null
          is_active: boolean
          is_consignment: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          unit_id?: string | null
          supplier_id?: string | null
          name: string
          barcode: string
          description?: string | null
          cost_price?: number
          price: number
          stock?: number
          min_stock?: number
          max_stock?: number | null
          track_stock?: boolean
          cached_stock?: number
          low_stock_threshold?: number
          image_url?: string | null
          is_active?: boolean
          is_consignment?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          unit_id?: string | null
          supplier_id?: string | null
          name?: string
          barcode?: string
          description?: string | null
          cost_price?: number
          price?: number
          stock?: number
          min_stock?: number
          max_stock?: number | null
          track_stock?: boolean
          cached_stock?: number
          low_stock_threshold?: number
          image_url?: string | null
          is_active?: boolean
          is_consignment?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          variant_name: string
          barcode: string | null
          price: number
          cost_price: number
          conversion_qty: number
          min_qty: number
          cached_stock: number
          inherit_cost_price: boolean
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_name: string
          barcode?: string | null
          price: number
          cost_price?: number
          conversion_qty?: number
          min_qty?: number
          cached_stock?: number
          inherit_cost_price?: boolean
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          variant_name?: string
          barcode?: string | null
          price?: number
          cost_price?: number
          conversion_qty?: number
          min_qty?: number
          cached_stock?: number
          inherit_cost_price?: boolean
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          cashier_id: string
          status: ShiftStatus
          opening_cash: number
          closing_cash: number | null
          expected_cash: number | null
          cash_difference: number | null
          notes: string | null
          opened_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          cashier_id: string
          status?: ShiftStatus
          opening_cash?: number
          closing_cash?: number | null
          expected_cash?: number | null
          cash_difference?: number | null
          notes?: string | null
          opened_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          cashier_id?: string
          status?: ShiftStatus
          opening_cash?: number
          closing_cash?: number | null
          expected_cash?: number | null
          cash_difference?: number | null
          notes?: string | null
          opened_at?: string
          closed_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          cashier_id: string | null
          shift_id: string | null
          customer_id: string | null
          discount_id: string | null
          subtotal: number
          discount_amount: number
          tax_amount: number
          total: number
          amount_paid: number
          change_amount: number
          payment_method: PaymentMethod
          payment_status: PaymentStatus
          notes: string | null
          midtrans_order_id: string | null
          qris_url: string | null
          qris_string: string | null
          qris_expires_at: string | null
          paid_at: string | null
          voided_at: string | null
          voided_by: string | null
          void_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cashier_id?: string | null
          shift_id?: string | null
          customer_id?: string | null
          discount_id?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total?: number
          amount_paid?: number
          change_amount?: number
          payment_method?: PaymentMethod
          payment_status?: PaymentStatus
          notes?: string | null
          midtrans_order_id?: string | null
          qris_url?: string | null
          qris_string?: string | null
          qris_expires_at?: string | null
          paid_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          void_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cashier_id?: string | null
          shift_id?: string | null
          customer_id?: string | null
          discount_id?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total?: number
          amount_paid?: number
          change_amount?: number
          payment_method?: PaymentMethod
          payment_status?: PaymentStatus
          notes?: string | null
          midtrans_order_id?: string | null
          qris_url?: string | null
          qris_string?: string | null
          qris_expires_at?: string | null
          paid_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          void_reason?: string | null
          created_at?: string
        }
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          product_id: string | null
          product_variant_id: string | null
          product_name: string
          variant_name: string | null
          barcode: string | null
          qty: number
          unit_price: number
          cost_price: number
          discount_amount: number
          subtotal: number
        }
        Insert: {
          id?: string
          transaction_id: string
          product_id?: string | null
          product_variant_id?: string | null
          product_name: string
          variant_name?: string | null
          barcode?: string | null
          qty: number
          unit_price: number
          cost_price?: number
          discount_amount?: number
          subtotal: number
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string | null
          product_variant_id?: string | null
          product_name?: string
          variant_name?: string | null
          barcode?: string | null
          qty?: number
          unit_price?: number
          cost_price?: number
          discount_amount?: number
          subtotal?: number
        }
      }
      inventory_movements: {
        Row: {
          id: string
          product_id: string
          product_variant_id: string | null
          movement_type: MovementType
          reference_type: ReferenceType
          reference_id: string | null
          qty_change: number
          qty_before: number
          qty_after: number
          unit_cost: number
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_variant_id?: string | null
          movement_type: MovementType
          reference_type?: ReferenceType
          reference_id?: string | null
          qty_change: number
          qty_before?: number
          qty_after?: number
          unit_cost?: number
          notes?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_variant_id?: string | null
          movement_type?: MovementType
          reference_type?: ReferenceType
          reference_id?: string | null
          qty_change?: number
          qty_before?: number
          qty_after?: number
          unit_cost?: number
          notes?: string | null
          created_by?: string
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string | null
          created_by: string | null
          received_by: string | null
          status: PurchaseStatus
          invoice_number: string | null
          total: number
          paid_amount: number
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          created_by?: string | null
          received_by?: string | null
          status?: PurchaseStatus
          invoice_number?: string | null
          total?: number
          paid_amount?: number
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          created_by?: string | null
          received_by?: string | null
          status?: PurchaseStatus
          invoice_number?: string | null
          total?: number
          paid_amount?: number
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_debts: {
        Row: {
          id: string
          customer_id: string
          transaction_id: string | null
          cashier_id: string | null
          status: DebtStatus
          amount: number
          paid_amount: number
          remaining: number
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          transaction_id?: string | null
          cashier_id?: string | null
          status?: DebtStatus
          amount: number
          paid_amount?: number
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          transaction_id?: string | null
          cashier_id?: string | null
          status?: DebtStatus
          amount?: number
          paid_amount?: number
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          category: string
          key: string
          value: string | null
          description: string | null
          data_type: string
          is_encrypted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          key: string
          value?: string | null
          description?: string | null
          data_type?: string
          is_encrypted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          key?: string
          value?: string | null
          description?: string | null
          data_type?: string
          is_encrypted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      discounts: {
        Row: {
          id: string
          name: string
          code: string | null
          discount_type: DiscountType
          value: number
          max_discount: number | null
          min_purchase: number
          max_usage: number | null
          usage_count: number
          is_active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          discount_type?: DiscountType
          value: number
          max_discount?: number | null
          min_purchase?: number
          max_usage?: number | null
          usage_count?: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          discount_type?: DiscountType
          value?: number
          max_discount?: number | null
          min_purchase?: number
          max_usage?: number | null
          usage_count?: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          product_id: string | null
          product_name: string
          barcode: string | null
          qty_ordered: number
          qty_received: number
          unit_cost: number
          subtotal: number
        }
        Insert: {
          id?: string
          purchase_order_id: string
          product_id?: string | null
          product_name: string
          barcode?: string | null
          qty_ordered: number
          qty_received?: number
          unit_cost: number
          subtotal: number
        }
        Update: {
          id?: string
          purchase_order_id?: string
          product_id?: string | null
          product_name?: string
          barcode?: string | null
          qty_ordered?: number
          qty_received?: number
          unit_cost?: number
          subtotal?: number
        }
      }
      debt_payments: {
        Row: {
          id: string
          debt_id: string
          cashier_id: string | null
          amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          debt_id: string
          cashier_id?: string | null
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          debt_id?: string
          cashier_id?: string | null
          amount?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
