"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, AlertTriangle, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { InventoryTable } from "@/components/admin/dashboard/inventory/InventoryTable";
import { StockMovementModal } from "@/components/admin/dashboard/inventory/StockMovementModal";
import { RecentActivityList } from "@/components/admin/dashboard/inventory/RecentActivityList";

// Types retained here as they are domain-specific for the page logic
interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  cached_stock: number;
  price: number;
  category_name: string;
  track_stock: boolean;
  low_stock_threshold: number;
  is_active: boolean;
  updated_at: string;
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Gagal memuat produk');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/stock/movements');
      if (!response.ok) throw new Error('Gagal memuat pergerakan');
      const data = await response.json();
      setMovements(data);
    } catch (error) {
      console.error('Gagal memuat pergerakan:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    // Pastikan hanya produk aktif yang ditampilkan
    if (!product.is_active) return false;

    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === "all" || product.category_name === selectedCategory;
    
    let matchesStock = true;
    const currentStock = product.track_stock ? product.cached_stock : product.stock;
    const threshold = product.low_stock_threshold || 5;
    
    if (stockFilter === "low") matchesStock = currentStock <= threshold && currentStock > 0;
    else if (stockFilter === "out") matchesStock = currentStock === 0;
    else if (stockFilter === "available") matchesStock = currentStock > 0;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleStockMovement = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      toast.error('Harap isi semua kolom yang diperlukan');
      return;
    }

    setIsSubmitting(true);
    try {
      const movementTypeMap = movementType === 'in' ? 'purchase' : 'adjustment';
      
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          product_variant_id: selectedVariantId || undefined,
          movement_type: movementTypeMap,
          qty_change: movementType === 'in' ? parseInt(quantity) : -parseInt(quantity),
          unit_cost: 0,
          notes: notes || `Manual ${movementTypeMap}${selectedVariantId ? ' (Varian)' : ''}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Gagal mencatat pergerakan';
        throw new Error(errorMessage);
      }
      
      toast.success(`Stok berhasil ${movementType === 'in' ? 'ditambahkan' : 'dikurangi'}`);
      setShowMovementModal(false);
      setSelectedProduct(null);
      setSelectedVariantId("");
      setQuantity("");
      setNotes("");
      fetchProducts();
      fetchMovements();
    } catch (error) {
      console.error('Error pergerakan stok:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui stok';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [...new Set(products.map(p => p.category_name))];

  return (
    <div className="min-h-screen pos-terminal p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Stok</h1>
          <p className="text-muted-foreground">Monitor dan kelola tingkat inventaris produk</p>
        </div>
        <Button onClick={() => { setShowMovementModal(true); }} className="pos-button-primary shadow-lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Stok
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Total Produk</p>
                <p className="text-2xl font-black text-foreground mt-1">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary-brand" />
            </div>
        </Card>
        
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Stok Rendah</p>
                <p className="text-2xl font-black text-yellow-600 mt-1">
                  {products.filter(p => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    const threshold = p.low_stock_threshold || 5;
                    return stock > 0 && stock <= threshold;
                  }).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
        </Card>
        
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Stok Habis</p>
                <p className="text-2xl font-black text-destructive mt-1">
                  {products.filter(p => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    return stock === 0;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
        </Card>
        
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Total Nilai Stok</p>
                <p className="text-2xl font-black text-primary-brand mt-1">
                  Rp {products.reduce((sum, p) => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    return sum + (stock * p.price);
                  }, 0).toLocaleString('id-ID')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-brand" />
            </div>
        </Card>
      </div>

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pos-form-input"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="pos-form-input">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="pos-form-input">
                <SelectValue placeholder="Status Stok" />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                <SelectItem value="all">Semua Stok</SelectItem>
                <SelectItem value="available">Tersedia</SelectItem>
                <SelectItem value="low">Stok Rendah (≤10)</SelectItem>
                <SelectItem value="out">Stok Habis</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setStockFilter("all");
            }} className="border-primary-brand text-primary-brand">
              Hapus Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle>Inventaris Produk</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="pos-loading-spinner mx-auto" />
            </div>
          ) : (
            <InventoryTable 
                products={filteredProducts} 
                onAdjust={(p) => { setSelectedProduct(p); setShowMovementModal(true); }}
            />
          )}
        </CardContent>
      </Card>

      <StockMovementModal 
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        selectedProduct={selectedProduct}
        products={products}
        onSelectProduct={(id) => {
          setSelectedProduct(products.find(p => p.id === id) || null);
          setSelectedVariantId("");
        }}
        onSubmit={handleStockMovement}
        isSubmitting={isSubmitting}
        movementType={movementType}
        onMovementTypeChange={setMovementType}
        quantity={quantity}
        onQuantityChange={setQuantity}
        notes={notes}
        onNotesChange={setNotes}
        selectedVariantId={selectedVariantId}
        onSelectVariant={setSelectedVariantId}
      />

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle>Pergerakan Stok Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList movements={movements} />
        </CardContent>
      </Card>
    </div>
  );
}
