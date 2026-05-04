'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TrendingUp, DollarSign, ShoppingCart, ArrowLeft, Eye } from 'lucide-react'
import DashboardHeader from '@/components/layout/DashboardHeader'
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

      console.log('Items data:', itemsData)
      console.log('Items error:', itemsError)

      if (itemsError) throw itemsError

      // Then fetch product and variant details for each item
      const itemsWithProducts = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          let productData = null;
          let variantData = null;
          
          // Fetch product details if product_id exists
          if (item.product_id) {
            const { data: pData, error: productError } = await db('products')
              .select('name, barcode')
              .eq('id', item.product_id)
              .single()
            
            console.log(`Product data for ${item.product_id}:`, pData)
            console.log(`Product error for ${item.product_id}:`, productError)
            
            productData = pData || null;
          }
          
          // Fetch variant details if product_variant_id exists
          if (item.product_variant_id) {
            const { data: vData, error: variantError } = await db('product_variants')
              .select('variant_name, barcode')
              .eq('id', item.product_variant_id)
              .single()
            
            console.log(`Variant data for ${item.product_variant_id}:`, vData)
            console.log(`Variant error for ${item.product_variant_id}:`, variantError)
            
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
      const { data, error } = await db('transactions')
          .select('id, total, payment_status, payment_method, created_at, cashier_id')
          .order('created_at', { ascending: false })
          .limit(100)

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
  }, [])

  useEffect(() => {
    checkUserRole()
    fetchData()
  }, [checkUserRole, fetchData])

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

  if (loading) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <p className="text-lg">Loading reports...</p>
          </div>
        </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
      <div className="min-h-screen bg-background">
        {/* <DashboardHeader title="Reports" subtitle="View analytics and reports" badgeText="Administrator">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </DashboardHeader> */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">From {stats.paidTransactions} paid transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.paidTransactions} paid, {stats.pendingTransactions} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</div>
                <p className="text-xs text-muted-foreground">Per paid transaction</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate}%</div>
                <p className="text-xs text-muted-foreground">Payment success rate</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Transactions Table ── */}
          {transactions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                  <p className="text-gray-500">No transactions have been recorded yet</p>
                </CardContent>
              </Card>
          ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {transactions.map((t) => (
                          <tr key={t.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                              {formatCurrency(t.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(t)}
                                className="h-8 w-8 p-0"
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            
            {selectedTransaction && (
              <div className="space-y-6">
                {/* Transaction Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusVariant(selectedTransaction.payment_status)}>
                      {capitalize(selectedTransaction.payment_status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium">{formatCurrency(selectedTransaction.total)}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Items Purchased</h4>
                  {loadingDetails ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading items...</p>
                    </div>
                  ) : transactionItems.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No items found</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium">Product</th>
                            <th className="px-4 py-2 text-center text-xs font-medium">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-medium">Unit Price</th>
                            <th className="px-4 py-2 text-right text-xs font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {transactionItems.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">
                                <div>
                                  <p className="font-medium text-sm">
                                    {item.product?.name || 'Unknown Product'}
                                    {item.variant && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({item.variant.variant_name})
                                      </span>
                                    )}
                                  </p>
                                  {(item.variant?.barcode || item.product?.barcode) && (
                                    <p className="text-xs text-muted-foreground">
                                      Barcode: {item.variant?.barcode || item.product?.barcode}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center text-sm">
                                {item.qty}
                              </td>
                              <td className="px-4 py-2 text-right text-sm">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-medium">
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