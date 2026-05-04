'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { User, Clock, DollarSign, Calendar, Edit, Trash2, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { Shift } from '@/types'
import { calculateShiftDuration, formatCurrency, formatDuration } from '@/types'

interface ShiftTableProps {
  shifts: Shift[]
  currentPage: number
  totalPages: number
  onView: (shift: Shift) => void
  onEdit: (shift: Shift) => void
  onDelete: (shift: Shift) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

export function ShiftTable({
  shifts,
  currentPage,
  totalPages,
  onView,
  onEdit,
  onDelete,
  onPreviousPage,
  onNextPage,
}: ShiftTableProps) {
  if (shifts.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 text-foreground">Tidak ada shift</h3>
          <p className="text-muted-foreground">Belum ada data shift yang ditampilkan</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border/50 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Kasir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuka</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Modal Awal</TableHead>
                <TableHead>Penjualan</TableHead>
                <TableHead>Kas Akhir</TableHead>
                <TableHead>Selisih</TableHead>
                <TableHead className="text-right w-[180px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => {
                const duration = calculateShiftDuration(shift)
                const isPositiveDifference = (shift.cash_difference || 0) >= 0
                
                return (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {shift.cashier?.full_name || 'Tanpa Nama'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shift.cashier?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={shift.status === 'open' ? 'default' : 'secondary'}
                        className={
                          shift.status === 'open' 
                            ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                      >
                        {shift.status === 'open' ? 'Aktif' : 'Selesai'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          {new Date(shift.opened_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{formatDuration(duration)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">
                          {formatCurrency(shift.opening_cash)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(shift.total_sales || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {shift.closing_cash !== null ? (
                        <span className="text-sm font-medium">
                          {formatCurrency(shift.closing_cash)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {shift.cash_difference !== null ? (
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-medium ${
                            isPositiveDifference ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(shift.cash_difference))}
                          </span>
                          {!isPositiveDifference && (
                            <span className="text-xs text-red-500">kurang</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onView(shift)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Detail
                        </Button>
                        {shift.status === 'open' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onEdit(shift)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Tutup
                          </Button>
                        )}
                        {shift.status === 'closed' && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onDelete(shift)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Hapus
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={currentPage === 1}
              className="border-border/50 hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className="border-border/50 hover:bg-accent"
            >
              Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
