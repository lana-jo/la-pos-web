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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl p-6 rounded-2xl">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-bold text-foreground">Update Stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <div>
            <Label className="pos-form-label">Product</Label>
            <Select 
              value={selectedProduct?.id || ""} 
              onValueChange={onSelectProduct}
            >
              <SelectTrigger className="pos-form-input">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Current: {product.track_stock ? product.cached_stock : product.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="pos-form-label">Movement Type</Label>
            <Select value={movementType} onValueChange={(value: 'in' | 'out') => onMovementTypeChange(value)}>
              <SelectTrigger className="pos-form-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pos-modal-content">
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="pos-form-label">Quantity</Label>
            <Input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              min="1"
              className="pos-form-input"
            />
          </div>
          
          <div>
            <Label className="pos-form-label">Notes (Optional)</Label>
            <Input
              placeholder="Reason for stock movement"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="pos-form-input"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={onSubmit} className="flex-1 pos-button-primary h-12 shadow-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (movementType === 'in' ? 'Add Stock' : 'Remove Stock')}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 border-border">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
