"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchCustomerDebts, payDebt } from "@/lib/customers/actions";
import { Database } from "@/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface DebtManagementModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

export function DebtManagementModal({
  customer,
  isOpen,
  onClose,
  formatCurrency
}: DebtManagementModalProps) {
  const { userId } = useUserRole();
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  const loadDebts = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    const result = await fetchCustomerDebts(customer.id);
    if (result.success) {
      setDebts(result.data || []);
    }
    setLoading(false);
  }, [customer]);

  useEffect(() => {
    if (isOpen && customer) {
      loadDebts();
    }
  }, [isOpen, customer, loadDebts]);

  const handlePay = async () => {
    if (!selectedDebtId || !payAmount || !userId) return;
    
    const amount = parseInt(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Jumlah pembayaran tidak valid");
      return;
    }

    const result = await payDebt(selectedDebtId, amount, userId);
    if (result.success) {
      toast.success("Pembayaran hutang berhasil dicatat");
      setPayAmount("");
      setSelectedDebtId(null);
      loadDebts();
    } else {
      toast.error("Gagal mencatat pembayaran: " + result.error);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manajemen Hutang - {customer.name}</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Hutang</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(customer.total_debt)}</p>
          </div>
          {selectedDebtId && (
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="payAmount">Bayar Hutang</Label>
                <Input
                  id="payAmount"
                  type="number"
                  placeholder="Masukkan jumlah..."
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={handlePay}>Bayar</Button>
              <Button variant="ghost" onClick={() => setSelectedDebtId(null)}>Batal</Button>
            </div>
          )}
        </div>

        <div className="border rounded-md max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Hutang Awal</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id} className={selectedDebtId === debt.id ? "bg-primary/5" : ""}>
                  <TableCell className="text-xs">
                    {format(new Date(debt.created_at), "dd MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(debt.amount)}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(debt.remaining)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={debt.status === "paid" ? "default" : "outline"}>
                      {debt.status === "paid" ? "Lunas" : "Belum Lunas"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {debt.status !== "paid" && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedDebtId(debt.id);
                          setPayAmount(debt.remaining.toString());
                        }}
                      >
                        Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {debts.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Tidak ada catatan hutang
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
