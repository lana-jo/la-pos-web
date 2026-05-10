import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: any | null;
  products: any[];
  onSelectProduct: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  movementType: 'in' | 'out';
  onMovementTypeChange: (type: 'in' | 'out') => void;
  quantity: string;
  onQuantityChange: (q: string) => void;
  notes: string;
  onNotesChange: (n: string) => void;
}

export function StockMovementModal({ 
  isOpen, onClose, selectedProduct, products, onSelectProduct, onSubmit, isSubmitting,
  movementType, onMovementTypeChange, quantity, onQuantityChange, notes, onNotesChange
}: StockMovementModalProps) {
  if (!isOpen) return null;
  
  return (
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
              onValueChange={onSelectProduct}
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
            <Select value={movementType} onValueChange={(value: 'in' | 'out') => onMovementTypeChange(value)}>
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
              onChange={(e) => onQuantityChange(e.target.value)}
              min="1"
            />
          </div>
          
          <div>
            <Label>Notes (Optional)</Label>
            <Input
              placeholder="Reason for stock movement"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (movementType === 'in' ? 'Add Stock' : 'Remove Stock')}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
