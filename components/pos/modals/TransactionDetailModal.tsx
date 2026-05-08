"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Receipt, X, Printer, Package, User, Calendar, CreditCard, Loader2 } from "lucide-react";
import type { Transaction, TransactionItem } from "@/types";
import { PrintManager } from "@/lib/printer/printManager";
import { useState } from "react";
import { toast } from "sonner";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'qris': return '📱';
      case 'transfer': return '🏦';
      case 'debt': return '📝';
      default: return '💰';
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!transaction) return;
    setIsPrinting(true);
    try {
      const printManager = PrintManager.getInstance();
      const cashierName = transaction.cashier?.full_name || 'Unknown';
      const success = await printManager.printReceipt(
        transaction as Transaction & { items: TransactionItem[] },
        cashierName,
        { silent: false }
      );
      if (success) {
        toast.success('Receipt printed successfully');
      } else {
        toast.error('Failed to print receipt');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-hidden pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction #{transaction.id.slice(-6)}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] pr-1">
          <div className="pos-modal-body space-y-5">
            {/* Header Info */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getPaymentStatusColor(transaction.payment_status)}>
                {transaction.payment_status}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <span>{getPaymentMethodIcon(transaction.payment_method)}</span>
                {transaction.payment_method}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {transaction.items?.length || 0} items
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(transaction.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {transaction.cashier && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{transaction.cashier.full_name || 'Unknown'}</span>
                </div>
              )}
              {transaction.customer && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Customer: {transaction.customer.name}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Items List */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                Items
              </h3>
              {transaction.items && transaction.items.length > 0 ? (
                <div className="space-y-2">
                  {transaction.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex justify-between items-start py-2 px-3 rounded-md bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.product_name}
                          {item.variant_name && (
                            <span className="text-muted-foreground"> - {item.variant_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm ml-3 whitespace-nowrap">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No item details available</p>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(transaction.discount_amount)}</span>
                </div>
              )}
              {transaction.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(transaction.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              {transaction.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(transaction.amount_paid)}</span>
                  </div>
                  {transaction.change_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Change</span>
                      <span>{formatCurrency(transaction.change_amount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {transaction.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pos-modal-footer">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPrinting ? 'Printing...' : 'Print'}
            </Button>
            <Button className="pos-button-secondary" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
