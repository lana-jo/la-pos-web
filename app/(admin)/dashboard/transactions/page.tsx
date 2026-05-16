"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Calendar as CalendarIcon } from "lucide-react";
import { TransactionTable } from "@/components/admin/dashboard/transactions/TransactionTable";
import { TransactionDetailsModal } from "@/components/admin/dashboard/transactions/TransactionDetailsModal";
import { VoidTransactionModal } from "@/components/admin/dashboard/transactions/VoidTransactionModal";
import { fetchTransactions, fetchTransactionItems, voidTransaction, TransactionWithDetails } from "@/lib/transactions/actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/pos/utils";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { useUserRole } from "@/hooks/useUserRole";

export default function TransactionsPage() {
  const { userId } = useUserRole();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<TransactionWithDetails | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const result = await fetchTransactions({
      paymentStatus: statusFilter,
      paymentMethod: methodFilter
    });
    
    if (result.success) {
      setTransactions(result.data || []);
    } else {
      toast.error("Gagal memuat transaksi: " + result.error);
    }
    setLoading(false);
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleViewDetails = async (tx: TransactionWithDetails) => {
    const itemsResult = await fetchTransactionItems(tx.id);
    if (itemsResult.success) {
      setSelectedTransaction({ ...tx, items: itemsResult.data });
      setIsDetailsOpen(true);
    } else {
      toast.error("Gagal memuat item transaksi");
    }
  };

  const handleVoidClick = (tx: TransactionWithDetails) => {
    setTransactionToVoid(tx);
    setIsVoidOpen(true);
  };

  const handleConfirmVoid = async (transactionId: string, reason: string) => {
    const result = await voidTransaction(transactionId, reason, userId || "system");
    if (result.success) {
      toast.success("Transaksi berhasil dibatalkan");
      loadTransactions();
    } else {
      toast.error("Gagal membatalkan transaksi: " + result.error);
      throw new Error(result.error);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.cashier?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Daftar Transaksi</h1>
          <p className="text-muted-foreground">Kelola dan pantau semua transaksi penjualan</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Ekspor CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari ID, Kasir, Pelanggan..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Metode Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setMethodFilter("all");
            }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <TransactionTable
          transactions={filteredTransactions}
          onViewDetails={handleViewDetails}
          onVoid={handleVoidClick}
          formatCurrency={formatCurrency}
        />
      )}

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        formatCurrency={formatCurrency}
      />

      <VoidTransactionModal
        transaction={transactionToVoid}
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
