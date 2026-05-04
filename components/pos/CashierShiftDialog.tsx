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
import { DollarSign, Clock, AlertCircle } from 'lucide-react'
import { useCashierShift } from '@/hooks/useCashierShift'
import { formatCurrency } from '@/types'

interface CashierShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'open' | 'close'
}

export function CashierShiftDialog({ open, onOpenChange, type }: CashierShiftDialogProps) {
  const { currentShift, openShift, closeShift, isSubmitting, getShiftDuration } = useCashierShift()
  
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (type === 'open') {
      const cash = parseInt(openingCash) || 0
      if (cash < 0) return
      
      const success = await openShift({
        opening_cash: cash,
        notes: notes.trim() || undefined
      })
      
      if (success) {
        setOpeningCash('')
        setNotes('')
        onOpenChange(false)
      }
    } else {
      const cash = parseInt(closingCash) || 0
      if (cash < 0) return
      
      const success = await closeShift({
        closing_cash: cash,
        notes: notes.trim() || undefined
      })
      
      if (success) {
        setClosingCash('')
        setNotes('')
        onOpenChange(false)
      }
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpeningCash('')
      setClosingCash('')
      setNotes('')
    }
    onOpenChange(isOpen)
  }

  if (type === 'open') {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Buka Shift Baru</DialogTitle>
            <DialogDescription>
              Mulai shift baru dengan menentukan modal awal kasir.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opening_cash">Modal Awal (IDR) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="opening_cash"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Masukkan jumlah uang tunai yang ada di kasir saat memulai shift
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Catatan khusus untuk shift ini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!openingCash || parseInt(openingCash) < 0 || isSubmitting}
              >
                {isSubmitting ? 'Membuka Shift...' : 'Buka Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // Close shift dialog
  if (!currentShift) return null

  const duration = getShiftDuration()
  const durationText = duration ? `${duration.hours}j ${duration.minutes}m` : '0 menit'
  const expectedCash = currentShift.opening_cash + (currentShift.total_sales || 0)
  const difference = parseInt(closingCash) - expectedCash
  const isPositive = difference >= 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tutup Shift</DialogTitle>
          <DialogDescription>
            Hitung kas akhir dan selesaikan shift Anda.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Shift Summary */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Ringkasan Shift</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Durasi: {durationText}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Modal Awal: {formatCurrency(currentShift.opening_cash)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Penjualan: {formatCurrency(currentShift.total_sales || 0)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Kas Diharapkan: {formatCurrency(expectedCash)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closing_cash">Kas Akhir (IDR) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="closing_cash"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Hitung semua uang tunai yang ada di kasir saat ini
              </p>
            </div>

            {/* Difference Display */}
            {closingCash && parseInt(closingCash) > 0 && (
              <div className={`p-3 rounded-lg border ${
                isPositive 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!closingCash || parseInt(closingCash) < 0 || isSubmitting}
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
