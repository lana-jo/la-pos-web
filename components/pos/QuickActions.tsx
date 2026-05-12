"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  FileText,
  History,
  Grid3x3,
  Camera,
} from "lucide-react";

interface QuickActionsProps {
  onCameraScanner: () => void;
  onSelectProduct: () => void;
  onManualEntry: () => void;
  onTransactionHistory: () => void;
  onEndOfDayReport: () => void;
}

export function QuickActions({
  onCameraScanner,
  onSelectProduct,
  onManualEntry,
  onTransactionHistory,
  onEndOfDayReport,
}: QuickActionsProps) {
  return (
    <Card className="pos-scanner-ready">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
          Aksi Cepat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start pos-action-button hover:scale-[1.02]"
          onClick={onCameraScanner}
        >
          <Camera className="h-4 w-4 mr-2" />
          Pemindai Kamera
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start pos-action-button hover:scale-[1.02]"
          onClick={onSelectProduct}
        >
          <Grid3x3 className="h-4 w-4 mr-2" />
          Pilih Produk
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start pos-action-button hover:scale-[1.02]"
          onClick={onManualEntry}
        >
          <Package className="h-4 w-4 mr-2" />
          Entri Produk Manual
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start pos-action-button hover:scale-[1.02]"
          onClick={onTransactionHistory}
        >
          <History className="h-4 w-4 mr-2" />
          Riwayat Transaksi
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start pos-action-button hover:scale-[1.02]"
          onClick={onEndOfDayReport}
        >
          <FileText className="h-4 w-4 mr-2" />
          Laporan Akhir Hari
        </Button>
      </CardContent>
    </Card>
  );
}
