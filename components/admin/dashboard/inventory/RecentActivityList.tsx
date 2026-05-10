import { Button } from "@/components/ui/button";

interface RecentActivityListProps {
  movements: any[];
}

export function RecentActivityList({ movements }: RecentActivityListProps) {
  return (
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
  );
}
