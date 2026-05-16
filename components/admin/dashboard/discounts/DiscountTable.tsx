"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nama Diskon</TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead className="text-center">Penggunaan</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((discount) => (
            <TableRow key={discount.id}>
              <TableCell className="font-medium">{discount.name}</TableCell>
              <TableCell className="font-mono">{discount.code || "-"}</TableCell>
              <TableCell className="capitalize">{discount.discount_type}</TableCell>
              <TableCell className="text-right font-semibold">
                {discount.discount_type === "percentage" 
                  ? `${discount.value}%` 
                  : formatCurrency(discount.value)}
              </TableCell>
              <TableCell className="text-center">
                {discount.usage_count} {discount.max_usage ? `/ ${discount.max_usage}` : ""}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={discount.is_active ? "default" : "secondary"}>
                  {discount.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
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
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Belum ada data diskon
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
