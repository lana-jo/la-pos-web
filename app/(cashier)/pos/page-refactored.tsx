"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Package,
  Receipt,
  FileText,
  History,
  DollarSign,
  Grid3x3,
  Camera,
} from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { CartPanel } from "@/components/pos/CartPanel";
import { CameraScanner } from "@/components/camera/CameraScanner";
import {
  ManualProductEntryModal,
  ProductSelectionModal,
  VariantSelectionModal,
  TransactionHistoryModal,
  EndOfDayReportModal,
} from "@/components/pos/modals";
import { usePOSCameraScanner } from "@/hooks/usePOSCameraScanner";
import { usePOSProducts } from "@/hooks/usePOSProducts";
import { usePOSTransactions } from "@/hooks/usePOSTransactions";
import { usePOSOperations } from "@/hooks/usePOSOperations";
import type { Product, ProductVariant } from "@/types";

export default function POSPage() {
  const router = useRouter();

  // Modal states
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showEndOfDayReport, setShowEndOfDayReport] = useState(false);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showVariantSelection, setShowVariantSelection] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product & { variants?: ProductVariant[] } | null>(null);

  // Custom hooks
  const posOperations = usePOSOperations();
  const cameraScanner = usePOSCameraScanner({
    onProductFound: (product, quantity, variant) => {
      posOperations.handleProductSelection(product, variant, quantity);
    },
    onError: (error) => {
      console.error("Camera scanner error:", error);
    },
  });

  const products = usePOSProducts({ autoFetch: false });
  const transactions = usePOSTransactions({ cashierId: posOperations.userProfile?.id });

  // Load products when modal opens
  const handleOpenProductSelection = () => {
    setShowProductSelection(true);
    products.fetchProducts();
  };

  // Load transactions when modal opens
  const handleOpenTransactionHistory = () => {
    setShowTransactionHistory(true);
    transactions.fetchTransactions();
  };

  // Generate report when modal opens
  const handleOpenEndOfDayReport = () => {
    setShowEndOfDayReport(true);
    transactions.generateReport();
  };

  // Handle product selection
  const handleProductSelection = (
    product: Product & { variants?: ProductVariant[] },
    selectedVariant?: ProductVariant
  ) => {
    // If product has variants and no variant selected, show variant selection
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      setSelectedProductForVariants(product);
      setShowVariantSelection(true);
      return;
    }
    
    // Add product or selected variant
    const result = posOperations.handleProductSelection(product, selectedVariant);
    if (result.success) {
      setShowProductSelection(false);
    }
  };

  // Handle variant selection
  const handleVariantSelection = (product: Product & { variants?: ProductVariant[] }, variant: ProductVariant, quantity: number) => {
    const result = posOperations.handleVariantSelection(product, variant, quantity);
    if (result.success) {
      setShowVariantSelection(false);
      setShowProductSelection(false);
      setSelectedProductForVariants(null);
    }
  };

  // Handle manual product entry
  const handleManualProductEntry = (product: Product, quantity: number) => {
    const result = posOperations.handleAddManualProduct(product, quantity);
    if (result.success) {
      setShowManualEntry(false);
    }
  };

  // Handle camera barcode detection
  const handleCameraBarcodeDetected = async (barcode: string) => {
    const result = await posOperations.handleBarcodeDetected(barcode);
    if (result.success) {
      setShowCameraScanner(false);
    }
  };

  // Handle camera scanner open/close
  const handleOpenCameraScanner = () => {
    setShowCameraScanner(true);
    cameraScanner.startScanning();
  };

  const handleCloseCameraScanner = () => {
    setShowCameraScanner(false);
    cameraScanner.stopScanning();
  };


  return (
    <div className="min-h-screen pos-terminal">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 sm:px-6 lg:px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary-brand flex items-center gap-3">
                <div className="w-2 h-8 bg-primary-brand rounded-full"></div>
                POS TERMINAL
              </h1>
              <p className="text-muted-foreground mt-2 font-medium">
                Point of Sale System • {posOperations.userProfile?.full_name || 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1 border-primary-brand text-primary-brand">
                {posOperations.userProfile?.role || 'Cashier'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Scanner */}
          <div className="space-y-6">
            <BarcodeScanner />

            {/* Quick Actions */}
            <Card className="pos-scanner-ready">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-6 bg-primary-brand rounded-full"></div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={handleOpenCameraScanner}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera Scanner
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={handleOpenProductSelection}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Select Product
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={() => setShowManualEntry(true)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Manual Product Entry
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={handleOpenTransactionHistory}
                >
                  <History className="h-4 w-4 mr-2" />
                  View Transaction History
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={handleOpenEndOfDayReport}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  End of Day Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Cart */}
          <div className="space-y-6">
            <CartPanel />

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No recent transactions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ManualProductEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onAddProduct={handleManualProductEntry}
      />

      <ProductSelectionModal
        isOpen={showProductSelection}
        onClose={() => setShowProductSelection(false)}
        products={products.products}
        loading={products.loading}
        searchTerm={products.searchTerm}
        onSearchChange={products.setSearchTerm}
        selectedCategory={products.selectedCategory}
        onCategoryChange={products.setSelectedCategory}
        categories={products.categories}
        onProductSelect={handleProductSelection}
      />

      <VariantSelectionModal
        isOpen={showVariantSelection}
        onClose={() => setShowVariantSelection(false)}
        product={selectedProductForVariants}
        onVariantSelect={handleVariantSelection}
      />

      <TransactionHistoryModal
        isOpen={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
        transactions={transactions.transactions}
        loading={transactions.loading}
        onRefresh={() => transactions.fetchTransactions()}
      />

      <EndOfDayReportModal
        isOpen={showEndOfDayReport}
        onClose={() => setShowEndOfDayReport(false)}
        reportData={transactions.reportData}
        loading={transactions.loadingReport}
        onDateChange={(date) => transactions.setReportData(prev => ({ ...prev, date }))}
        onGenerateReport={transactions.generateReport}
        onPrintReport={() => {
          // Print functionality can be implemented here
          console.log("Print report:", transactions.reportData);
        }}
      />

      <CameraScanner
        isOpen={showCameraScanner}
        onClose={handleCloseCameraScanner}
        onBarcodeDetected={handleCameraBarcodeDetected}
      />
    </div>
  );
}
