import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle } from "lucide-react";

interface InventoryTableProps {
  products: any[];
  onAdjust: (product: any) => void;
}

export function InventoryTable({ products, onAdjust }: InventoryTableProps) {
  const getStockStatus = (product: any) => {
    const currentStock = product.track_stock ? product.cached_stock : product.stock;
    const threshold = product.low_stock_threshold || 5;
    
    if (currentStock === 0) return { color: "bg-red-500", text: "Out of Stock", icon: AlertTriangle };
    if (currentStock <= threshold) return { color: "bg-yellow-500", text: "Low Stock", icon: AlertTriangle };
    return { color: "bg-green-500", text: "In Stock", icon: Package };
  };

  return (
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
          {products.map((product) => {
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
                    onClick={() => onAdjust(product)}
                  >
                    Update
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
