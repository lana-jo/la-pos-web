"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Truck } from "lucide-react";
import { POWithDetails } from "@/lib/purchasing/actions";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface POTableProps {
  orders: POWithDetails[];
  onView: (order: POWithDetails) => void;
  onReceive: (order: POWithDetails) => void;
  formatCurrency: (amount: number) => string;
}

export function POTable({
  orders,
  onView,
  onReceive,
  formatCurrency
}: POTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "ordered":
        return <Badge className="bg-blue-100 text-blue-800">Dipesan</Badge>;
      case "received":
        return <Badge className="bg-green-100 text-green-800">Diterima</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. Invoice</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="text-sm">
                {format(new Date(order.created_at), "dd MMM yyyy", { locale: id })}
              </TableCell>
              <TableCell className="font-medium">{order.invoice_number || "-"}</TableCell>
              <TableCell>{order.supplier?.name || "N/A"}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(order.total)}
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(order.status)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(order)}
                    title="Lihat Detail"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {order.status === "ordered" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onReceive(order)}
                      title="Tandai Diterima"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Belum ada pesanan pembelian
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
