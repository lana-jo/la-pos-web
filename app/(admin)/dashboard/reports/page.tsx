'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TrendingUp, DollarSign, ShoppingCart, ArrowLeft, Eye } from 'lucide-react'
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

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats]               = useState<ReportStats>(DEFAULT_STATS)
  const [loading, setLoading]           = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>()

  // ── Auth guard ─────────────────────────────────────────────────────────────

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile, error } = await db('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

      if (error || !profile) { router.push('/login'); return }

      if (profile.role !== 'admin') {
        toast.error('Akses ditolak: Hanya admin yang dapat mengakses halaman ini')
        router.push('/auth/unauthorized')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchTransactionDetails = useCallback(async (transactionId: string) => {
    try {
      setLoadingDetails(true)
      // First try to get transaction items without join
      const { data: itemsData, error: itemsError } = await db('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('id')

      if (itemsError) throw itemsError

      // Then fetch product and variant details for each item
      const itemsWithProducts = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          let productData = null;
          let variantData = null;

          // Fetch product details if product_id exists
          if (item.product_id) {
            const { data: pData } = await db('products')
              .select('name, barcode')
              .eq('id', item.product_id)
              .single()

            productData = pData || null;
          }

          // Fetch variant details if product_variant_id exists
          if (item.product_variant_id) {
            const { data: vData } = await db('product_variants')
              .select('variant_name, barcode')
              .eq('id', item.product_variant_id)
              .single()

            variantData = vData || null;
          }

          return {
            ...item,
            product: productData,
            variant: variantData
          }
        })
      )

      setTransactionItems(itemsWithProducts)
    } catch (error) {
      console.error('Error fetching transaction details:', error)
      toast.error('Gagal mengambil detail transaksi')
    } finally {
      setLoadingDetails(false)
    }
  }, [])

  const handleViewDetails = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
    fetchTransactionDetails(transaction.id)
  }, [fetchTransactionDetails])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      let query = db('transactions')
          .select('id, total, payment_status, payment_method, created_at, cashier_id')
          .order('created_at', { ascending: false })

      if (date?.from) {
        query = query.gte('created_at', date.from.toISOString())
      }
      if (date?.to) {
        const toDate = new Date(date.to)
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('created_at', toDate.toISOString())
      }

      const { data, error } = await query.limit(100)

      if (error) throw error

      const rows: Transaction[] = data ?? []
      setTransactions(rows)

      const paid    = rows.filter((t) => t.payment_status === 'paid')
      const pending = rows.filter((t) => t.payment_status === 'pending')
      const revenue = paid.reduce((sum, t) => sum + t.total, 0)

      setStats({
        totalRevenue:        revenue,
        totalTransactions:   rows.length,
        paidTransactions:    paid.length,
        pendingTransactions: pending.length,
        averageTransaction:  paid.length > 0 ? revenue / paid.length : 0,
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Gagal mengambil data laporan')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    checkUserRole()
  }, [checkUserRole])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Formatters ─────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string) =>
      new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

  const successRate = stats.totalTransactions > 0
      ? Math.round((stats.paidTransactions / stats.totalTransactions) * 100)
      : 0

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading && transactions.length === 0) {
    return (
        <div className="min-h-screen pos-terminal flex items-center justify-center">
          <div className="text-center">
            <div className="pos-loading-spinner mx-auto mb-4" />
            <p className="text-lg font-medium text-primary">Loading reports...</p>
          </div>
        </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
      <div className="min-h-screen pos-terminal">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header & Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary-brand" />
              REPORTS & ANALYTICS
            </h1>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 ease-in-out" onClick={() => console.log('Stats card clicked')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary-brand transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary-brand">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">From {stats.paidTransactions} paid transactions</p>
              </CardContent>
            </Card>

            <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 ease-in-out" onClick={() => console.log('Stats card clicked')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Total Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-primary-brand transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary-brand">{stats.totalTransactions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.paidTransactions} paid, {stats.pendingTransactions} pending
                </p>
              </CardContent>
            </Card>

            <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 ease-in-out" onClick={() => console.log('Stats card clicked')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Average Transaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary-brand transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary-brand">{formatCurrency(stats.averageTransaction)}</div>
                <p className="text-xs text-muted-foreground mt-1">Per paid transaction</p>
              </CardContent>
            </Card>

            <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 ease-in-out" onClick={() => console.log('Stats card clicked')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary-brand transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-green-600">{successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Payment success rate</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Transactions Table ── */}
          {transactions.length === 0 ? (
              <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <CardContent className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-bold text-foreground mb-2">No transactions found</h3>
                  <p className="text-muted-foreground">No transactions have been recorded yet</p>
                </CardContent>
              </Card>
          ) : (
              <Card className="pos-modal-content border-none shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</th>
                        <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {transactions.map((t) => (
                          <tr 
                            key={t.id} 
                            className="hover:bg-primary-brand/5 transition-all duration-200 cursor-pointer hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]"
                            onClick={() => handleViewDetails(t)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {formatDate(t.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={statusVariant(t.payment_status)}>
                                {capitalize(t.payment_status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {t.payment_method}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-foreground text-right">
                              {formatCurrency(t.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-primary-brand hover:bg-primary-brand/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
          )}
        </main>

        {/* Transaction Details Modal */}
        <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto pos-modal-content border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="pos-modal-title">
                <ShoppingCart className="h-5 w-5" />
                TRANSACTION DETAILS
              </DialogTitle>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-6">
                {/* Transaction Summary */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Transaction ID</p>
                    <p className="font-mono text-sm text-foreground">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Date</p>
                    <p className="font-medium text-sm text-foreground">{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                    <Badge variant={statusVariant(selectedTransaction.payment_status)}>
                      {capitalize(selectedTransaction.payment_status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total</p>
                    <p className="font-black text-sm text-primary-brand">{formatCurrency(selectedTransaction.total)}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-bold text-sm uppercase text-muted-foreground mb-3">Items Purchased</h4>
                  {loadingDetails ? (
                    <div className="text-center py-4">
                      <div className="pos-loading-spinner mx-auto" />
                    </div>
                  ) : transactionItems.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No items found</div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-muted-foreground">Product</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase text-muted-foreground">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-muted-foreground">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-muted-foreground">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {transactionItems.map((item) => (
                            <tr key={item.id} className="hover:bg-background/50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-sm text-foreground">
                                    {item.product?.name || 'Unknown Product'}
                                    {item.variant && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({item.variant.variant_name})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">
                                {item.qty}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-foreground">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-black text-foreground">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}