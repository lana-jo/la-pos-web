export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'cashier' | 'customer'
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          pin_hash: string | null
          theme_preference: 'light' | 'dark' | 'system' | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      units: {
        Row: {
          id: string
          name: string
          symbol: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['units']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['units']['Row']>
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
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Row']>
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
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['suppliers']['Row']>
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
          image_url: string | null
          is_active: boolean
          is_consignment: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Row']>
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
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['product_variants']['Row']>
      }
      discounts: {
        Row: {
          id: string
          name: string
          code: string | null
          discount_type: 'percentage' | 'fixed'
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
        Insert: Omit<Database['public']['Tables']['discounts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['discounts']['Row']>
      }
      shifts: {
        Row: {
          id: string
          cashier_id: string
          status: 'open' | 'closed'
          opening_cash: number
          closing_cash: number | null
          expected_cash: number | null
          cash_difference: number | null
          notes: string | null
          opened_at: string
          closed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['shifts']['Row'], 'id' | 'opened_at'>
        Update: Partial<Database['public']['Tables']['shifts']['Row']>
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
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Row']>
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
          payment_method: 'cash' | 'qris' | 'transfer' | 'debt'
          payment_status: 'pending' | 'paid' | 'expired' | 'cancelled'
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
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
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
        Insert: Omit<Database['public']['Tables']['transaction_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['transaction_items']['Row']>
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string | null
          created_by: string | null
          received_by: string | null
          status: 'draft' | 'ordered' | 'received' | 'partial' | 'cancelled'
          invoice_number: string | null
          total: number
          paid_amount: number
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['purchase_orders']['Row']>
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
        Insert: Omit<Database['public']['Tables']['purchase_order_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Row']>
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          product_variant_id: string | null
          movement_type: 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void'
          reference_id: string | null
          reference_type: string | null
          qty_before: number
          qty_change: number
          qty_after: number
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stock_movements']['Row']>
      }
      customer_debts: {
        Row: {
          id: string
          customer_id: string
          transaction_id: string | null
          cashier_id: string | null
          status: 'outstanding' | 'partial' | 'paid'
          amount: number
          paid_amount: number
          remaining: number
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_debts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customer_debts']['Row']>
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
        Insert: Omit<Database['public']['Tables']['debt_payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['debt_payments']['Row']>
      }
      cashier_actions: {
        Row: {
          id: string
          cashier_id: string | null
          shift_id: string | null
          action_type: 'void' | 'discount' | 'refund' | 'stock_adjustment' | 'shift_open' | 'shift_close'
          target_id: string | null
          target_type: string | null
          pin_verified: boolean
          notes: string | null
          metadata: any
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cashier_actions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cashier_actions']['Row']>
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
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['settings']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
