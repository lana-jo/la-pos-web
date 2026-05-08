"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { History, X, Receipt } from "lucide-react";
import type { Transaction } from "@/types";

interface TransactionWithItems {
  id: string;
  cashier_id: string | null;
  customer_id: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  items: any[];
  cashier?: { id: string; full_name: string | null };
  customer?: { id: string; name: string };
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionWithItems[];
  loading: boolean;
  onRefresh?: () => void;
  onTransactionClick?: (transaction: TransactionWithItems) => void;
}

export function TransactionHistoryModal({
  isOpen,
  onClose,
  transactions,
  loading,
  onRefresh,
  onTransactionClick,
}: TransactionHistoryModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'expired':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'qris':
        return '📱';
      case 'transfer':
        return '🏦';
      case 'debt':
        return '📝';
      default:
        return '💰';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <History className="h-5 w-5" />
            Transaction History
          </DialogTitle>
        </DialogHeader>
        <div className="pos-modal-body">
          {loading ? (
            <div className="text-center py-8">
              <div className="pos-loading-spinner mx-auto mb-4"></div>
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => onTransactionClick?.(transaction)}
                  className="w-full pos-transaction-card bg-background border rounded-lg p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:bg-muted/60 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-primary">
                          Transaction #{transaction.id.slice(-6)}
                        </p>
                        <span className="text-sm">
                          {getPaymentMethodIcon(transaction.payment_method)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString("id-ID", {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={getPaymentStatusColor(transaction.payment_status)}
                          className="text-xs"
                        >
                          {transaction.payment_status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {transaction.payment_method}
                        </Badge>
                        {transaction.items && (
                          <Badge variant="secondary" className="text-xs">
                            {transaction.items.length} items
                          </Badge>
                        )}
                      </div>
                      {transaction.customer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer: {transaction.customer.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(transaction.total)}
                      </p>
                      {transaction.amount_paid && transaction.amount_paid !== transaction.total && (
                        <p className="text-xs text-muted-foreground">
                          Paid: {formatCurrency(transaction.amount_paid)}
                        </p>
                      )}
                      {transaction.change_amount && transaction.change_amount > 0 && (
                        <p className="text-xs text-green-600">
                          Change: {formatCurrency(transaction.change_amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="pos-modal-footer">
          <div className="flex justify-between w-full">
            {onRefresh && (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            )}
            <Button
              className="pos-button-secondary"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
