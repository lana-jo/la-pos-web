'use client'

import { useCallback, useEffect, useState } from 'react'
import { 
  format, 
  startOfDay, 
  endOfDay, 
  subDays
} from 'date-fns'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  ArrowLeft, 
  Eye, 
  Download, 
  RefreshCw,
  Calendar as CalendarIcon,
  BarChart2,
  List
} from 'lucide-react'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { PaymentStatus, Transaction } from '@/types'
import { formatCurrency } from '@/lib/pos/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportStats {
  totalRevenue: number
  totalTransactions: number
  paidTransactions: number
  pendingTransactions: number
  averageTransaction: number
}

const DEFAULT_STATS: ReportStats = {
  totalRevenue: 0,
  totalTransactions: 0,
  paidTransactions: 0,
  pendingTransactions: 0,
  averageTransaction: 0,
}

interface DailyReport {
  id: string
  report_date: string
  total_sales: number
  total_transactions: number
  paid_transactions: number
  pending_transactions: number
  cancelled_transactions: number
  average_transaction_value: number
  total_items_sold: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant = (status: PaymentStatus): 'default' | 'secondary' | 'destructive' => {
  if (status === 'paid')    return 'default'
  if (status === 'pending') return 'secondary'
  return 'destructive'
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [stats, setStats] = useState<ReportStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29), // Default to 30 days
    to: new Date(),
  })
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const calculateStats = useCallback((txs: Transaction[]) => {
    const paid = txs.filter(t => t.payment_status === 'paid')
    const totalRevenue = paid.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = txs.length
    const paidTransactions = paid.length
    const pendingTransactions = txs.filter(t => t.payment_status === 'pending').length
    const averageTransaction = paidTransactions > 0 ? totalRevenue / paidTransactions : 0

    setStats({
      totalRevenue,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      averageTransaction,
    })
  }, [])

  const fetchData = useCallback(async () => {
    const from = startOfDay(dateRange?.from || subDays(new Date(), 30))
    const to = endOfDay(dateRange?.to || (dateRange?.from ? dateRange.from : new Date()))

    setLoading(true)
    try {
      // 1. Fetch Daily Summaries
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .gte('report_date', format(from, 'yyyy-MM-dd'))
        .lte('report_date', format(to, 'yyyy-MM-dd'))
        .order('report_date', { ascending: false })

      if (reportsError) throw reportsError
      setDailyReports(reportsData || [])

      // 2. Fetch Detailed Transactions
      const { data: txsData, error: txsError } = await supabase
        .from('transactions')
        .select(`
          *,
          cashier:profiles!transactions_cashier_id_fkey(full_name),
          customer:customers(name),
          items:transaction_items(
            *,
            product:products(name)
          )
        `)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })

      if (txsError) throw txsError

      const txs = (txsData || []) as Transaction[]
      setTransactions(txs)
      calculateStats(txs)
    } catch (error: unknown) {
      console.error('Error fetching data:', error)
      toast.error('Gagal mengambil data laporan')
    } finally {
      setLoading(false)
    }
  }, [dateRange, calculateStats])

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
    }
  }, [authLoading, user, fetchData])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/daily-reports/generate', {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Laporan hari ini berhasil diperbarui')
        fetchData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error('Gagal membuat laporan: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReport = async () => {
    if (transactions.length === 0) return
    
    const from = dateRange?.from?.toISOString().split('T')[0]
    const to = dateRange?.to?.toISOString().split('T')[0]
    
    window.open(`/api/daily-reports/export?start_date=${from}&end_date=${to}&format=csv`, '_blank')
    toast.success('Mengunduh laporan...')
  }

  const handleViewDetails = (tx: Transaction) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) return null

  return (
    <div className="page-background p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground uppercase tracking-tight">
              Laporan Penjualan
            </h1>
            <p className="text-muted-foreground">
              Analisis performa bisnis dan rekapitulasi harian.
            </p>
            {dateRange?.from && (
              <p className="text-sm font-medium text-primary mt-1">
                Periode: {format(dateRange.from, 'd MMM yyyy')} 
                {dateRange.to ? ` - ${format(dateRange.to, 'd MMM yyyy')}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              onClick={generateReport} 
              disabled={isGenerating}
              className="bg-card"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Update Hari Ini
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadReport} 
              disabled={loading || transactions.length === 0}
              className="bg-card"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="pos-card border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Omzet</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Dari transaksi lunas</p>
            </CardContent>
          </Card>

          <Card className="pos-card border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume Penjualan</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.paidTransactions} Lunas, {stats.pendingTransactions} Pending
              </p>
            </CardContent>
          </Card>

          <Card className="pos-card border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Keranjang</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per transaksi lunas</p>
            </CardContent>
          </Card>

          <Card className="pos-card border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Konversi Pembayaran</CardTitle>
              <BarChart2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalTransactions > 0 
                  ? Math.round((stats.paidTransactions / stats.totalTransactions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Rasio transaksi lunas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground bg-card px-4 py-2 rounded-md border shadow-sm">
              <span className="font-medium">Rentang Data:</span>{" "}
              {dateRange?.from ? format(dateRange.from, 'd MMMM yyyy', { locale: id }) : '-'} 
              <span className="mx-2">s/d</span>
              {dateRange?.to ? format(dateRange.to, 'd MMMM yyyy', { locale: id }) : (dateRange?.from ? format(dateRange.from, 'd MMMM yyyy', { locale: id }) : '-')}
            </div>
          </div>
          <TabsList className="bg-card border">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Rekap Harian
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Detail Transaksi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card className="pos-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Ringkasan Pendapatan Harian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left font-medium text-muted-foreground">
                        <th className="pb-3 px-2">Tanggal</th>
                        <th className="pb-3 px-2 text-right">Total Penjualan</th>
                        <th className="pb-3 px-2 text-center">Transaksi</th>
                        <th className="pb-3 px-2 text-center">Item Terjual</th>
                        <th className="pb-3 px-2 text-right">Rata-rata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dailyReports.map((report) => (
                        <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-medium">
                            {new Date(report.report_date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-emerald-600">
                            {formatCurrency(report.total_sales)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span>{report.paid_transactions}</span>
                              <span className="text-[10px] text-muted-foreground">dari {report.total_transactions}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {report.total_items_sold}
                          </td>
                          <td className="py-3 px-2 text-right text-muted-foreground">
                            {formatCurrency(report.average_transaction_value)}
                          </td>
                        </tr>
                      ))}
                      {dailyReports.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada rekap harian untuk periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="pos-card">
              <CardHeader>
                <CardTitle>Log Transaksi Terperinci</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="pos-loading-spinner mb-4" />
                    <p className="text-muted-foreground animate-pulse">Memuat transaksi...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium">Tidak ada transaksi</h3>
                    <p className="text-muted-foreground">Coba ubah rentang tanggal pencarian Anda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left font-medium text-muted-foreground">
                          <th className="pb-3 px-2">Waktu</th>
                          <th className="pb-3 px-2">Pelanggan</th>
                          <th className="pb-3 px-2 text-right">Total</th>
                          <th className="pb-3 px-2 text-center">Metode</th>
                          <th className="pb-3 px-2 text-center">Status</th>
                          <th className="pb-3 px-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-2">
                              {new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-2">
                              {tx.customer?.name || 'Umum'}
                            </td>
                            <td className="py-3 px-2 text-right font-semibold">
                              {formatCurrency(tx.total)}
                            </td>
                            <td className="py-3 px-2 text-center uppercase text-[10px] font-bold">
                              <Badge variant="outline">{tx.payment_method}</Badge>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Badge variant={statusVariant(tx.payment_status)}>
                                {capitalize(tx.payment_status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewDetails(tx)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          
          {selectedTx && (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">ID Transaksi</p>
                  <p className="font-mono font-bold text-xs">{selectedTx.id}</p>
                </div>
                <Badge variant={statusVariant(selectedTx.payment_status)}>
                  {capitalize(selectedTx.payment_status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Tanggal</p>
                  <p>{new Date(selectedTx.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Pelanggan</p>
                  <p>{selectedTx.customer?.name || 'Umum'}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTx.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2">
                          <p className="font-medium">{item.product_name || item.product?.name}</p>
                          {item.variant_name && (
                            <p className="text-[10px] text-muted-foreground">{item.variant_name}</p>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.qty}</td>
                        <td className="p-2 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-sm pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedTx.subtotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedTx.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
