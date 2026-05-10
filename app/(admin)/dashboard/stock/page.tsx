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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/stock/movements');
      if (!response.ok) throw new Error('Failed to fetch movements');
      const data = await response.json();
      setMovements(data);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === "all" || product.category_name === selectedCategory;
    
    let matchesStock = true;
    const currentStock = product.track_stock ? product.cached_stock : product.stock;
    const threshold = product.low_stock_threshold || 5;
    
    if (stockFilter === "low") matchesStock = currentStock <= threshold && currentStock > 0;
    else if (stockFilter === "out") matchesStock = currentStock === 0;
    else if (stockFilter === "available") matchesStock = currentStock > 0;
    
    return matchesSearch && matchesCategory && matchesStock && product.is_active;
  });

  const handleStockMovement = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      toast.error('Please fill in all required fields');
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
          movement_type: movementTypeMap,
          qty_change: movementType === 'in' ? parseInt(quantity) : -parseInt(quantity),
          unit_cost: 0,
          notes: notes || `Manual ${movementTypeMap}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to record movement';
        throw new Error(errorMessage);
      }
      
      toast.success(`Stock ${movementType === 'in' ? 'added' : 'removed'} successfully`);
      setShowMovementModal(false);
      setSelectedProduct(null);
      setQuantity("");
      setNotes("");
      fetchProducts();
      fetchMovements();
    } catch (error) {
      console.error('Stock movement error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error updating stock';
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
          <h1 className="text-3xl font-bold text-foreground">Stock Management</h1>
          <p className="text-muted-foreground">Monitor and manage product inventory levels</p>
        </div>
        <Button onClick={() => { setShowMovementModal(true); }} className="pos-button-primary shadow-lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Stock
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Total Products</p>
                <p className="text-2xl font-black text-foreground mt-1">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary-brand" />
            </div>
        </Card>
        
        <Card className="pos-modal-content border-none shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase">Low Stock</p>
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
                <p className="text-sm font-bold text-muted-foreground uppercase">Out of Stock</p>
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
                <p className="text-sm font-bold text-muted-foreground uppercase">Total Stock Value</p>
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
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pos-form-input"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="pos-form-input">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="pos-form-input">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="available">In Stock</SelectItem>
                <SelectItem value="low">Low Stock (≤10)</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setStockFilter("all");
            }} className="border-primary-brand text-primary-brand">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
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
        onSelectProduct={(id) => setSelectedProduct(products.find(p => p.id === id) || null)}
        onSubmit={handleStockMovement}
        isSubmitting={isSubmitting}
        movementType={movementType}
        onMovementTypeChange={setMovementType}
        quantity={quantity}
        onQuantityChange={setQuantity}
        notes={notes}
        onNotesChange={setNotes}
      />

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList movements={movements} />
        </CardContent>
      </Card>
    </div>
  );
}
