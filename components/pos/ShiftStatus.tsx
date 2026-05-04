'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, User, Play, Square } from 'lucide-react'
import { useCashierShift } from '@/hooks/useCashierShift'
import { formatCurrency, formatDuration } from '@/types'

export function ShiftStatus() {
  const { currentShift, loading, canOperatePOS, getShiftDuration } = useCashierShift()

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentShift) {
    return (
      <Card className="mb-4 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Square className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-orange-800">Shift Tidak Aktif</h3>
                <p className="text-sm text-orange-600">Buka shift untuk memulai transaksi</p>
              </div>
            </div>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Play className="h-4 w-4 mr-2" />
              Buka Shift
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const duration = getShiftDuration()
  const durationText = duration ? formatDuration(duration.hours + duration.minutes / 60) : '0 menit'

  return (
    <Card className="mb-4 border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-green-800">Shift Aktif</h3>
                <Badge className="bg-green-600 text-white">Aktif</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-green-600">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{currentShift.cashier?.full_name || 'Kasir'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{durationText}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Modal: {formatCurrency(currentShift.opening_cash)}</span>
                </div>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-100">
            <Square className="h-4 w-4 mr-2" />
            Tutup Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
