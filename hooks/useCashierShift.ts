'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Shift, ShiftFormData, ShiftCloseData } from '@/types'

export function useCashierShift() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch current shift for the logged-in cashier
  const fetchCurrentShift = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setCurrentShift(null)
        return
      }

      const { data, error } = await (supabase as any)
        .from('shifts')
        .select(`
          *,
          cashier:profiles(
            id,
            full_name,
            email
          )
        `)
        .eq('cashier_id', session.user.id)
        .eq('status', 'open')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      setCurrentShift(data)
    } catch (error) {
      console.error('Error fetching current shift:', error)
      toast.error('Gagal memuat data shift')
    } finally {
      setLoading(false)
    }
  }, [])

  // Open a new shift
  const openShift = useCallback(async (data: Omit<ShiftFormData, 'cashier_id'>) => {
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('Tidak ada sesi pengguna')
      }

      // Check if cashier already has an open shift
      const { data: existingShift } = await (supabase as any)
        .from('shifts')
        .select('id')
        .eq('cashier_id', session.user.id)
        .eq('status', 'open')
        .single()

      if (existingShift) {
        throw new Error('Anda sudah memiliki shift yang terbuka')
      }

      // Create new shift
      const { data: shift, error } = await (supabase as any)
        .from('shifts')
        .insert({
          cashier_id: session.user.id,
          status: 'open',
          opening_cash: data.opening_cash,
          notes: data.notes || null,
          opened_at: new Date().toISOString()
        })
        .select(`
          *,
          cashier:profiles(
            id,
            full_name,
            email
          )
        `)
        .single()

      if (error) throw error
      if (!shift) throw new Error('Gagal membuat shift')

      // Log the action
      await (supabase as any)
        .from('cashier_actions')
        .insert({
          cashier_id: session.user.id,
          shift_id: shift.id,
          action_type: 'shift_open',
          target_id: shift.id,
          target_type: 'shift',
          pin_verified: true,
          notes: `Shift dibuka dengan modal awal Rp ${data.opening_cash.toLocaleString('id-ID')}`,
          created_at: new Date().toISOString()
        })

      setCurrentShift(shift)
      toast.success('Shift berhasil dibuka')
      return shift
    } catch (error) {
      console.error('Error opening shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal membuka shift: ' + errorMessage)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  // Close current shift
  const closeShift = useCallback(async (data: ShiftCloseData) => {
    if (!currentShift) {
      toast.error('Tidak ada shift yang aktif')
      return null
    }

    setIsSubmitting(true)
    try {
      // Calculate expected cash (opening cash + sales)
      const { data: transactions } = await (supabase as any)
        .from('transactions')
        .select('total')
        .eq('shift_id', currentShift.id)
        .eq('payment_status', 'paid')

      const totalSales = transactions?.reduce((sum: number, t: any) => sum + (t.total || 0), 0) || 0
      const expectedCash = currentShift.opening_cash + totalSales
      const cashDifference = data.closing_cash - expectedCash

      // Update shift
      const { error } = await (supabase as any)
        .from('shifts')
        .update({
          status: 'closed',
          closing_cash: data.closing_cash,
          expected_cash: expectedCash,
          cash_difference: cashDifference,
          notes: data.notes || currentShift.notes,
          closed_at: new Date().toISOString()
        })
        .eq('id', currentShift.id)

      if (error) throw error

      // Log the action
      await (supabase as any)
        .from('cashier_actions')
        .insert({
          cashier_id: currentShift.cashier_id,
          shift_id: currentShift.id,
          action_type: 'shift_close',
          target_id: currentShift.id,
          target_type: 'shift',
          pin_verified: true,
          notes: `Shift ditutup. Selisih kas: Rp ${cashDifference.toLocaleString('id-ID')}`,
          created_at: new Date().toISOString()
        })

      const differenceText = cashDifference > 0 ? 'lebih' : cashDifference < 0 ? 'kurang' : 'sesuai'
      toast.success(`Shift berhasil ditutup. Kas ${differenceText} Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`)
      
      setCurrentShift(null)
      return true
    } catch (error) {
      console.error('Error closing shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal menutup shift: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [currentShift])

  // Check if cashier has permission to perform POS operations
  const canOperatePOS = useCallback(() => {
    return currentShift !== null
  }, [currentShift])

  // Get shift duration
  const getShiftDuration = useCallback(() => {
    if (!currentShift) return null
    
    const startTime = new Date(currentShift.opened_at)
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()
    
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    
    return { hours, minutes }
  }, [currentShift])

  // Auto-refresh shift status
  useEffect(() => {
    fetchCurrentShift()
    
    // Set up interval to refresh shift status every 30 seconds
    const interval = setInterval(() => {
      if (currentShift?.status === 'open') {
        fetchCurrentShift()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchCurrentShift, currentShift?.status])

  return {
    currentShift,
    loading,
    isSubmitting,
    fetchCurrentShift,
    openShift,
    closeShift,
    canOperatePOS,
    getShiftDuration,
  }
}
