"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, RefreshCw, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface LowStockProduct {
  id: string;
  name: string;
  barcode: string;
  cached_stock: number;
  low_stock_threshold: number;
  stock: number;
  track_stock: boolean;
  price: number;
  category_name: string;
  supplier_name?: string;
  updated_at: string;
}

export function LowStockAlerts() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchLowStockProducts();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchLowStockProducts, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchLowStockProducts = async () => {
    try {
      const response = await fetch('/api/products/low-stock');
      if (!response.ok) throw new Error('Failed to fetch low stock products');
      const data = await response.json();
      setLowStockProducts(data);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      toast.error('Error loading low stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: LowStockProduct) => {
    const currentStock = product.cached_stock ?? 0;
    const threshold = product.low_stock_threshold || 5;
    
    if (currentStock === 0) {
      return {
        color: "bg-red-500",
        text: "Out of Stock",
        icon: AlertTriangle,
        urgency: "critical"
      };
    }
    
    if (currentStock <= threshold) {
      return {
        color: "bg-yellow-500",
        text: "Low Stock",
        icon: TrendingDown,
        urgency: "warning"
      };
    }
    
    return {
      color: "bg-green-500",
      text: "In Stock",
      icon: Package,
      urgency: "normal"
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const criticalProducts = lowStockProducts.filter(p => {
    const currentStock = p.cached_stock ?? 0;
    return currentStock === 0;
  });

  const warningProducts = lowStockProducts.filter(p => {
    const currentStock = p.cached_stock ?? 0;
    const threshold = p.low_stock_threshold || 5;
    return currentStock > 0 && currentStock <= threshold;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
          <p className="text-muted-foreground">Monitor products that need restocking</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchLowStockProducts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Critical (Out of Stock)</p>
                <p className="text-2xl font-bold text-red-700">{criticalProducts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Warning (Low Stock)</p>
                <p className="text-2xl font-bold text-yellow-700">{warningProducts.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Alerts</p>
                <p className="text-2xl font-bold text-blue-700">{lowStockProducts.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Products */}
      {criticalProducts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b border-red-200">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical: Out of Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-red-100">
              {criticalProducts.map((product) => {
                const status = getStockStatus(product);
                const StatusIcon = status.icon;
                const currentStock = product.cached_stock ?? 0;
                
                return (
                  <div key={product.id} className="p-4 hover:bg-red-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                          <div>
                            <h3 className="font-semibold text-red-900">{product.name}</h3>
                            <p className="text-sm text-red-700">
                              Category: {product.category_name} • Barcode: {product.barcode}
                            </p>
                            {product.supplier_name && (
                              <p className="text-sm text-red-600">Supplier: {product.supplier_name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-700">{currentStock}</p>
                        <p className="text-sm text-red-600">units</p>
                        <p className="text-sm font-medium text-red-800">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Restock
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Products */}
      {warningProducts.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="bg-yellow-50 border-b border-yellow-200">
            <CardTitle className="text-yellow-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Warning: Low Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-yellow-100">
              {warningProducts.map((product) => {
                const status = getStockStatus(product);
                const StatusIcon = status.icon;
                const currentStock = product.cached_stock ?? 0;
                const threshold = product.low_stock_threshold || 5;
                
                return (
                  <div key={product.id} className="p-4 hover:bg-yellow-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                          <div>
                            <h3 className="font-semibold text-yellow-900">{product.name}</h3>
                            <p className="text-sm text-yellow-700">
                              Category: {product.category_name} • Barcode: {product.barcode}
                            </p>
                            <p className="text-sm text-yellow-600">
                              Threshold: {threshold} units • Current: {currentStock} units
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-700">{currentStock}</p>
                        <p className="text-sm text-yellow-600">of {threshold}</p>
                        <p className="text-sm font-medium text-yellow-800">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" className="border-yellow-200 text-yellow-700 hover:bg-yellow-50">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Restock
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Alerts */}
      {lowStockProducts.length === 0 && !loading && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">All Stock Levels Healthy</h3>
            <p className="text-green-600">
              No products are currently below their stock thresholds. Great job managing inventory!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading stock alerts...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
