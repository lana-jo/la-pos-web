import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecentActivityListProps {
  movements: any[];
}

export function RecentActivityList({ movements }: RecentActivityListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-4 font-bold text-muted-foreground uppercase">Date</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Product</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Type</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Change</th>
            <th className="p-4 font-bold text-muted-foreground uppercase text-center">Stock</th>
            <th className="p-4 font-bold text-muted-foreground uppercase">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {movements.slice(0, 10).map((m) => (
            <tr key={m.id} className="hover:bg-background/50 transition-colors">
              <td className="p-4 text-muted-foreground whitespace-nowrap">
                {new Date(m.created_at).toLocaleDateString('id-ID')}
              </td>
              <td className="p-4">
                <div className="font-semibold text-foreground">
                  {m.products?.name || 'Unknown'}
                  {m.product_variants?.variant_name && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {m.product_variants.variant_name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{m.products?.barcode}</div>
              </td>
              <td className="p-4">
                <Badge variant={m.qty_change > 0 ? "default" : "destructive"} className="uppercase text-[10px]">
                  {m.movement_type.replace('_', ' ')}
                </Badge>
              </td>
              <td className="p-4 text-center font-black">
                <span className={m.qty_change > 0 ? 'text-primary-brand' : 'text-destructive'}>
                  {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                </span>
              </td>
              <td className="p-4 text-center text-foreground font-medium">
                {m.qty_before} → {m.qty_after}
              </td>
              <td className="p-4 text-muted-foreground italic text-xs">
                {m.notes || '-'}
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
    </div>
  );
}
