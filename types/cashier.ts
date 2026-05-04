export interface Cashier {
  id: string
  full_name: string | null
  email: string
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  pin_hash: string | null
}

export interface CashierFormData {
  full_name: string
  email: string
  password: string
  pin: string
  is_active: boolean
}

export interface CashierStats {
  total: number
  active: number
  inactive: number
  newThisMonth: number
}

export type CashierModalType = 'add' | 'edit' | 'delete' | null

export interface CashierFilters {
  searchTerm: string
  statusFilter: 'all' | 'active' | 'inactive'
  sortBy: 'name' | 'date'
  sortOrder: 'asc' | 'desc'
}

export const EMPTY_CASHIER_FORM: CashierFormData = {
  full_name: '',
  email: '',
  password: '',
  pin: '',
  is_active: true,
}

export const ITEMS_PER_PAGE = 10
