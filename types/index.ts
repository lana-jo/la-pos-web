// types/index.ts

export type { Database } from './database'
export type { Cashier, CashierFormData, CashierStats, CashierFilters, CashierModalType } from './cashier'
export { EMPTY_CASHIER_FORM, ITEMS_PER_PAGE } from './cashier'
export type { ShiftFormData, ShiftCloseData, ShiftStats, ShiftModalType, ShiftFilters } from './shift'
export { EMPTY_SHIFT_FORM, EMPTY_CLOSE_FORM, calculateShiftDuration, formatCurrency, formatDuration } from './shift'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role          = 'admin' | 'cashier' | 'customer'
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debt'
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled'
export type ActionType    = 'void' | 'discount' | 'refund' | 'stock_adjustment' | 'shift_open' | 'shift_close'
export type MovementType  = 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void'
export type ShiftStatus   = 'open' | 'closed'
export type DebtStatus    = 'outstanding' | 'partial' | 'paid'
export type DiscountType  = 'percentage' | 'fixed'
export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'partial' | 'cancelled'

// ─── Domain models ────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system'

export interface Profile {
    id:               string
    role:             Role
    full_name:        string | null
    phone:            string | null
    avatar_url:       string | null
    pin_hash:         string | null
    theme_preference: ThemePreference | null
    email:            string | null
    is_active:        boolean
    created_at:       string
    updated_at:       string
}

export interface VariantPayload {
  product_id: string
  variant_name: string
  barcode: string | null
  price: number
  cost_price: number
  conversion_qty: number
  min_qty: number
  is_active: boolean
  is_default: boolean
}

export interface Unit {
    id:         string
    name:       string
    symbol:     string
    is_active:  boolean
    created_at: string
}

export interface Category {
    id:            string
    name:          string
    slug:          string
    icon:          string | null
    color:         string | null
    is_active:     boolean
    sort_order:    number
    created_at:    string
    product_count?: number        // computed/joined, not a DB column
}

export interface Supplier {
    id:             string
    name:           string
    phone:          string | null
    address:        string | null
    email:          string | null
    contact_person: string | null
    notes:          string | null
    is_active:      boolean
    created_at:     string
    updated_at:     string
}

export interface Product {
    id:              string
    category_id:     string | null
    unit_id:         string | null
    supplier_id:     string | null
    name:            string
    barcode:         string
    description:     string | null
    cost_price:      number
    price:           number
    stock:           number
    cached_stock:     number
    track_stock:     boolean
    low_stock_threshold: number
    min_stock:       number
    max_stock:       number | null
    image_url:       string | null
    is_active:       boolean
    is_consignment:  boolean
    created_at:      string
    updated_at:      string
    categories?:     Category | null  // joined (matches Supabase query)
    unit?:           Unit | null
    supplier?:       Supplier | null
    variants?:       ProductVariant[]   // joined variants
}

export interface ProductVariant {
    id:             string
    product_id:     string
    variant_name:   string          // e.g., "Eceran", "Grosir", "Box"
    barcode:        string | null   // optional different barcode per variant
    price:          number          // variant-specific price
    cost_price:     number
    conversion_qty: number          // faktor pengali stok
    min_qty:        number          // minimum kuantitas beli agar varian ini berlaku
    is_active:      boolean
    is_default:     boolean         // default variant for this product
    created_at:     string
    updated_at:     string
    product?:       Product         // joined
}

export interface Discount {
    id:            string
    name:          string
    code:          string | null
    discount_type: DiscountType
    value:         number
    max_discount:  number | null
    min_purchase:  number
    max_usage:     number | null
    usage_count:   number
    is_active:     boolean
    valid_from:    string
    valid_until:   string | null
    created_at:    string
}

export interface Shift {
    id:              string
    cashier_id:      string
    status:          ShiftStatus
    opening_cash:    number
    closing_cash:    number | null
    expected_cash:   number | null
    cash_difference: number | null
    notes:           string | null
    opened_at:       string
    closed_at:       string | null
    cashier?:        Profile         // joined
    transaction_count?: number        // computed
    total_sales?: number              // computed
}

export interface Customer {
    id:          string
    name:        string
    phone:       string | null
    address:     string | null
    notes:       string | null
    total_debt:  number
    is_active:   boolean
    created_at:  string
    updated_at:  string
}

