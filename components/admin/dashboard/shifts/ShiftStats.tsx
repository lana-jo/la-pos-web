'use client'

import { Card } from '@/components/ui/card'
import type { ShiftStats } from '@/types'
import { Users, Clock, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface ShiftStatsProps {
  stats: ShiftStats
}

export function ShiftStats({ stats }: ShiftStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} menit`
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} jam`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round((hours % 24) * 10) / 10
      return `${days} hari ${remainingHours > 0 ? remainingHours + ' jam' : ''}`
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Shift</p>
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sedang Aktif</p>
            <p className="text-xl font-bold text-emerald-600">{stats.open}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Selesai</p>
            <p className="text-xl font-bold text-foreground">{stats.closed}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hari Ini</p>
            <p className="text-xl font-bold text-foreground">{stats.todayOpened}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Penjualan Hari Ini</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalSalesToday)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            stats.cashDifferenceToday >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}>
            <AlertCircle className={`h-5 w-5 ${
              stats.cashDifferenceToday >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Selisih Kas</p>
            <p className={`text-lg font-bold ${
              stats.cashDifferenceToday >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(stats.cashDifferenceToday))}
              {stats.cashDifferenceToday !== 0 && (
                <span className="text-xs ml-1">
                  {stats.cashDifferenceToday > 0 ? 'lebih' : 'kurang'}
                </span>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
