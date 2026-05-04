'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Shift, ShiftFormData, ShiftCloseData } from '@/types'

export function useShiftMutations(onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openShift = useCallback(async (data: ShiftFormData) => {
    setIsSubmitting(true)
    try {
      // Validate cashier exists and is active
      const { data: cashier, error: cashierError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, is_active')
        .eq('id', data.cashier_id)
        .eq('is_active', true)
        .single()

      if (cashierError || !cashier) {
        throw new Error('Kasir tidak ditemukan atau tidak aktif')
      }

      // Check if cashier already has an open shift
      const { data: existingShift } = await (supabase as any)
        .from('shifts')
        .select('id')
        .eq('cashier_id', data.cashier_id)
        .eq('status', 'open')
        .single()

      if (existingShift) {
        throw new Error('Kasir ini sudah memiliki shift yang terbuka')
      }

      // Create new shift
      const { data: shift, error } = await (supabase as any)
        .from('shifts')
        .insert({
          cashier_id: data.cashier_id,
          status: 'open',
          opening_cash: data.opening_cash,
          notes: data.notes || null,
          opened_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      if (!shift) throw new Error('Gagal membuat shift')

      // Log the action
      await (supabase as any)
        .from('cashier_actions')
        .insert({
          cashier_id: data.cashier_id,
          shift_id: shift.id,
          action_type: 'shift_open',
          target_id: shift.id,
          target_type: 'shift',
          pin_verified: true,
          notes: `Shift dibuka dengan modal awal Rp ${data.opening_cash.toLocaleString('id-ID')}`,
          created_at: new Date().toISOString()
        })

      toast.success(`Shift berhasil dibuka untuk ${cashier.full_name}`)
      onSuccess()
      return true
    } catch (error) {
      console.error('Error opening shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal membuka shift: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const closeShift = useCallback(async (shift: Shift, data: ShiftCloseData) => {
    setIsSubmitting(true)
    try {
      // Validate shift is open
      if (shift.status !== 'open') {
        throw new Error('Shift sudah ditutup')
      }

      // Calculate expected cash (opening cash + sales)
      const { data: transactions } = await (supabase as any)
        .from('transactions')
        .select('total')
        .eq('shift_id', shift.id)
        .eq('payment_status', 'paid')

      const totalSales = transactions?.reduce((sum: number, t: any) => sum + (t.total || 0), 0) || 0
      const expectedCash = shift.opening_cash + totalSales
      const cashDifference = data.closing_cash - expectedCash

      // Update shift
      const { error } = await (supabase as any)
        .from('shifts')
        .update({
          status: 'closed',
          closing_cash: data.closing_cash,
          expected_cash: expectedCash,
          cash_difference: cashDifference,
          notes: data.notes || shift.notes,
          closed_at: new Date().toISOString()
        })
        .eq('id', shift.id)

      if (error) throw error

      // Log the action
      await (supabase as any)
        .from('cashier_actions')
        .insert({
          cashier_id: shift.cashier_id,
          shift_id: shift.id,
          action_type: 'shift_close',
          target_id: shift.id,
          target_type: 'shift',
          pin_verified: true,
          notes: `Shift ditutup. Selisih kas: Rp ${cashDifference.toLocaleString('id-ID')}`,
          created_at: new Date().toISOString()
        })

      const differenceText = cashDifference > 0 ? 'lebih' : cashDifference < 0 ? 'kurang' : 'sesuai'
      toast.success(`Shift berhasil ditutup. Kas ${differenceText} Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`)
      onSuccess()
      return true
    } catch (error) {
      console.error('Error closing shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal menutup shift: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const deleteShift = useCallback(async (shift: Shift) => {
    setIsSubmitting(true)
    try {
      // Only allow deletion of closed shifts
      if (shift.status === 'open') {
        throw new Error('Tidak dapat menghapus shift yang masih terbuka')
      }

      // Delete related cashier actions first
      await (supabase as any)
        .from('cashier_actions')
        .delete()
        .eq('shift_id', shift.id)

      // Delete the shift
      const { error } = await (supabase as any)
        .from('shifts')
        .delete()
        .eq('id', shift.id)

      if (error) throw error

      toast.success('Shift berhasil dihapus')
      onSuccess()
      return true
    } catch (error) {
      console.error('Error deleting shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal menghapus shift: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  return {
    isSubmitting,
    openShift,
    closeShift,
    deleteShift,
  }
}
