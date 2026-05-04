'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import bcrypt from 'bcryptjs'
import type { Cashier, CashierFormData } from '@/types/cashier'

export function useCashierMutations(onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addCashier = useCallback(async (data: CashierFormData) => {
    setIsSubmitting(true)
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Format email tidak valid')
      }

      // Validate password strength
      if (data.password.length < 6) {
        throw new Error('Password minimal 6 karakter')
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(data.pin)) {
        throw new Error('PIN harus 4 digit angka')
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'cashier'
          }
        }
      })

      if (authError) {
        if (authError.message.includes('User already registered')) {
          throw new Error('Email sudah terdaftar. Gunakan email lain.')
        }
        throw authError
      }
      if (!authData.user) throw new Error('Gagal membuat user')

      // Hash the PIN before storing
      const pinHash = await bcrypt.hash(data.pin, 10)

      const { error: insertError } = await (supabase as any)
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: data.full_name,
          role: 'cashier',
          email: data.email,
          pin_hash: pinHash,
        })

      if (insertError) throw insertError

      toast.success('Kasir berhasil ditambahkan')
      onSuccess()
      return true
    } catch (error) {
      console.error('Error adding cashier:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal menambahkan kasir: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const updateCashier = useCallback(async (cashier: Cashier, data: CashierFormData) => {
    setIsSubmitting(true)
    try {
      // Validate name
      if (!data.full_name.trim()) {
        throw new Error('Nama lengkap harus diisi')
      }

      // Validate PIN format if provided
      if (data.pin && !/^\d{4}$/.test(data.pin)) {
        throw new Error('PIN harus 4 digit angka')
      }

      const profileUpdates: { full_name: string; pin_hash?: string } = {
        full_name: data.full_name.trim(),
      }

      if (data.pin) {
        // Hash the PIN before storing
        profileUpdates.pin_hash = await bcrypt.hash(data.pin, 10)
      }

      const { error } = await (supabase as any)
        .from('profiles')
        .update(profileUpdates)
        .eq('id', cashier.id)

      if (error) throw error

      toast.success('Kasir berhasil diperbarui')
      onSuccess()
      return true
    } catch (error) {
      console.error('Error updating cashier:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal memperbarui kasir: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const deleteCashier = useCallback(async (cashier: Cashier) => {
    setIsSubmitting(true)
    try {
      // First delete from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(cashier.id)
      
      if (authError) {
        // If auth deletion fails, try to at least delete the profile
        console.warn('Failed to delete auth user, trying profile only:', authError)
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .delete()
          .eq('id', cashier.id)

        if (profileError) throw profileError
        
        toast.success('Profil kasir berhasil dihapus (akun auth masih ada)')
      } else {
        toast.success('Kasir berhasil dihapus dari sistem')
      }

      onSuccess()
      return true
    } catch (error) {
      console.error('Error deleting cashier:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      toast.error('Gagal menghapus kasir: ' + errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  return {
    isSubmitting,
    addCashier,
    updateCashier,
    deleteCashier,
  }
}
