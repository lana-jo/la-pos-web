'use client'

import { useState, useCallback, useMemo, useEffect, startTransition } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Shift, ShiftFilters, ShiftStats } from '@/types'

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ShiftFilters>({
    searchTerm: '',
    statusFilter: 'all',
    cashierFilter: 'all',
    dateFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [now, setNow] = useState(0)

  useEffect(() => {
    startTransition(() => {
      setNow(Date.now())
    })
  }, [shifts])

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching shifts...')
      
      let query = supabase
        .from('shifts')
        .select(`
          *,
          cashier:profiles(
            id,
            full_name,
            email
          )
        `)

      // Apply status filter
      if (filters.statusFilter !== 'all') {
        query = query.eq('status', filters.statusFilter)
      }

      // Apply cashier filter
      if (filters.cashierFilter && filters.cashierFilter !== 'all') {
        query = query.eq('cashier_id', filters.cashierFilter)
      }

      // Apply date filter
      const now = new Date()
      if (filters.dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        query = query.gte('opened_at', today.toISOString())
      } else if (filters.dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        query = query.gte('opened_at', weekAgo.toISOString())
      } else if (filters.dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        query = query.gte('opened_at', monthAgo.toISOString())
      }

      // Apply search filter
      if (filters.searchTerm) {
        query = query.or(`cashier.full_name.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`)
      }

      // Apply sorting
      const sortColumn = filters.sortBy === 'date' ? 'opened_at' : 
                        filters.sortBy === 'cashier' ? 'cashier.full_name' :
                        filters.sortBy === 'duration' ? 'opened_at' : 'opened_at'
      
      query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' })

      const { data, error } = await query

      console.log('Shifts query result:', { data, error })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Raw shifts data:', data)

      // Enrich shifts with transaction counts and sales
      const enrichedShifts = await Promise.all(
        (data || []).map(async (shift: any) => {
          try {
            const { data: transactions, error: txError } = await (supabase as any)
              .from('transactions')
              .select('total')
              .eq('shift_id', shift.id)

            if (txError) {
              console.warn('Error fetching transactions for shift', shift.id, txError)
            }

            const transactionCount = transactions?.length || 0
            const totalSales = transactions?.reduce((sum: number, t: any) => sum + (t.total || 0), 0) || 0

            return {
              ...shift,
              transaction_count: transactionCount,
              total_sales: totalSales
            }
          } catch (txErr) {
            console.warn('Transaction fetch error for shift', shift.id, txErr)
            return {
              ...shift,
              transaction_count: 0,
              total_sales: 0
            }
          }
        })
      )

      console.log('Enriched shifts:', enrichedShifts)
      setShifts(enrichedShifts)
    } catch (err) {
      console.error('Error fetching shifts:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const stats = useMemo<ShiftStats>(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const todayShifts = shifts.filter(shift => 
      new Date(shift.opened_at) >= today
    )
    
    const openShifts = shifts.filter(shift => shift.status === 'open')
    const closedShifts = shifts.filter(shift => shift.status === 'closed')
    
    const totalSalesToday = todayShifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0)
    const cashDifferenceToday = todayShifts.reduce((sum, shift) => 
      sum + ((shift.cash_difference || 0)), 0
    )
    
    const durations = closedShifts.map(shift => {
      const start = new Date(shift.opened_at)
      const end = shift.closed_at ? new Date(shift.closed_at) : new Date()
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60) // hours
    })
    
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    return {
      total: shifts.length,
      open: openShifts.length,
      closed: closedShifts.length,
      todayOpened: todayShifts.length,
      averageDuration,
      totalSalesToday,
      cashDifferenceToday
    }
  }, [shifts])

  const filteredAndPaginatedShifts = useMemo(() => {
    let filtered = [...shifts]

    // Apply client-side search if needed
    if (filters.searchTerm) {
      filtered = filtered.filter(shift =>
        shift.cashier?.full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        shift.notes?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      )
    }

    // Sort client-side for complex sorting
    if (filters.sortBy === 'duration') {
      filtered.sort((a, b) => {
        const durationA = (a.closed_at ? new Date(a.closed_at).getTime() : now) - new Date(a.opened_at).getTime()
        const durationB = (b.closed_at ? new Date(b.closed_at).getTime() : now) - new Date(b.opened_at).getTime()
        return filters.sortOrder === 'asc' ? durationA - durationB : durationB - durationA
      })
    } else if (filters.sortBy === 'sales') {
      filtered.sort((a, b) => {
        const salesA = a.total_sales || 0
        const salesB = b.total_sales || 0
        return filters.sortOrder === 'asc' ? salesA - salesB : salesB - salesA
      })
    }

    const startIndex = (currentPage - 1) * 10
    const endIndex = startIndex + 10
    
    return filtered.slice(startIndex, endIndex)
  }, [shifts, filters, currentPage, now])

  const totalPages = Math.ceil(shifts.length / 10)
  const totalFiltered = filteredAndPaginatedShifts.length

  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }))
    setCurrentPage(1)
  }, [])

  const setStatusFilter = useCallback((status: 'all' | 'open' | 'closed') => {
    setFilters(prev => ({ ...prev, statusFilter: status }))
    setCurrentPage(1)
  }, [])

  const setCashierFilter = useCallback((cashierId: string) => {
    setFilters(prev => ({ ...prev, cashierFilter: cashierId }))
    setCurrentPage(1)
  }, [])

  const setDateFilter = useCallback((date: 'today' | 'week' | 'month' | 'all') => {
    setFilters(prev => ({ ...prev, dateFilter: date }))
    setCurrentPage(1)
  }, [])

  const setSortBy = useCallback((sortBy: string) => {
    setFilters(prev => ({ 
      ...prev, 
      sortBy: sortBy as ShiftFilters['sortBy'],
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1)
  }, [])

  const toggleSort = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1)
  }, [])

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const refresh = useCallback(() => {
    fetchShifts()
  }, [fetchShifts])

  // Fetch shifts on component mount
  useEffect(() => {
    startTransition(() => {
      fetchShifts()
    })
  }, [fetchShifts])

  return {
    shifts,
    paginatedShifts: filteredAndPaginatedShifts,
    loading,
    error,
    stats,
    filters,
    currentPage,
    totalPages,
    totalFiltered,
    setSearchTerm,
    setStatusFilter,
    setCashierFilter,
    setDateFilter,
    setSortBy,
    toggleSort,
    goToNextPage,
    goToPreviousPage,
    refresh,
    fetchShifts
  }
}
