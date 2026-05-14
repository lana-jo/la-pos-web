export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Enums: {
      user_role: 'admin' | 'cashier' | 'customer'
      payment_status: 'pending' | 'paid' | 'expired' | 'cancelled'
      payment_method: 'cash' | 'qris' | 'transfer' | 'debt'
      action_type: 'void' | 'discount' | 'refund' | 'stock_adjustment' | 'shift_open' | 'shift_close'
      movement_type: 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void'
      reference_type: 'transaction' | 'purchase_order' | 'refund' | 'manual'
      shift_status: 'open' | 'closed'
      debt_status: 'outstanding' | 'partial' | 'paid'
      discount_type: 'percentage' | 'fixed'
      purchase_status: 'draft' | 'ordered' | 'received' | 'partial' | 'cancelled'
    }
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Database['public']['Enums']['user_role']
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
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
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
          min_qty: number
          cached_stock: number
          inherit_cost_price: boolean
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['product_variants']['Row']>
      }
      shifts: {
        Row: {
          id: string
          cashier_id: string
          status: Database['public']['Enums']['shift_status']
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
          payment_method: Database['public']['Enums']['payment_method']
          payment_status: Database['public']['Enums']['payment_status']
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
      inventory_movements: {
        Row: {
          id: string
          product_id: string
          product_variant_id: string | null
          movement_type: Database['public']['Enums']['movement_type']
          reference_type: Database['public']['Enums']['reference_type']
          reference_id: string | null
          qty_change: number
          qty_before: number
          qty_after: number
          unit_cost: number
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_movements']['Row'], 'id' | 'created_at' | 'qty_before' | 'qty_after'>
        Update: Partial<Database['public']['Tables']['inventory_movements']['Row']>
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string | null
          created_by: string | null
          received_by: string | null
          status: Database['public']['Enums']['purchase_status']
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
      customer_debts: {
        Row: {
          id: string
          customer_id: string
          transaction_id: string | null
          cashier_id: string | null
          status: Database['public']['Enums']['debt_status']
          amount: number
          paid_amount: number
          remaining: number
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_debts']['Row'], 'id' | 'created_at' | 'updated_at' | 'remaining'>
        Update: Partial<Database['public']['Tables']['customer_debts']['Row']>
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
  }
}
