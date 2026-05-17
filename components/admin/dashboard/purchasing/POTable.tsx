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
    <div className="border rounded-xl overflow-hidden shadow-xl bg-card/50 backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-muted/80 backdrop-blur-md border-b-2 border-primary/20">
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. PO</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="group transition-all duration-200 hover:bg-primary/5 border-b border-muted/50">
              <TableCell className="text-sm">
                {format(new Date(order.created_at), "dd MMM yyyy", { locale: id })}
              </TableCell>
              <TableCell className="font-medium">{order.po_number || "-"}</TableCell>
              <TableCell>{order.supplier?.name || "N/A"}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(order.total_amount)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center scale-110">
                  {getStatusBadge(order.status)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-primary hover:text-white transition-all duration-300"
                    onClick={() => onView(order)}
                    title="Lihat Detail"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                  {order.status === "ordered" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300 shadow-sm"
                      onClick={() => onReceive(order)}
                      title="Tandai Diterima"
                    >
                      <CheckCircle className="h-5 w-5" />
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
