"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TransactionWithDetails } from "@/lib/transactions/actions";
import { AlertTriangle, Loader2 } from "lucide-react";

interface VoidTransactionModalProps {
  transaction: TransactionWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transactionId: string, reason: string) => Promise<void>;
}

export function VoidTransactionModal({
  transaction,
  isOpen,
  onClose,
  onConfirm,
}: VoidTransactionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!transaction || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(transaction.id, reason);
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Batalkan Transaksi
          </DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Stok akan dikembalikan secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">ID Transaksi:</span>
              <span className="font-mono font-medium">{transaction?.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">
                {transaction ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(transaction.total) : "-"}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Alasan Pembatalan</Label>
            <Textarea
              id="reason"
              placeholder="Contoh: Salah input barang, Pembeli batal..."
              className="resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {reason.trim().length === 0 && (
              <p className="text-[10px] text-destructive">* Alasan wajib diisi</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Kembali
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Ya, Batalkan Transaksi"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