export interface Transaction {
    id:                string
    cashier_id:        string | null
    shift_id:          string | null
    customer_id:       string | null
    discount_id:       string | null
    subtotal:          number
    discount_amount:   number
    tax_amount:        number
    total:             number
    amount_paid:       number
    change_amount:     number
    payment_method:    PaymentMethod
    payment_status:    PaymentStatus
    notes:             string | null
    midtrans_order_id: string | null
    qris_url:          string | null
    qris_string:       string | null
    qris_expires_at:   string | null
    paid_at:           string | null
    voided_at:         string | null
    voided_by:         string | null
    void_reason:       string | null
    created_at:        string
    cashier?:          Profile              // joined
    shift?:            Shift                // joined
    customer?:         Customer             // joined
    discount?:         Discount             // joined
    items?:            TransactionItem[]    // joined
}

export interface TransactionItem {
    id:                 string
    transaction_id:     string
    product_id:         string | null
    product_variant_id: string | null
    product_name:       string
    variant_name:       string | null
    barcode:            string | null
    qty:                number
    unit_price:         number
    cost_price:         number
    discount_amount:    number
    subtotal:           number
    product?:           Product         // joined
    variant?:           ProductVariant | null  // joined variant
}

export interface PurchaseOrder {
    id:             string
    supplier_id:    string | null
    created_by:     string | null
    received_by:    string | null
    status:         PurchaseStatus
    invoice_number: string | null
    total:          number
    paid_amount:    number
    notes:          string | null
    ordered_at:     string | null
    received_at:    string | null
    created_at:     string
    updated_at:     string
    supplier?:      Supplier              // joined
    creator?:       Profile               // joined
    receiver?:      Profile               // joined
    items?:         PurchaseOrderItem[]   // joined
}

export interface PurchaseOrderItem {
    id:                string
    purchase_order_id: string
    product_id:        string | null
    product_name:      string
    barcode:           string | null
    qty_ordered:       number
    qty_received:      number
    unit_cost:         number
    subtotal:          number
    product?:          Product            // joined
}

export interface StockMovement {
    id:                 string
    product_id:         string
    product_variant_id: string | null
    movement_type:      MovementType
    reference_id:       string | null
    reference_type:     string | null
    qty_before:         number
    qty_change:         number
    qty_after:          number
    notes:              string | null
    created_by:         string | null
    created_at:         string
    product?:           Product            // joined
    variant?:           ProductVariant | null // joined
    creator?:           Profile            // joined
}

export interface CustomerDebt {
    id:             string
    customer_id:    string
    transaction_id: string | null
    cashier_id:     string | null
    status:         DebtStatus
    amount:         number
    paid_amount:    number
    remaining:      number
    due_date:       string | null
    notes:          string | null
    created_at:     string
    updated_at:     string
    customer?:      Customer           // joined
    transaction?:   Transaction        // joined
    cashier?:       Profile            // joined
    payments?:      DebtPayment[]      // joined
}

export interface DebtPayment {
    id:        string
    debt_id:   string
    cashier_id: string | null
    amount:    number
    notes:     string | null
    created_at: string
    debt?:     CustomerDebt  // joined
    cashier?:  Profile       // joined
}

export interface CashierAction {
    id:           string
    cashier_id:   string | null
    shift_id:     string | null
    action_type:  ActionType
    target_id:    string | null
    target_type:  string | null
    pin_verified: boolean
    notes:        string | null
    metadata:     any
    created_at:   string
    cashier?:     Profile  // joined
    shift?:       Shift    // joined
}

export interface Setting {
    id:          string
    category:    string
    key:         string
    value:       string | null
    description: string | null
    data_type:   string
    is_encrypted: boolean
    created_at:  string
    updated_at:  string
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
    product:        Product
    variant?:       ProductVariant | null  // selected variant (optional)
    quantity:       number
    unit_price:     number                // price used (variant or product base)
}

// ─── Midtrans ─────────────────────────────────────────────────────────────────

export interface QRISChargeResponse {
    status_code:        string
    status_message:     string
    transaction_id:     string
    order_id:           string
    payment_type:       string
    transaction_time:   string
    transaction_status: string
    fraud_status:       string
    gross_amount:       string
    qris_url:           string
    qris_string:        string
    expiry_time:        string    // maps to qris_expires_at in DB
}

export interface MidtransWebhookPayload {
    order_id:           string
    status_code:        string
    transaction_status: string
    gross_amount:       string
    payment_type:       string
    transaction_time:   string
    fraud_status:       string
    signature_key:      string
}