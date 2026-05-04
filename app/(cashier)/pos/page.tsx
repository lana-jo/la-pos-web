"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Receipt,
  FileText,
  History,
  DollarSign,
  Grid3x3,
  Camera,
  Search,
  X,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart";
import type { Product, ProductVariant, Database } from "@/types";
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

export default function POSPage() {
  const router = useRouter();
  const { addItem } = useCartStore();

  // User profile state
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string } | null>(null);
  
  // Product selection state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Transaction state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Report state
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalItems: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Manual product entry state
  const [manualProduct, setManualProduct] = useState({
    name: "",
    price: "",
    quantity: "1"
  });
  
  // Variant selection state
  const [variantQuantity, setVariantQuantity] = useState(1);

  // Modal states
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showEndOfDayReport, setShowEndOfDayReport] = useState(false);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showVariantSelection, setShowVariantSelection] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product & { variants?: ProductVariant[] } | null>(null);

  // Custom hooks
  const cameraScanner = usePOSCameraScanner({
    onProductFound: (product: Product, quantity?: number, variant?: ProductVariant) => {
      // Add the product directly with the quantity
      addItem(product, quantity || 1, variant || null);
      const itemName = variant ? `${product.name} - ${variant.variant_name}` : product.name;
      toast.success(`Added ${itemName} to cart`);
      setShowCameraScanner(false);
    },
    onError: (error) => {
      console.error("Camera scanner error:", error);
    },
  });

  // Memoized user profile check to prevent repeated calls
  const userProfileData = useMemo(() => userProfile, [userProfile]);
  
  useEffect(() => {
    // Only check user profile if not already loaded
    if (!userProfile) {
      checkUserRole();
    }
  }, [userProfile]);

  // Debounced product fetch to avoid unnecessary calls
  useEffect(() => {
    if (!showProductSelection) return;
    
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [productSearch, selectedCategory, showProductSelection]);

  const checkUserRole = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Get role and full_name from database profiles table
      const { data: profile, error: profileError } = (await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle()) as {
        data: {
          role: "admin" | "cashier" | "customer";
          full_name: string;
        } | null;
        error: any;
      };

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        router.push("/login");
        return;
      }

      // Store user profile data
      setUserProfile({
        full_name: profile.full_name || "Unknown User",
        role: profile.role,
      });

      // Role validation is now handled by middleware, but keep as fallback
      if (profile.role !== "cashier" && profile.role !== "admin") {
        toast.error("Akses ditolak: Hanya cashier yang dapat mengakses POS");
        router.push("/auth/unauthorized");
        return;
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      router.push("/login");
    }
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
        min_stock: 0,
        max_stock: null,
        barcode: "",
        image_url: null,
        is_active: true,
        is_consignment: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[Manual Entry] Adding product:", manualProductData);
      console.log("[Manual Entry] Quantity:", quantity);

      // Add to cart using cart store
      addItem(manualProductData, quantity);

      toast.success(`Added ${quantity}x ${manualProduct.name} to cart`);

      // Reset form and close modal
      setManualProduct({ name: "", price: "", quantity: "1" });
      setShowManualEntry(false);
    } catch (error) {
      console.error("[Manual Entry] Error:", error);
      toast.error(
        `Failed to add manual product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Fetch products for selection
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      // Fetch products with variants
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          ),
          product_variants (*)
        `)
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;

      // Fetch variants separately to avoid RLS issues
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("is_active", true);

      if (variantsError) {
        console.error("[product_variant] Error fetching variants:", variantsError);
        throw variantsError;
      }

      console.log("[product_variant] Fetched variants:", {
        count: variantsData?.length || 0,
        variants: variantsData?.map((v: ProductVariant) => ({
          id: v.id,
          product_id: v.product_id,
          variant_name: v.variant_name,
          barcode: v.barcode,
          price: v.price,
          cost_price: v.cost_price,
          conversion_qty: v.conversion_qty
        }))
      });

      // Attach variants to products
      const productsWithVariants = (productsData || []).map((product: Product) => {
        const productVariants = (variantsData || []).filter((v: ProductVariant) => v.product_id === product.id);
        console.log(`[product_variant] Product ${product.name} (${product.id}) has ${productVariants.length} variants:`, 
          productVariants.map((v: ProductVariant) => ({
            id: v.id,
            variant_name: v.variant_name,
            barcode: v.barcode,
            price: v.price,
            cost_price: v.cost_price,
            conversion_qty: v.conversion_qty,
            min_qty: v.min_qty
          }))
        );
        return {
          ...product,
          variants: productVariants
        };
      });

      // Apply category filter
      let filteredProducts = productsWithVariants;
      if (selectedCategory !== "all") {
        filteredProducts = filteredProducts.filter(p => p.category_id === selectedCategory);
      }

      // Apply search filter
      if (productSearch) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.variants && p.variants.some((v: ProductVariant) => v.variant_name.toLowerCase().includes(productSearch.toLowerCase())))
        );
      }

      const products = filteredProducts.map((p: any) => ({
        ...p,
        category_id: p.category_id || null,
        unit_id: p.unit_id || null,
        supplier_id: p.supplier_id || null,
        description: p.description || null,
        cost_price: p.cost_price || 0,
        min_stock: p.min_stock || 0,
        max_stock: p.max_stock || null,
        is_consignment: p.is_consignment || false,
      } as Product));

      setProducts(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
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
    addItem(product, 1, selectedVariant || null);
    const itemName = selectedVariant ? `${product.name} - ${selectedVariant.variant_name}` : product.name;
    toast.success(`Added ${itemName} to cart`);
    setShowProductSelection(false);
  };

  // Handle variant selection
  const handleVariantSelection = (product: Product & { variants?: ProductVariant[] }, variant: ProductVariant) => {
    console.log("[product_variant] Variant selected:", {
      product_id: product.id,
      product_name: product.name,
      variant_id: variant.id,
      variant_name: variant.variant_name,
      barcode: variant.barcode,
      price: variant.price,
      conversion_qty: variant.conversion_qty,
      min_qty: variant.min_qty,
      quantity: variantQuantity
    });
    addItem(product, variantQuantity, variant);
    toast.success(`Added ${variantQuantity}x ${product.name} - ${variant.variant_name} to cart`);
    setShowVariantSelection(false);
    setShowProductSelection(false);
    setSelectedProductForVariants(null);
    setVariantQuantity(1);
  };

  // Handle camera barcode detection
  const handleCameraBarcodeDetected = async (barcode: string) => {
    console.log("[product_variant] Barcode detected:", { barcode });
    try {
      // First try to find variant by barcode
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("*, product:products(*)")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single() as { data: ProductVariant & { product: Product } | null, error: any };

      if (variantError) {
        console.log("[product_variant] No variant found for barcode, trying main product");
      }

      if (variant && variant.product) {
        console.log("[product_variant] Found variant by barcode:", {
          variant_id: variant.id,
          variant_name: variant.variant_name,
          product_name: variant.product.name,
          price: variant.price,
          conversion_qty: variant.conversion_qty,
          min_qty: variant.min_qty
        });
        // Found variant, add to cart
        const productStock = variant.product.stock || 0
        if (productStock <= 0) {
          console.log("[product_variant] Product out of stock:", { variant_name: variant.variant_name, stock: productStock });
          toast.error(`Product "${variant.product.name}" is out of stock`);
          return;
        }
        
        addItem(variant.product, 1, variant);
        toast.success(`Added ${variant.product.name} - ${variant.variant_name} to cart`);
        setShowCameraScanner(false);
        return;
      }

      // If not found in variants, try products table
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
          console.error("Database error:", error);
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

      // Add product to cart
      addItem(product, 1);
      toast.success(`Added ${product.name} to cart`);
      
      // Close camera scanner after successful scan
      setShowCameraScanner(false);
    } catch (error) {
      console.error("Barcode detection error:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Fetch transaction history
  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*, items:transaction_items(*)")
        .eq("cashier_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Generate end of day report
  const generateReport = async (date?: string) => {
    setLoadingReport(true);
    try {
      const reportDate = date || reportData.date;
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return;
      }

      // Type for transaction with joined items
      type TransactionWithItems =
        Database["public"]["Tables"]["transactions"]["Row"] & {
          items: Database["public"]["Tables"]["transaction_items"]["Row"][];
        };

      // Fetch transactions for the selected date
      const { data: dayTransactions, error } = await supabase
        .from("transactions")
        .select("*, items:transaction_items(*)")
        .eq("cashier_id", session.user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .eq("payment_status", "paid");

      if (error) throw error;

      const transactions = (dayTransactions || []) as TransactionWithItems[];
      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalItems = transactions.reduce(
        (sum, t) => sum + (t.items?.length || 0),
        0,
      );

      setReportData({
        totalSales,
        totalTransactions: transactions.length,
        totalItems,
        date: reportDate,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(false);
    }
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
                Point of Sale System • {userProfile?.full_name || 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1 border-primary-brand text-primary-brand">
                {userProfile?.role || 'Cashier'}
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
                  onClick={() => setShowCameraScanner(true)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera Scanner
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={() => {
                    setShowProductSelection(true);
                    fetchProducts();
                  }}
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
                  onClick={() => {
                    setShowTransactionHistory(true);
                    fetchTransactions();
                  }}
                >
                  <History className="h-4 w-4 mr-2" />
                  View Transaction History
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start pos-action-button hover:scale-[1.02]"
                  onClick={() => {
                    setShowEndOfDayReport(true);
                    generateReport();
                  }}
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

      {/* Manual Product Entry Modal */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-[425px] pos-modal-content">
          <DialogHeader className="pos-modal-header">
            <DialogTitle className="pos-modal-title">
              <Package className="h-5 w-5" />
              Manual Product Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pos-modal-body">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="pos-form-label">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Enter product name"
                value={manualProduct.name}
                onChange={(e) =>
                  setManualProduct({ ...manualProduct, name: e.target.value })
                }
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price" className="pos-form-label">Price (IDR)</Label>
              <Input
                id="product-price"
                type="number"
                placeholder="Enter price"
                value={manualProduct.price}
                onChange={(e) =>
                  setManualProduct({ ...manualProduct, price: e.target.value })
                }
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-quantity" className="pos-form-label">Quantity</Label>
              <Input
                id="product-quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={manualProduct.quantity}
                onChange={(e) =>
                  setManualProduct({
                    ...manualProduct,
                    quantity: e.target.value,
                  })
                }
                className="pos-form-input"
              />
            </div>
          </div>
          <DialogFooter className="pos-modal-footer">
            <Button className="pos-button-secondary" onClick={() => setShowManualEntry(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              className="pos-button-primary"
              onClick={handleAddManualProduct}
              disabled={!manualProduct.name || !manualProduct.price}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Modal */}
      <Dialog
        open={showProductSelection}
        onOpenChange={setShowProductSelection}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col pos-modal-content">
          <DialogHeader className="pos-modal-header">
            <DialogTitle className="pos-modal-title">
              <Grid3x3 className="h-5 w-5" />
              Select Product
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col pos-modal-body">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pos-search-input"
              />
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-2">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <div className="pos-loading-spinner mx-auto"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading products...
                    </p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pos-product-grid">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="pos-product-card"
                      onClick={() => handleProductSelection(product)}
                    >
                      <div className="pos-product-image">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="pos-product-info">
                        <h3 className="pos-product-name">
                          {product.name}
                        </h3>
                        {product.variants && product.variants.length > 0 ? (
                          <>
                            <p className="pos-product-price">
                              Rp {Math.min(...product.variants.map(v => v.price)).toLocaleString("id-ID")} - 
                              Rp {Math.max(...product.variants.map(v => v.price)).toLocaleString("id-ID")}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="pos-product-stock">
                                {product.variants.length} variants
                              </p>
                              {product.categories && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1 py-0.5"
                                >
                                  {product.categories.name.length > 8 ? product.categories.name.slice(0, 8) + '.' : product.categories.name}
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="pos-product-price">
                              Rp {product.price.toLocaleString("id-ID")}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="pos-product-stock">
                                Stock: {product.stock}
                              </p>
                              {product.categories && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1 py-0.5"
                                >
                                  {product.categories.name.length > 8 ? product.categories.name.slice(0, 8) + '.' : product.categories.name}
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pos-modal-footer">
            <Button
              className="pos-button-secondary"
              onClick={() => setShowProductSelection(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction History Modal */}
      <Dialog
        open={showTransactionHistory}
        onOpenChange={setShowTransactionHistory}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto pos-modal-content">
          <DialogHeader className="pos-modal-header">
            <DialogTitle className="pos-modal-title">
              <History className="h-5 w-5" />
              Transaction History
            </DialogTitle>
          </DialogHeader>
          <div className="pos-modal-body">
            {loadingTransactions ? (
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
                  <div key={transaction.id} className="pos-transaction-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-primary">
                          Transaction #{transaction.id.slice(-6)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString(
                            "id-ID",
                          )}
                        </p>
                        <Badge
                          variant={
                            transaction.payment_status === "paid"
                              ? "default"
                              : "secondary"
                          }
                          className="mt-2"
                        >
                          {transaction.payment_status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          Rp {transaction.total.toLocaleString("id-ID")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="pos-modal-footer">
            <Button
              className="pos-button-secondary"
              onClick={() => setShowTransactionHistory(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Day Report Modal */}
      <Dialog open={showEndOfDayReport} onOpenChange={setShowEndOfDayReport}>
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
                onChange={(e) => {
                  setReportData({ ...reportData, date: e.target.value });
                  generateReport(e.target.value);
                }}
                className="pos-form-input"
              />
            </div>

            {loadingReport ? (
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
                    Rp {reportData.totalSales.toLocaleString("id-ID")}
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
                    Rp{" "}
                    {reportData.totalTransactions > 0
                      ? Math.round(
                          reportData.totalSales /
                            reportData.totalTransactions,
                        ).toLocaleString("id-ID")
                      : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pos-modal-footer">
            <Button
              className="pos-button-secondary"
              onClick={() => setShowEndOfDayReport(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button
              className="pos-button-primary"
              onClick={() => {
                toast.success("Report printed successfully");
                setShowEndOfDayReport(false);
              }}
              disabled={loadingReport}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Modal */}
      <Dialog open={showVariantSelection} onOpenChange={setShowVariantSelection}>
        <DialogContent className="sm:max-w-[500px] pos-modal-content">
          <DialogHeader className="pos-modal-header">
            <DialogTitle className="pos-modal-title">
              <Grid3x3 className="h-5 w-5" />
              Select Variant - {selectedProductForVariants?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="pos-modal-body">
            {/* Quantity Selector */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <Label className="pos-form-label mb-2 block">Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                  disabled={variantQuantity <= 1}
                  className="h-8 w-8 p-0"
                >
                  -
                </Button>
                <div className="w-16 text-center">
                  <span className="font-medium text-lg">{variantQuantity}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVariantQuantity(variantQuantity + 1)}
                  className="h-8 w-8 p-0"
                >
                  +
                </Button>
              </div>
            </div>

            {selectedProductForVariants?.variants && selectedProductForVariants.variants.length > 0 ? (
              <div className="space-y-3">
                {selectedProductForVariants.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`pos-variant-card cursor-pointer transition-all p-4 rounded-lg border ${
                      (variant.product?.stock || 0) <= 0 
                        ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                        : 'hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02]'
                    }`}
                    onClick={() => (variant.product?.stock || 0) > 0 && handleVariantSelection(selectedProductForVariants, variant)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center border ${
                          (variant.product?.stock || 0) <= 0 ? 'bg-red-50 border-red-200' : 'bg-muted'
                        }`}>
                          <Package className={`h-5 w-5 ${
                            (variant.product?.stock || 0) <= 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <h4 className={`font-medium ${
                            (variant.product?.stock || 0) <= 0 ? 'text-muted-foreground' : ''
                          }`}>{variant.variant_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {variant.barcode ? `Barcode: ${variant.barcode}` : 'No barcode'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          (variant.product?.stock || 0) <= 0 ? 'text-muted-foreground line-through' : 'text-primary-brand'
                        }`}>
                          Rp {variant.price.toLocaleString("id-ID")}
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <p className={`text-xs ${
                            (variant.product?.stock || 0) <= 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'
                          }`}>
                            {(variant.product?.stock || 0) <= 0 ? 'Out of Stock' : `Stock: ${variant.product?.stock}`}
                          </p>
                          {variant.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No variants available</p>
              </div>
            )}
          </div>
          <DialogFooter className="pos-modal-footer">
            <Button
              className="pos-button-secondary"
              onClick={() => {
                setShowVariantSelection(false);
                setSelectedProductForVariants(null);
                setVariantQuantity(1);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner Modal */}
      <CameraScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onBarcodeDetected={handleCameraBarcodeDetected}
      />
    </div>
  );
}
