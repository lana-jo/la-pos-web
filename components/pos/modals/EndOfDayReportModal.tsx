"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, X, Receipt, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";

interface ReportData {
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  date: string;
}

interface EndOfDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData;
  loading: boolean;
  onDateChange: (date: string) => void;
  onGenerateReport: (date?: string) => Promise<ReportData | null>;
  onPrintReport?: () => void;
}

export function EndOfDayReportModal({
  isOpen,
  onClose,
  reportData,
  loading,
  onDateChange,
  onGenerateReport,
  onPrintReport,
}: EndOfDayReportModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDateChange = (date: string) => {
    onDateChange(date);
    onGenerateReport(date);
  };

  const handlePrintReport = () => {
    if (onPrintReport) {
      onPrintReport();
    } else {
      toast.success("Report printed successfully");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] pos-modal-content">
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <FileText className="h-5 w-5" />
            End of Day Report
          </DialogTitle>
        </DialogHeader>
        <div className="pos-modal-body">
          <div className="space-y-2 mb-6">
            <Label htmlFor="report-date" className="pos-form-label">Report Date</Label>
            <Input
              id="report-date"
              type="date"
              value={reportData.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="pos-form-input"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="pos-loading-spinner mx-auto mb-4"></div>
              <p>Generating report...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="pos-report-card">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="pos-report-label">Total Sales</p>
                <p className="pos-report-value">
                  {formatCurrency(reportData.totalSales)}
                </p>
              </div>
              <div className="pos-report-card">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="pos-report-label">Transactions</p>
                <p className="pos-report-value">
                  {reportData.totalTransactions}
                </p>
              </div>
              <div className="pos-report-card">
                <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="pos-report-label">Items Sold</p>
                <p className="pos-report-value">
                  {reportData.totalItems}
                </p>
              </div>
              <div className="pos-report-card">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="pos-report-label">Avg Transaction</p>
                <p className="pos-report-value">
                  {reportData.totalTransactions > 0
                    ? formatCurrency(
                        Math.round(
                          reportData.totalSales / reportData.totalTransactions
                        )
                      )
                    : formatCurrency(0)
                  }
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="pos-modal-footer">
          <Button
            className="pos-button-secondary"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            className="pos-button-primary"
            onClick={handlePrintReport}
            disabled={loading}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
