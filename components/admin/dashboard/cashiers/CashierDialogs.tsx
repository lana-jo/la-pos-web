'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Plus, Edit, Shield } from 'lucide-react'
import { CashierFormFields } from './CashierFormFields'
import type { Cashier, CashierFormData } from '@/types/cashier'
import { EMPTY_CASHIER_FORM } from '@/types/cashier'

interface AddCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CashierFormData) => void
  isSubmitting: boolean
}

export function AddCashierDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddCashierDialogProps) {
  const [formData, setFormData] = useState<CashierFormData>(EMPTY_CASHIER_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const isFormValid = !!(
    formData.full_name.trim() &&
    formData.email.trim() &&
    formData.password &&
    formData.pin.length === 4
  )

  const handleClose = () => {
    setFormData(EMPTY_CASHIER_FORM)
    setShowPassword(false)
    setShowPin(false)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (isFormValid) {
      onSubmit(formData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Kasir Baru
          </DialogTitle>
          <DialogDescription>
            Buat akun kasir baru dengan PIN untuk akses ke terminal POS.
          </DialogDescription>
        </DialogHeader>
        <CashierFormFields
          formData={formData}
          onChange={setFormData}
          isSubmitting={isSubmitting}
          idPrefix="add-"
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          showPin={showPin}
          onTogglePin={() => setShowPin(!showPin)}
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EditCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CashierFormData) => void
  cashier: Cashier | null
  isSubmitting: boolean
}

export function EditCashierDialog({
  open,
  onOpenChange,
  onSubmit,
  cashier,
  isSubmitting,
}: EditCashierDialogProps) {
  const [formData, setFormData] = useState<CashierFormData>(EMPTY_CASHIER_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const isFormValid = !!(formData.full_name.trim())

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && cashier) {
      setFormData({
        full_name: cashier.full_name || '',
        email: cashier.email,
        password: '',
        pin: '',
        is_active: cashier.is_active,
      })
    }
    if (!isOpen) {
      setFormData(EMPTY_CASHIER_FORM)
      setShowPassword(false)
      setShowPin(false)
    }
    onOpenChange(isOpen)
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const handleSubmit = () => {
    if (isFormValid) {
      onSubmit(formData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Kasir
          </DialogTitle>
          <DialogDescription>
            Perbarui informasi kasir. Biarkan password/PIN kosong jika tidak ingin mengubah.
          </DialogDescription>
        </DialogHeader>
        <CashierFormFields
          formData={formData}
          onChange={setFormData}
          isSubmitting={isSubmitting}
          idPrefix="edit-"
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          showPin={showPin}
          onTogglePin={() => setShowPin(!showPin)}
          isEditing
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? 'Menyimpan...' : 'Perbarui'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  cashier: Cashier | null
  isSubmitting: boolean
}

export function DeleteCashierDialog({
  open,
  onOpenChange,
  onConfirm,
  cashier,
  isSubmitting,
}: DeleteCashierDialogProps) {
  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Hapus Kasir
          </DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Kasir akan dihapus secara permanen.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">{cashier?.full_name || 'Kasir'}</p>
                <p className="text-sm text-amber-700">{cashier?.email}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Perhatian:</strong> Menghapus kasir akan menghapus semua data terkait dari sistem.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Menghapus...' : 'Hapus Permanen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
