"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, XCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TransactionWithDetails } from "@/lib/transactions/actions";

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  onViewDetails: (transaction: TransactionWithDetails) => void;
  onVoid: (transaction: TransactionWithDetails) => void;
  formatCurrency: (amount: number) => string;
}

export function TransactionTable({
  transactions,
  onViewDetails,
  onVoid,
  formatCurrency
}: TransactionTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>ID Transaksi</TableHead>
            <TableHead>Kasir</TableHead>
            <TableHead>Pelanggan</TableHead>
            <TableHead>Metode</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-sm">
                {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: id })}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {tx.id.substring(0, 8)}...
              </TableCell>
              <TableCell>{tx.cashier?.full_name || "-"}</TableCell>
              <TableCell>{tx.customer?.name || "Umum"}</TableCell>
              <TableCell className="capitalize">{tx.payment_method}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(tx.total)}
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(tx.payment_status)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(tx)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {tx.payment_status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onVoid(tx)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Tidak ada transaksi ditemukan
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
