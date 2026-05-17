"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Layers } from "lucide-react";
import { Database } from "@/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Discount = Database["public"]["Tables"]["discounts"]["Row"];

interface DiscountTableProps {
  discounts: Discount[];
  onEdit: (discount: Discount) => void;
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

export function DiscountTable({
  discounts,
  onEdit,
  onDelete,
  formatCurrency
}: DiscountTableProps) {
  const now = new Date();

  const getValidityStatus = (d: Discount) => {
    if (!d.is_active) return "inactive";
    if (new Date(d.valid_from) > now) return "scheduled";
    if (d.valid_until && new Date(d.valid_until) < now) return "expired";
    if (d.max_usage != null && d.usage_count >= d.max_usage) return "exhausted";
    return "active";
  };

  const validityBadge = (d: Discount) => {
    const status = getValidityStatus(d);
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Terjadwal</Badge>;
      case "expired":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Kadaluarsa</Badge>;
      case "exhausted":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Habis</Badge>;
      default:
        return <Badge variant="secondary">Nonaktif</Badge>;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nama Diskon</TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Masa Berlaku</TableHead>
            <TableHead className="text-center">Penggunaan</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((discount) => (
            <TableRow key={discount.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{discount.name}</p>
                  {discount.is_stackable && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Layers className="h-3 w-3 text-blue-500" />
                      <span className="text-[10px] text-blue-600">Bisa digabung</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {discount.code ? (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {discount.code}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-xs">
                  {discount.discount_type === "percentage" ? "Persen" : "Nominal"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {discount.discount_type === "percentage"
                  ? `${discount.value}%`
                  : formatCurrency(discount.value)}
                {discount.max_discount && discount.discount_type === "percentage" && (
                  <p className="text-xs text-muted-foreground font-normal">
                    maks. {formatCurrency(discount.max_discount)}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <div>
                  <p>{format(new Date(discount.valid_from), "dd MMM yy HH:mm", { locale: id })}</p>
                  {discount.valid_until ? (
                    <p className="text-orange-600">
                      s/d {format(new Date(discount.valid_until), "dd MMM yy HH:mm", { locale: id })}
                    </p>
                  ) : (
                    <p className="text-green-600">Tidak terbatas</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium">{discount.usage_count}</span>
                {discount.max_usage != null && (
                  <span className="text-muted-foreground text-xs"> / {discount.max_usage}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {validityBadge(discount)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(discount)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(discount.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {discounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Belum ada data diskon
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
