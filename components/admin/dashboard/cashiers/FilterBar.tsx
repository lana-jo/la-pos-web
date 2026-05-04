'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, RefreshCw, Plus, ArrowUpDown } from 'lucide-react'

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: 'all' | 'active' | 'inactive'
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void
  sortBy: 'name' | 'date'
  sortOrder: 'asc' | 'desc'
  onToggleSort: () => void
  onRefresh: () => void
  onAdd: () => void
  resultCount: number
  totalCount: number
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  sortOrder,
  onToggleSort,
  onRefresh,
  onAdd,
  resultCount,
  totalCount,
}: FilterBarProps) {
  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email kasir..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select 
                value={statusFilter} 
                onValueChange={(v: 'all' | 'active' | 'inactive') => onStatusChange(v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={onToggleSort}
                title={`Urutkan: ${sortBy === 'name' ? 'Nama' : 'Tanggal'} ${sortOrder === 'asc' ? '↑' : '↓'}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kasir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Menampilkan {resultCount} kasir
          {resultCount !== totalCount && ` (dari total ${totalCount})`}
        </p>
        <p className="text-xs text-muted-foreground">
          Urutan: {sortBy === 'name' ? 'Nama' : 'Tanggal'} {sortOrder === 'asc' ? '↑' : '↓'}
        </p>
      </div>
    </>
  )
}
