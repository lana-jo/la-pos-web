"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, History, User } from "lucide-react";
import { Database } from "@/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onViewDebts: (customer: Customer) => void;
  formatCurrency: (amount: number) => string;
}

export function CustomerTable({
  customers,
  onEdit,
  onViewDebts,
  formatCurrency
}: CustomerTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Nama Pelanggan</TableHead>
            <TableHead>Telepon</TableHead>
            <TableHead>Alamat</TableHead>
            <TableHead className="text-right">Total Hutang</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => (
            <TableRow key={customer.id}>
              <TableCell className="text-center">{index + 1}</TableCell>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.phone || "-"}</TableCell>
              <TableCell className="max-w-xs truncate">{customer.address || "-"}</TableCell>
              <TableCell className="text-right font-semibold text-red-600">
                {formatCurrency(customer.total_debt)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={customer.is_active ? "default" : "secondary"}>
                  {customer.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDebts(customer)}
                    title="Riwayat Hutang"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(customer)}
                    title="Edit Profil"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Belum ada data pelanggan
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
