"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary, POSErrorFallback } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/LoadingStates";
import { Receipt } from "lucide-react";
import { POSHeader } from "@/components/pos/POSHeader";
import { QuickActions } from "@/components/pos/QuickActions";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { CartPanel } from "@/components/pos/CartPanel";
import { CameraScanner } from "@/components/camera/CameraScanner";
import {
  ManualProductEntryModal,
  ProductSelectionModal,
  VariantSelectionModal,
  TransactionHistoryModal,
  TransactionDetailModal,
  EndOfDayReportModal,
  PinVerificationModal,
} from "@/components/pos/modals";
import { usePOSCameraScanner } from "@/hooks/usePOSCameraScanner";
import { useUserProfile, useProducts, useTransactions, useReports } from "@/hooks/usePOSData";
import { useModalState } from "@/hooks/useModalState";
import { usePinVerification } from "@/hooks/usePinVerification";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { formatPrice } from "@/lib/pos/utils";
import type { Product, ProductVariant } from "@/types";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types";

export default function POSPage() {
  const router = useRouter();
  const { addItem } = useCartStore();

  // Custom hooks for data and state management
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { 
    products, 
    categories,
    loading: productsLoading, 
    search, 
    setSearch, 
    selectedCategory, 
    setSelectedCategory, 
    fetchProducts 
  } = useProducts();
  const { 
    transactions, 
    loading: transactionsLoading, 
    fetchTransactions 
  } = useTransactions();
  const { 
    reportData, 
    loading: reportLoading, 
    generateReport, 
    updateReportDate 
  } = useReports();
  
  // Modal state management
  const {
    modalState,
    manualProduct,
    selectedProductForVariants,
    selectedTransaction,
    openModal,
    closeModal,
    setManualProduct,
    setSelectedProductForVariants,
    setSelectedTransaction,
    resetManualProduct,
  } = useModalState();

  const {
    isPinModalOpen,
    requestVerification,
    handlePinSuccess,
    handlePinClose,
    pinTitle,
    pinDescription
  } = usePinVerification();

  // Camera scanner hook
  const cameraScanner = usePOSCameraScanner({
    onProductFound: (product: Product, quantity?: number, variant?: ProductVariant) => {
      addItem(product, quantity || 1, variant || null);
      const itemName = variant ? `${product.name} - ${variant.variant_name}` : product.name;
      toast.success(`Added ${itemName} to cart`);
      closeModal("showCameraScanner");
    },
    onError: (error) => {
      console.error("Camera scanner error:", error);
    },
  });

  // Debounced product fetch
  useEffect(() => {
    if (!modalState.showProductSelection) return;
    
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [search, selectedCategory, modalState.showProductSelection, fetchProducts]);

  // Handle product selection
  const handleProductSelection = (
    product: Product & { variants?: ProductVariant[] },
    selectedVariant?: ProductVariant
  ) => {
    // If product has variants and no variant selected, show variant selection
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      setSelectedProductForVariants(product);
      openModal("showVariantSelection");
      return;
    }
    
    // Add product or selected variant
    addItem(product, 1, selectedVariant || null);
    const itemName = selectedVariant ? `${product.name} - ${selectedVariant.variant_name}` : product.name;
    toast.success(`Added ${itemName} to cart`);
    closeModal("showProductSelection");
  };

  // Handle manual product entry
  const handleAddManualProduct = () => {
    try {
      const price = parseFloat(manualProduct.price);
      const quantity = parseInt(manualProduct.quantity) || 1;

      if (!manualProduct.name || isNaN(price) || price <= 0) {
        toast.error("Please enter valid product name and price");
        return;
      }

      const manualProductData = {
        id: `manual-${Date.now()}`,
        category_id: null,
        unit_id: null,
        supplier_id: null,
        name: manualProduct.name,
        description: null,
        cost_price: 0,
        price: price,
        stock: 999999,
        cached_stock: 999999,
        track_stock: false,
        low_stock_threshold: 0,
        min_stock: 0,
        max_stock: null,
        barcode: "",
        image_url: null,
        is_active: true,
        is_consignment: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addItem(manualProductData, quantity);
      toast.success(`Added ${quantity}x ${manualProduct.name} to cart`);

      resetManualProduct();
      closeModal("showManualEntry");
    } catch (error) {
      console.error("[Manual Entry] Error:", error);
      toast.error(
        `Failed to add manual product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle camera barcode detection
  const handleCameraBarcodeDetected = async (barcode: string) => {
    try {
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("*, product:products(*)")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { data: ProductVariant & { product: Product } | null, error: any };

      if (variant && variant.product) {
        const conversionQty = variant.conversion_qty || 1;
        const productStock = (variant.product.cached_stock || 0) > 0 ? variant.product.cached_stock : (variant.product.stock || 0);
        const availableVariantStock = conversionQty > 1 
          ? Math.floor(productStock / conversionQty)
          : productStock;
        
        if (availableVariantStock <= 0) {
          toast.error(`Product "${variant.product.name}" is out of stock`);
          return;
        }
        
        addItem(variant.product, 1, variant);
        toast.success(`Added ${variant.product.name} - ${variant.variant_name} to cart`);
        closeModal("showCameraScanner");
        return;
      }

      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { data: Database["public"]["Tables"]["products"]["Row"] | null, error: any };

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error(`Product not found for barcode: ${barcode}`);
        } else {
          toast.error("Failed to lookup product");
        }
        return;
      }

      if (!product) {
        toast.error(`Product not found for barcode: ${barcode}`);
        return;
      }

      if (product.stock <= 0) {
        toast.error(`Product "${product.name}" is out of stock`);
        return;
      }

      addItem(product, 1);
      toast.success(`Added ${product.name} to cart`);
      closeModal("showCameraScanner");
    } catch (error) {
      console.error("Barcode detection error:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Handle variant selection
  const handleVariantSelect = (product: Product, variant: ProductVariant, quantity: number) => {
    addItem(product, quantity, variant);
    toast.success(`Added ${quantity}x ${product.name} - ${variant.variant_name}`);
    closeModal("showVariantSelection");
    closeModal("showProductSelection");
    setSelectedProductForVariants(null);
  };

  // Quick action handlers
  const handleCameraScanner = () => openModal("showCameraScanner");
  const handleSelectProduct = () => {
    openModal("showProductSelection");
    fetchProducts();
  };
  const handleManualEntry = () => openModal("showManualEntry");
  const handleTransactionHistory = () => {
    requestVerification(
      () => {
        openModal("showTransactionHistory");
        fetchTransactions();
      },
      "Verifikasi Riwayat",
      "Masukkan PIN untuk melihat riwayat transaksi"
    );
  };
  const handleEndOfDayReport = () => {
    requestVerification(
      () => {
        openModal("showEndOfDayReport");
        generateReport();
      },
      "Verifikasi Laporan",
      "Masukkan PIN untuk melihat laporan akhir hari"
    );
  };

  // Redirect if not authenticated
  if (!profileLoading && !userProfile) {
    router.push("/login");
    return null;
  }

  return (
    <ErrorBoundary fallback={POSErrorFallback}>
      <div className="page-background">
        {/* Header */}
        <POSHeader 
          userName={userProfile?.full_name} 
          userRole={userProfile?.role} 
        />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Scanner */}
            <div className="space-y-6">
              <BarcodeScanner />

              {/* Quick Actions */}
              <QuickActions
                onCameraScanner={handleCameraScanner}
                onSelectProduct={handleSelectProduct}
                onManualEntry={handleManualEntry}
                onTransactionHistory={handleTransactionHistory}
                onEndOfDayReport={handleEndOfDayReport}
              />
            </div>

            {/* Right Column - Cart */}
            <div className="space-y-6">
              <CartPanel onAddItem={handleSelectProduct} />

              {/* Recent Transactions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {transactions.length === 0 ? (
                    <EmptyState
                      icon={<Receipt className="h-12 w-12" />}
                      title="No recent transactions"
                      description="Your recent transactions will appear here"
                    />
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {transactions.slice(0, 10).map((transaction) => (
                        <button
                          key={transaction.id}
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            openModal("showTransactionDetail");
                          }}
                          className="w-full flex justify-between items-center py-3 px-3 rounded-lg border bg-background shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:bg-muted/60 text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">#{transaction.id.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                transaction.payment_status === 'paid' ? 'bg-green-500' :
                                transaction.payment_status === 'pending' ? 'bg-yellow-500' :
                                transaction.payment_status === 'expired' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`} />
                              <span className="text-xs text-muted-foreground capitalize">
                                {transaction.payment_status}
                              </span>
                            </div>
                          </div>
                          <p className="font-bold text-sm">{formatPrice(transaction.total)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Modals */}
        <ManualProductEntryModal
          isOpen={modalState.showManualEntry}
          onClose={() => closeModal("showManualEntry")}
          onAddProduct={handleAddManualProduct}
        />

        <ProductSelectionModal
          isOpen={modalState.showProductSelection}
          onClose={() => closeModal("showProductSelection")}
          products={products}
          loading={productsLoading}
          searchTerm={search}
          onSearchChange={setSearch}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          onProductSelect={handleProductSelection}
        />

        <VariantSelectionModal
          isOpen={modalState.showVariantSelection}
          onClose={() => {
            closeModal("showVariantSelection");
            setSelectedProductForVariants(null);
          }}
          product={selectedProductForVariants}
          onVariantSelect={handleVariantSelect}
        />

        <TransactionHistoryModal
          isOpen={modalState.showTransactionHistory}
          onClose={() => closeModal("showTransactionHistory")}
          transactions={transactions as any[]}
          loading={transactionsLoading}
          onRefresh={fetchTransactions}
          onTransactionClick={(transaction) => {
            setSelectedTransaction(transaction);
            openModal("showTransactionDetail");
          }}
        />

        <TransactionDetailModal
          isOpen={modalState.showTransactionDetail}
          onClose={() => closeModal("showTransactionDetail")}
          transaction={selectedTransaction}
        />

        <EndOfDayReportModal
          isOpen={modalState.showEndOfDayReport}
          onClose={() => closeModal("showEndOfDayReport")}
          reportData={reportData}
          loading={reportLoading}
          onDateChange={updateReportDate}
          onGenerateReport={generateReport}
          onPrintReport={() => toast.success("Report printed successfully")}
        />

        <CameraScanner
          isOpen={modalState.showCameraScanner}
          onClose={() => closeModal("showCameraScanner")}
          onBarcodeDetected={handleCameraBarcodeDetected}
        />

        <PinVerificationModal
          isOpen={isPinModalOpen}
          onClose={handlePinClose}
          onSuccess={handlePinSuccess}
          title={pinTitle}
          description={pinDescription}
        />
      </div>
    </ErrorBoundary>
  );
}