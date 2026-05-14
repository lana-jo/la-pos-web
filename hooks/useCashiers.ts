'use client'

import { useCallback, useEffect, useMemo, useState, startTransition } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Cashier, CashierStats, CashierFilters } from '@/types/cashier'

const ITEMS_PER_PAGE = 10

export function useCashiers() {
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CashierFilters>({
    searchTerm: '',
    statusFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)

  const fetchCashiers = useCallback(async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, pin_hash, email, is_active')
        .eq('role', 'cashier')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError
      
      const cashiersData: Cashier[] = (profiles || []).map((profile: { 
        id: string
        full_name: string | null
        created_at: string
        pin_hash: string | null
        email: string | null
        is_active: boolean
      }) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email || `kasir-${profile.id.slice(0, 8)}@unknown.local`,
        is_active: profile.is_active,
        created_at: profile.created_at,
        last_sign_in_at: null,
        pin_hash: profile.pin_hash,
      }))
      
      setCashiers(cashiersData)
    } catch (error) {
      console.error('Error fetching cashiers:', error)
      toast.error('Gagal mengambil data kasir')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchCashiers()
    })
  }, [fetchCashiers])

  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.cashier' },
        () => {
          startTransition(() => {
            fetchCashiers()
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchCashiers])

  const filteredCashiers = useMemo(() => {
    let result = [...cashiers]

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      result = result.filter(c => 
        (c.full_name?.toLowerCase().includes(term) || false) ||
        c.email.toLowerCase().includes(term)
      )
    }

    if (filters.statusFilter !== 'all') {
      result = result.filter(c => 
        filters.statusFilter === 'active' ? c.is_active : !c.is_active
      )
    }

    result.sort((a, b) => {
      if (filters.sortBy === 'name') {
        const nameA = (a.full_name || '').toLowerCase()
        const nameB = (b.full_name || '').toLowerCase()
        return filters.sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
      } else {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      }
    })

    return result
  }, [cashiers, filters])

  const totalPages = Math.ceil(filteredCashiers.length / ITEMS_PER_PAGE)
  
  const paginatedCashiers = useMemo(() => {
    return filteredCashiers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  }, [filteredCashiers, currentPage])

  const stats: CashierStats = useMemo(() => ({
    total: cashiers.length,
    active: cashiers.filter(c => c.is_active).length,
    inactive: cashiers.filter(c => !c.is_active).length,
    newThisMonth: cashiers.filter(c => {
      const created = new Date(c.created_at)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length
  }), [cashiers])

  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }))
    setCurrentPage(1)
  }, [])

  const setStatusFilter = useCallback((status: 'all' | 'active' | 'inactive') => {
    setFilters(prev => ({ ...prev, statusFilter: status }))
    setCurrentPage(1)
  }, [])

  const toggleSort = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortBy: prev.sortBy === 'name' ? 'date' : 'name',
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage(p => Math.min(totalPages, p + 1))
  }, [totalPages])

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(p => Math.max(1, p - 1))
  }, [])

  return {
    cashiers,
    filteredCashiers,
    paginatedCashiers,
    loading,
    stats,
    filters,
    currentPage,
    totalPages,
    totalFiltered: filteredCashiers.length,
    setSearchTerm,
    setStatusFilter,
    toggleSort,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    refresh: fetchCashiers,
  }
}
