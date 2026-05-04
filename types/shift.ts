import type { Shift } from './index'

export interface ShiftFormData {
  cashier_id: string
  opening_cash: number
  notes?: string
}

export interface ShiftCloseData {
  closing_cash: number
  notes?: string
}

export interface ShiftStats {
  total: number
  open: number
  closed: number
  todayOpened: number
  averageDuration: number
  totalSalesToday: number
  cashDifferenceToday: number
}

export type ShiftModalType = 'open' | 'close' | 'view' | null

export interface ShiftFilters {
  searchTerm: string
  statusFilter: 'all' | 'open' | 'closed'
  cashierFilter: string
  dateFilter: 'today' | 'week' | 'month' | 'all'
  sortBy: 'date' | 'cashier' | 'duration' | 'sales'
  sortOrder: 'asc' | 'desc'
}

export const EMPTY_SHIFT_FORM: ShiftFormData = {
  cashier_id: '',
  opening_cash: 0,
  notes: ''
}

export const EMPTY_CLOSE_FORM: ShiftCloseData = {
  closing_cash: 0,
  notes: ''
}

export const ITEMS_PER_PAGE = 10

export function calculateShiftDuration(shift: Shift): number {
  if (!shift.opened_at) return 0
  
  const endTime = shift.closed_at ? new Date(shift.closed_at) : new Date()
  const startTime = new Date(shift.opened_at)
  
  return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) // hours
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} menit`
  } else if (hours < 24) {
    return `${Math.round(hours * 10) / 10} jam`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round((hours % 24) * 10) / 10
    return `${days} hari ${remainingHours > 0 ? remainingHours + ' jam' : ''}`
  }
}
