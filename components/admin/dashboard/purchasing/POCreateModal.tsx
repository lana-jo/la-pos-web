"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, Loader2 } from "lucide-react";
import { fetchSuppliers } from "@/lib/suppliers/actions";
import { fetchProductsWithVariants } from "@/lib/products/actions";
import { createPurchaseOrder } from "@/lib/purchasing/actions";
import { toast } from "sonner";
import { Supplier, Product, ProductVariant } from "@/types";

interface POCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  ordered_qty: number;
  unit_cost: number;
}

export function POCreateModal({ isOpen, onClose, userId }: POCreateModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    const [supResult, prodResult] = await Promise.all([
      fetchSuppliers(),
      fetchProductsWithVariants()
    ]);

    if (supResult.success) setSuppliers(supResult.data);
    setProducts(prodResult as Product[]);
    setLoading(false);
  };

  const addToCart = (product: Product, variant?: ProductVariant) => {
    const existing = cart.find(item => 
      item.product.id === product.id && 
      (!variant || item.variant?.id === variant.id)
    );

    if (existing) {
      setCart(cart.map(item => 
        (item.product.id === product.id && (!variant || item.variant?.id === variant.id))
          ? { ...item, ordered_qty: item.ordered_qty + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        variant,
        ordered_qty: 1,
        unit_cost: variant?.cost_price || product.cost_price || 0
      }]);
    }
    setSearchTerm("");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, field: "ordered_qty" | "unit_cost", value: number) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value };
    setCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.ordered_qty * item.unit_cost), 0);
  };

  const handleSubmit = async () => {
    if (!selectedSupplierId) return toast.error("Pilih supplier terlebih dahulu");
    if (cart.length === 0) return toast.error("Keranjang kosong");

    setSubmitting(true);
    const poPayload = {
      supplier_id: selectedSupplierId,
      ordered_by: userId,
      status: "ordered" as const,
      total_amount: calculateTotal(),
      notes: notes,
      ordered_at: new Date().toISOString()
    };

    const itemsPayload = cart.map(item => ({
      product_id: item.product.id,
      variant_id: item.variant?.id || null,
      product_name: item.variant ? `${item.product.name} (${item.variant.variant_name})` : item.product.name,
      ordered_qty: item.ordered_qty,
      unit_cost: item.unit_cost
    }));

    const result = await createPurchaseOrder(poPayload as any, itemsPayload);

    if (result.success) {
      toast.success("Purchase Order berhasil dibuat");
      setCart([]);
      setSelectedSupplierId("");
      setNotes("");
      onClose();
    } else {
      toast.error("Gagal membuat PO: " + result.error);
    }
    setSubmitting(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  ).slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Purchase Order Baru</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <Label>Cari Produk</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ketik nama atau barcode..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                      <div key={p.id} className="p-2 hover:bg-muted cursor-pointer flex flex-col gap-1 border-b last:border-0">
                        <div className="flex justify-between items-center" onClick={() => addToCart(p)}>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Produk Utama</span>
                        </div>
                        {p.variants && p.variants.length > 0 && (
                          <div className="pl-4 mt-1 space-y-1">
                            {p.variants.map(v => (
                              <div 
                                key={v.id} 
                                className="text-sm p-1 hover:bg-primary/5 rounded flex justify-between"
                                onClick={(e) => { e.stopPropagation(); addToCart(p, v); }}
                              >
                                <span>- {v.variant_name}</span>
                                <Plus className="h-3 w-3" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">Produk tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Tambahkan catatan PO..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md flex flex-col h-full min-h-[300px]">
            <div className="p-3 border-b bg-muted/50 font-semibold">Keranjang PO</div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-32">Harga Beli</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, index) => (
                    <TableRow key={`${item.product.id}-${item.variant?.id || 'base'}`}>
                      <TableCell className="text-sm py-2">
                        <p className="font-medium leading-none">{item.product.name}</p>
                        {item.variant && <p className="text-xs text-muted-foreground mt-1">{item.variant.variant_name}</p>}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" 
                          className="h-8 px-1" 
                          value={item.ordered_qty} 
                          onChange={(e) => updateCartItem(index, "ordered_qty", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" 
                          className="h-8 px-1" 
                          value={item.unit_cost} 
                          onChange={(e) => updateCartItem(index, "unit_cost", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Keranjang kosong</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t bg-muted/20">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Estimasi:</span>
                <span className="text-primary">Rp {calculateTotal().toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Batal</Button>
          <Button onClick={handleSubmit} disabled={submitting || cart.length === 0 || !selectedSupplierId}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan & Kirim PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
