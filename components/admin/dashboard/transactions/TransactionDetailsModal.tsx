"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionWithDetails } from "@/lib/transactions/actions";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface TransactionDetailsModalProps {
  transaction: TransactionWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

export function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  formatCurrency
}: TransactionDetailsModalProps) {
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Transaksi</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">ID Transaksi</p>
            <p className="font-mono">{transaction.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Waktu</p>
            <p>{format(new Date(transaction.created_at), "dd MMMM yyyy HH:mm:ss", { locale: id })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kasir</p>
            <p>{transaction.cashier?.full_name || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pelanggan</p>
            <p>{transaction.customer?.name || "Umum"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Metode Pembayaran</p>
            <p className="capitalize">{transaction.payment_method}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="capitalize font-semibold">{transaction.payment_status}</p>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1">
          <div className="flex justify-between w-48 text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(transaction.subtotal)}</span>
          </div>
          <div className="flex justify-between w-48 text-sm">
            <span className="text-muted-foreground">Diskon:</span>
            <span>{formatCurrency(transaction.discount_amount)}</span>
          </div>
          <div className="flex justify-between w-48 font-bold text-lg border-t pt-1 mt-1">
            <span>Total:</span>
            <span className="text-primary-brand">{formatCurrency(transaction.total)}</span>
          </div>
        </div>

        {transaction.void_reason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-sm">
            <p className="text-red-800 font-semibold">Alasan Pembatalan:</p>
            <p className="text-red-700">{transaction.void_reason}</p>
            <p className="text-red-600 text-xs mt-1 italic">
              Dibatalkan pada {transaction.voided_at ? format(new Date(transaction.voided_at), "dd MMM HH:mm") : "-"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
