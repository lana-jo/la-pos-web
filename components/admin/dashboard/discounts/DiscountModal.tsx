"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Database } from "@/types";

type Discount = Database["public"]["Tables"]["discounts"]["Row"];

interface DiscountModalProps {
  discount: Discount | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function DiscountModal({
  discount,
  isOpen,
  onClose,
  onSubmit
}: DiscountModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    value: 0,
    min_purchase: 0,
    max_discount: null as number | null,
    max_usage: null as number | null,
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (discount) {
      setFormData({
        name: discount.name,
        code: discount.code || "",
        discount_type: discount.discount_type as "percentage" | "fixed",
        value: discount.value,
        min_purchase: discount.min_purchase,
        max_discount: discount.max_discount,
        max_usage: discount.max_usage,
        is_active: discount.is_active
      });
    } else {
      setFormData({
        name: "",
        code: "",
        discount_type: "percentage",
        value: 0,
        min_purchase: 0,
        max_discount: null,
        max_usage: null,
        is_active: true
      });
    }
  }, [discount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Diskon" : "Tambah Diskon Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Diskon</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Kode Promo (Opsional)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipe Diskon</Label>
              <Select 
                value={formData.discount_type} 
                onValueChange={(v: "percentage" | "fixed") => setFormData({ ...formData, discount_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Nilai Diskon</Label>
              <Input
                id="value"
                type="number"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min">Min. Pembelian</Label>
              <Input
                id="min"
                type="number"
                value={formData.min_purchase}
                onChange={(e) => setFormData({ ...formData, min_purchase: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_d">Maks. Potongan (Opsional)</Label>
              <Input
                id="max_d"
                type="number"
                value={formData.max_discount || ""}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage">Maks. Penggunaan (Opsional)</Label>
              <Input
                id="usage"
                type="number"
                value={formData.max_usage || ""}
                onChange={(e) => setFormData({ ...formData, max_usage: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="active">Status Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
