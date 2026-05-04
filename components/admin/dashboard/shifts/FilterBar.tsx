'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, RefreshCw, Plus } from 'lucide-react'
import type { ShiftFilters } from '@/types'

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  statusFilter: 'all' | 'open' | 'closed'
  onStatusChange: (status: 'all' | 'open' | 'closed') => void
  cashierFilter: string
  onCashierChange: (cashierId: string) => void
  dateFilter: 'today' | 'week' | 'month' | 'all'
  onDateChange: (date: 'today' | 'week' | 'month' | 'all') => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onToggleSort: () => void
  onRefresh: () => void
  onAdd: () => void
  resultCount: number
  totalCount: number
  cashiers: Array<{ id: string; full_name: string | null; email: string | null }>
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  cashierFilter,
  onCashierChange,
  dateFilter,
  onDateChange,
  sortBy,
  sortOrder,
  onToggleSort,
  onRefresh,
  onAdd,
  resultCount,
  totalCount,
  cashiers,
}: FilterBarProps) {
  return (
    <div className="bg-card p-4 rounded-lg border border-border/50 space-y-4 shadow-sm">
      {/* Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kasir atau catatan..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 border-border/50 bg-background"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2 border-border/50 hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            onClick={onAdd}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Buka Shift Baru
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px] border-border/50 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="open">Aktif</SelectItem>
            <SelectItem value="closed">Selesai</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cashierFilter} onValueChange={onCashierChange}>
          <SelectTrigger className="w-[200px] border-border/50 bg-background">
            <SelectValue placeholder="Kasir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kasir</SelectItem>
            {cashiers.map((cashier) => (
              <SelectItem key={cashier.id} value={cashier.id}>
                {cashier.full_name || 'Tanpa Nama'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={onDateChange}>
          <SelectTrigger className="w-[150px] border-border/50 bg-background">
            <SelectValue placeholder="Tanggal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Waktu</SelectItem>
            <SelectItem value="today">Hari Ini</SelectItem>
            <SelectItem value="week">7 Hari Terakhir</SelectItem>
            <SelectItem value="month">30 Hari Terakhir</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onToggleSort}>
          <SelectTrigger className="w-[150px] border-border/50 bg-background">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Tanggal</SelectItem>
            <SelectItem value="cashier">Kasir</SelectItem>
            <SelectItem value="duration">Durasi</SelectItem>
            <SelectItem value="sales">Penjualan</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSort}
          className="px-3 border-border/50 hover:bg-accent"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Menampilkan {resultCount} dari {totalCount} shift
      </div>
    </div>
  )
}
