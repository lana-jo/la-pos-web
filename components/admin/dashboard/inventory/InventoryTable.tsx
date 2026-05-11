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
    
    if (currentStock === 0) return { color: "bg-destructive", text: "Out of Stock", icon: AlertTriangle };
    if (currentStock <= threshold) return { color: "bg-yellow-500", text: "Low Stock", icon: AlertTriangle };
    return { color: "bg-primary-brand", text: "In Stock", icon: Package };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-4 font-bold text-muted-foreground uppercase">Product</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Category</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Barcode</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Stock</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-right">Price</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Status</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                No products found matching your criteria.
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const status = getStockStatus(product);
              const StatusIcon = status.icon;
              const currentStock = product.track_stock ? product.cached_stock : product.stock;
              return (
                <tr key={product.id} className="hover:bg-background/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{product.name}</div>
                    {!product.track_stock && (
                      <div className="text-xs text-orange-500 font-medium">Tracking Disabled</div>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">{product.category_name}</td>
                  <td className="p-4 font-mono text-muted-foreground">{product.barcode}</td>
                  <td className="p-4 text-center font-bold text-foreground">
                    {currentStock}
                  </td>
                  <td className="p-4 text-right font-black text-primary-brand">
                    Rp {product.price.toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant="outline" className={`${status.color} text-white border-none`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.text}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary-brand hover:bg-primary-brand/10"
                        onClick={() => onAdjust(product)}
                      >
                        Update
                      </Button>
                    </div>
                  </td>
                  </tr>
                  );
                  })
                  )}
                  </tbody>
                  </table>
                  </div>
                  );
                  }
