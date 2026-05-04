'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, DollarSign, User, AlertCircle } from 'lucide-react'
import type { Shift, ShiftFormData, ShiftCloseData } from '@/types'
import { calculateShiftDuration, formatCurrency, formatDuration } from '@/types'

interface OpenShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ShiftFormData) => void
  isSubmitting: boolean
  cashiers: Array<{ id: string; full_name: string | null; email: string | null; is_active: boolean }>
}

export function OpenShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  cashiers,
}: OpenShiftDialogProps) {
  const [formData, setFormData] = useState<ShiftFormData>({
    cashier_id: '',
    opening_cash: 0,
    notes: ''
  })

  const activeCashiers = cashiers.filter(c => c.is_active)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formData.cashier_id || formData.opening_cash < 0) return
    onSubmit(formData)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ cashier_id: '', opening_cash: 0, notes: '' })
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Buka Shift Baru</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pilih kasir dan tentukan modal awal untuk memulai shift baru.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cashier">Kasir *</Label>
            <Select
              value={formData.cashier_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cashier_id: value }))}
              required
            >
              <SelectTrigger className="border-border/50 bg-background">
                <SelectValue placeholder="Pilih kasir" />
              </SelectTrigger>
              <SelectContent>
                {activeCashiers.map((cashier) => (
                  <SelectItem key={cashier.id} value={cashier.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{cashier.full_name || 'Tanpa Nama'}</span>
                      <Badge variant="outline" className="text-xs border-border/50">
                        {cashier.email || 'No email'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening_cash">Modal Awal (IDR) *</Label>
            <Input
              id="opening_cash"
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={formData.opening_cash || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                opening_cash: parseInt(e.target.value) || 0 
              }))}
              required
              className="border-border/50 bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Masukkan jumlah uang tunai yang ada di kasir saat memulai shift
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Catatan khusus untuk shift ini..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="border-border/50 bg-background"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="border-border/50 hover:bg-accent"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!formData.cashier_id || formData.opening_cash < 0 || isSubmitting}
            >
              {isSubmitting ? 'Membuka Shift...' : 'Buka Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CloseShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ShiftCloseData) => void
  isSubmitting: boolean
  shift: Shift | null
}

export function CloseShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  shift,
}: CloseShiftDialogProps) {
  const [formData, setFormData] = useState<ShiftCloseData>({
    closing_cash: 0,
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shift || formData.closing_cash < 0) return
    onSubmit(formData)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ closing_cash: 0, notes: '' })
    }
    onOpenChange(open)
  }

  if (!shift) return null

  const expectedCash = (shift.expected_cash || shift.opening_cash + (shift.total_sales || 0))
  const difference = formData.closing_cash - expectedCash
  const isPositive = difference >= 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Tutup Shift</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Hitung kas akhir dan selesaikan shift untuk {shift.cashier?.full_name || 'Kasir'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Shift Summary */}
          <div className="bg-muted/30 p-4 rounded-lg border-border/50 space-y-3">
            <h4 className="font-medium text-foreground">Ringkasan Shift</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Dibuka: {new Date(shift.opened_at).toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Durasi: {formatDuration(calculateShiftDuration(shift))}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Modal Awal: {formatCurrency(shift.opening_cash)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Penjualan: {formatCurrency(shift.total_sales || 0)}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Kas yang Diharapkan:</span>
              <span className="font-bold text-lg text-foreground">{formatCurrency(expectedCash)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closing_cash">Kas Akhir (IDR) *</Label>
              <Input
                id="closing_cash"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={formData.closing_cash || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  closing_cash: parseInt(e.target.value) || 0 
                }))}
                required
                className="border-border/50 bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Hitung semua uang tunai yang ada di kasir saat ini
              </p>
            </div>

            {/* Difference Display */}
            {formData.closing_cash > 0 && (
              <div className={`p-3 rounded-lg border ${
                isPositive 
                  ? 'bg-emerald-500/10 border-emerald-200' 
                  : 'bg-red-500/10 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`} />
                  <span className={`font-medium ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                    Selisih: {formatCurrency(Math.abs(difference))} {isPositive ? 'lebih' : 'kurang'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Penutupan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tentang selisih kas atau informasi lainnya..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="border-border/50 bg-background"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="border-border/50 hover:bg-accent"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={formData.closing_cash < 0 || isSubmitting}
              >
                {isSubmitting ? 'Menutup Shift...' : 'Tutup Shift'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ViewShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: Shift | null
}

export function ViewShiftDialog({
  open,
  onOpenChange,
  shift,
}: ViewShiftDialogProps) {
  if (!shift) return null

  const duration = calculateShiftDuration(shift)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Detail Shift</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informasi lengkap shift untuk {shift.cashier?.full_name || 'Kasir'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-lg">Informasi Dasar</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Kasir</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{shift.cashier?.full_name || 'Tanpa Nama'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge 
                  variant={shift.status === 'open' ? 'default' : 'secondary'}
                  className={
                    shift.status === 'open' 
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' 
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {shift.status === 'open' ? 'Aktif' : 'Selesai'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Waktu Mulai</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(shift.opened_at).toLocaleString('id-ID')}</span>
                </div>
              </div>
              
              {shift.closed_at && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Waktu Selesai</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(shift.closed_at).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Durasi</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Jumlah Transaksi</Label>
                <span className="font-medium">{shift.transaction_count || 0} transaksi</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-lg">Informasi Keuangan</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Modal Awal</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">{formatCurrency(shift.opening_cash)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Total Penjualan</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium text-blue-600">{formatCurrency(shift.total_sales || 0)}</span>
                </div>
              </div>
              
              {shift.expected_cash && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Kas Diharapkan</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">{formatCurrency(shift.expected_cash)}</span>
                  </div>
                </div>
              )}
              
              {shift.closing_cash !== null && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Kas Akhir</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">{formatCurrency(shift.closing_cash)}</span>
                  </div>
                </div>
              )}
              
              {shift.cash_difference !== null && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Selisih Kas</Label>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                    shift.cash_difference >= 0 
                      ? 'bg-emerald-500/10 border-emerald-200' 
                      : 'bg-red-500/10 border-red-200'
                  }`}>
                    <AlertCircle className={`h-4 w-4 ${
                      shift.cash_difference >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      shift.cash_difference >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(Math.abs(shift.cash_difference))}{' '}
                      {shift.cash_difference >= 0 ? 'lebih' : 'kurang'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {shift.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Catatan</Label>
                <p className="text-sm bg-muted/30 p-3 rounded-lg border-border/50 text-foreground">{shift.notes}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
