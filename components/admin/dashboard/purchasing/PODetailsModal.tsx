"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POWithDetails } from "@/lib/purchasing/actions";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PODetailsModalProps {
  order: POWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

export function PODetailsModal({
  order,
  isOpen,
  onClose,
  formatCurrency
}: PODetailsModalProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Pesanan Pembelian</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">No. PO</p>
            <p className="font-semibold text-lg">{order.po_number || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tanggal</p>
            <p>{format(new Date(order.created_at), "dd MMMM yyyy", { locale: id })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Supplier</p>
            <p>{order.supplier?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dibuat Oleh</p>
            <p>{order.creator?.full_name || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="capitalize font-semibold">{order.status}</p>
          </div>
          {order.received_at && (
            <div>
              <p className="text-muted-foreground">Diterima Pada</p>
              <p>{format(new Date(order.received_at), "dd MMM yyyy HH:mm")}</p>
            </div>
          )}
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.ordered_qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.ordered_qty * item.unit_cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1">
          <div className="flex justify-between w-48 font-bold text-lg border-t pt-1 mt-1">
            <span>Total:</span>
            <span className="text-primary-brand">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="mt-4 p-3 bg-muted rounded-md text-sm">
            <p className="text-muted-foreground font-semibold">Catatan:</p>
            <p>{order.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
