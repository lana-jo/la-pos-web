'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TrendingUp, DollarSign, ShoppingCart, ArrowLeft, Eye, Download } from 'lucide-react'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { PaymentStatus, Transaction, TransactionItem } from '@/types'

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

// Cast query builder to avoid `never` parameter errors without generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any

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
  const { user, profile, loading: authLoading } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<ReportStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const fetchTransactions = useCallback(async () => {
    // Jika tidak ada range, gunakan range 30 hari terakhir sebagai default
    const from = dateRange?.from || new Date(new Date().setDate(new Date().getDate() - 30))
    const to = dateRange?.to || new Date()

    setLoading(true)
    try {
      const { data, error } = await supabase
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

      if (error) throw error

      const txs = (data || []) as Transaction[]
      setTransactions(txs)
      calculateStats(txs)
    } catch (error: unknown) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal mengambil data transaksi')
    } finally {
      setLoading(false)
    }
  }, [dateRange, calculateStats])

  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => {
        fetchTransactions()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [authLoading, user, fetchTransactions])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)

  const handleViewDetails = (tx: Transaction) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const downloadReport = () => {
    if (transactions.length === 0) return

    const headers = ['ID Transaksi', 'Tanggal', 'Pelanggan', 'Metode Bayar', 'Status', 'Total']
    const rows = transactions.map(tx => [
      tx.id,
      new Date(tx.created_at).toLocaleString('id-ID'),
      tx.customer?.name || 'Umum',
      tx.payment_method,
      tx.payment_status,
      tx.total
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `laporan-transaksi-${dateRange?.from?.toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Laporan berhasil diunduh')
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
              Rekap Laporan
            </h1>
            <p className="text-muted-foreground">
              Pantau performa transaksi dan ringkasan pendapatan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadReport} disabled={loading || transactions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="pos-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Dari transaksi sukses</p>
            </CardContent>
          </Card>

          <Card className="pos-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.paidTransactions} Berhasil, {stats.pendingTransactions} Pending
              </p>
            </CardContent>
          </Card>

          <Card className="pos-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per transaksi sukses</p>
            </CardContent>
          </Card>

          <Card className="pos-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Pembayaran</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Badge variant="outline" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalTransactions > 0 
                  ? Math.round((stats.paidTransactions / stats.totalTransactions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tingkat kesuksesan</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="pos-card">
          <CardHeader>
            <CardTitle>Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="pos-loading-spinner mb-4" />
                <p className="text-muted-foreground animate-pulse">Memuat transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Tidak ada transaksi</h3>
                <p className="text-muted-foreground">Coba ubah rentang tanggal pencarian Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left font-medium text-muted-foreground">
                      <th className="pb-3 px-2">ID Transaksi</th>
                      <th className="pb-3 px-2">Tanggal</th>
                      <th className="pb-3 px-2">Pelanggan</th>
                      <th className="pb-3 px-2">Total</th>
                      <th className="pb-3 px-2">Metode</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-mono text-xs">
                          {tx.id.split('-')[0].toUpperCase()}
                        </td>
                        <td className="py-3 px-2">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-2">
                          {tx.customer?.name || 'Umum'}
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          {formatCurrency(tx.total)}
                        </td>
                        <td className="py-3 px-2 uppercase text-[10px] font-bold">
                          <Badge variant="outline">{tx.payment_method}</Badge>
                        </td>
                        <td className="py-3 px-2">
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
                  <p className="font-mono font-bold">{selectedTx.id}</p>
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
                  <p className="text-xs text-muted-foreground uppercase">Kasir</p>
                  <p>{selectedTx.cashier?.full_name || 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Pelanggan</p>
                  <p>{selectedTx.customer?.name || 'Umum'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Metode Bayar</p>
                  <p className="uppercase font-medium">{selectedTx.payment_method}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr className="text-left">
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTx.items?.map((item) => (
                      <tr key={(item as any).id}>
                        <td className="p-2">
                          <p className="font-medium">{(item as any).product_name}</p>
                          {(item as any).variant_name && (
                            <p className="text-[10px] text-muted-foreground">{(item as any).variant_name}</p>
                          )}
                        </td>
                        <td className="p-2 text-center">{(item as any).qty}</td>
                        <td className="p-2 text-right">{formatCurrency((item as any).subtotal)}</td>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span>-{formatCurrency(selectedTx.discount_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pajak (0%)</span>
                  <span>{formatCurrency(selectedTx.tax_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedTx.total)}</span>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="bg-muted p-2 rounded text-xs">
                  <p className="font-semibold mb-1">Catatan:</p>
                  <p>{selectedTx.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
