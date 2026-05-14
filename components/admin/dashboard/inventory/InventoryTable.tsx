import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle } from "lucide-react";
import { Barcode } from "@/components/ui/Barcode";

interface InventoryTableProps {
  products: any[];
  onAdjust: (product: any) => void;
}

export function InventoryTable({ products, onAdjust }: InventoryTableProps) {
  const getStockStatus = (product: any) => {
    const currentStock = product.cached_stock ?? 0;
    const threshold = product.low_stock_threshold || 5;
    
    if (currentStock === 0) return { color: "bg-destructive", text: "Stok Habis", icon: AlertTriangle };
    if (currentStock <= threshold) return { color: "bg-yellow-500", text: "Stok Rendah", icon: AlertTriangle };
    return { color: "bg-primary-brand", text: "Tersedia", icon: Package };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-4 font-bold text-muted-foreground uppercase">Produk</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Kategori</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Barcode</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Stok</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-right">Harga</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Status</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                Tidak ada produk ditemukan sesuai kriteria Anda.
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              const totalStock = product.cached_stock ?? 0;
              
              const status = getStockStatus(product);
              const StatusIcon = status.icon;
              
              return (
                <tr key={product.id} className="hover:bg-background/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-foreground">
                      {product.name}
                      {hasVariants && (
                        <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">
                          {product.variants.length} Varian
                        </Badge>
                      )}
                    </div>
                    {!product.track_stock && (
                      <div className="text-xs text-orange-500 font-medium">Pelacakan Dinonaktifkan</div>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">{product.category_name === 'UNCATEGORIZED' ? 'BELUM DI KATEGORIKAN' : product.category_name}</td>
                  <td className="p-4"><Barcode value={product.barcode} /></td>
                  <td className="p-4 text-center font-bold text-foreground">
                    {totalStock}
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
