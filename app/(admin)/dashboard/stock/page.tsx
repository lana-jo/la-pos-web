"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

interface StockMovement {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void';
  
  reference_id: string | null;
  // [DIUBAH] Strict typing agar tidak ada typo saat query/insert
  reference_type: 'transaction' | 'purchase_order' | 'refund' | 'manual' | null; 
  
  qty_before: number;
  qty_change: number;
  qty_after: number;
  
  // [DITAMBAHKAN] Nilai uang dari barang pada saat pergerakan terjadi
  unit_cost: number; 
  
  notes: string | null;
  
  // [DIUBAH] Diperketat. Setiap pergerakan wajib ada aktornya.
  created_by: string; 
  created_at: string;
  
  // Relasi Join Supabase
  products?: {
    name: string;
    barcode: string;
  };
  // [DITAMBAHKAN] Detail varian jika pergerakan terjadi pada level SKU varian
  product_variants?: {
    name: string;
    barcode: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface ErrorLog {
  id: string;
  product_id: string;
  product_name: string;
  error_type: string;
  error_message: string;
  attempted_quantity: number;
  attempted_type: string;
  created_at: string;
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
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

  const getStockStatus = (product: Product) => {
    const currentStock = product.track_stock ? product.cached_stock : product.stock;
    const threshold = product.low_stock_threshold || 5;
    
    if (currentStock === 0) return { color: "bg-red-500", text: "Out of Stock", icon: AlertTriangle };
    if (currentStock <= threshold) return { color: "bg-yellow-500", text: "Low Stock", icon: AlertTriangle };
    return { color: "bg-green-500", text: "In Stock", icon: Package };
  };

  const handleStockMovement = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

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
        
        // Log error to error logs
        const errorLog = {
          id: Date.now().toString(),
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          error_type: 'API_ERROR',
          error_message: errorMessage,
          attempted_quantity: parseInt(quantity),
          attempted_type: movementTypeMap,
          created_at: new Date().toISOString()
        };
        
        setErrorLogs(prev => [errorLog, ...prev.slice(0, 9)]); // Keep only last 10 errors
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
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
      
      // Also log unexpected errors
      if (!errorMessage.includes('API_ERROR')) {
        const errorLog = {
          id: Date.now().toString(),
          product_id: selectedProduct?.id || 'unknown',
          product_name: selectedProduct?.name || 'Unknown Product',
          error_type: 'UNEXPECTED_ERROR',
          error_message: errorMessage,
          attempted_quantity: parseInt(quantity) || 0,
          attempted_type: movementType,
          created_at: new Date().toISOString()
        };
        
        setErrorLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      }
      
      toast.error(errorMessage);
    }
  };

  const categories = [...new Set(products.map(p => p.category_name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">Monitor and manage product inventory levels</p>
        </div>
        <Button onClick={() => { setShowMovementModal(true); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Stock
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    const threshold = p.low_stock_threshold || 5;
                    return stock > 0 && stock <= threshold;
                  }).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    return stock === 0;
                  }).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold">
                  Rp {products.reduce((sum, p) => {
                    const stock = p.track_stock ? p.cached_stock : p.stock;
                    return sum + (stock * p.price);
                  }, 0).toLocaleString('id-ID')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
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
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
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
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Barcode</th>
                    <th className="text-center p-2">Current Stock</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Total Value</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    const StatusIcon = status.icon;
                    const currentStock = product.track_stock ? product.cached_stock : product.stock;
                    return (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {product.id}</div>
                            {!product.track_stock && (
                              <div className="text-xs text-orange-600">Stock tracking disabled</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{product.category_name}</td>
                        <td className="p-2 font-mono text-sm">{product.barcode}</td>
                        <td className="p-2 text-center">
                          <span className={`font-bold ${currentStock <= (product.low_stock_threshold || 5) ? 'text-yellow-600' : ''}`}>
                            {currentStock}
                          </span>
                        </td>
                        <td className="p-2 text-right">Rp {product.price.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-right">
                          Rp {(currentStock * product.price).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center">
                          <Badge className={`${status.color} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowMovementModal(true);
                            }}
                          >
                            Update
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products found matching your filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Product</Label>
                <Select 
                  value={selectedProduct?.id || ""} 
                  onValueChange={(value) => setSelectedProduct(products.find(p => p.id === value) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Current: {product.track_stock ? product.cached_stock : product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Movement Type</Label>
                <Select value={movementType} onValueChange={(value: 'in' | 'out') => setMovementType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                />
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Reason for stock movement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleStockMovement} className="flex-1">
                  {movementType === 'in' ? 'Add Stock' : 'Remove Stock'}
                </Button>
                <Button variant="outline" onClick={() => setShowMovementModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Movement Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-center p-2">Change</th>
                  <th className="text-center p-2">Before</th>
                  <th className="text-center p-2">After</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 10).map((movement) => (
                  <tr key={movement.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {new Date(movement.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{movement.products?.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {movement.products?.barcode}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        movement.movement_type === 'purchase' || movement.movement_type === 'return_in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.movement_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`font-bold ${
                        movement.qty_change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.qty_change > 0 ? '+' : ''}{movement.qty_change}
                      </span>
                    </td>
                    <td className="p-2 text-center">{movement.qty_before}</td>
                    <td className="p-2 text-center font-medium">{movement.qty_after}</td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {movement.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {movements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No stock movements recorded yet
              </div>
            )}
            
            {movements.length > 10 && (
              <div className="text-center py-4">
                <Button variant="outline" size="sm">
                  View All Movements
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      {errorLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Recent Error Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Error Type</th>
                    <th className="text-left p-2">Message</th>
                    <th className="text-center p-2">Attempted</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-red-50/50">
                      <td className="p-2">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{log.product_name}</div>
                          <div className="text-sm text-muted-foreground">ID: {log.product_id}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.error_type === 'API_ERROR' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {log.error_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-red-600 max-w-xs truncate">
                        {log.error_message}
                      </td>
                      <td className="p-2 text-center">
                        <div className="text-sm">
                          <div className="font-medium">{log.attempted_quantity}</div>
                          <div className="text-muted-foreground">{log.attempted_type}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProduct(products.find(p => p.id === log.product_id) || null);
                            setMovementType(log.attempted_type === 'purchase' || log.attempted_type === 'return_in' ? 'in' : 'out');
                            setQuantity(log.attempted_quantity.toString());
                            setShowMovementModal(true);
                          }}
                        >
                          Retry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
