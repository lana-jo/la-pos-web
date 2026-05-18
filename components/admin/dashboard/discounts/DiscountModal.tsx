"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    is_active: true,
    is_stackable: false,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: null as string | null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (discount) {
      setFormData({
        name: discount.name,
        code: discount.code || "",
        discount_type: discount.discount_type,
        value: discount.value,
        min_purchase: discount.min_purchase,
        max_discount: discount.max_discount,
        max_usage: discount.max_usage,
        is_active: discount.is_active,
        is_stackable: discount.is_stackable,
        valid_from: discount.valid_from.split("T")[0],
        valid_until: discount.valid_until ? discount.valid_until.split("T")[0] : null
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
        is_active: true,
        is_stackable: false,
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: null
      });
    }
  }, [discount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Process numeric fields
    const submissionData = {
      ...formData,
      value: Number(formData.value),
      min_purchase: Number(formData.min_purchase),
      max_discount: formData.max_discount ? Number(formData.max_discount) : null,
      max_usage: formData.max_usage ? Number(formData.max_usage) : null,
      code: formData.code || null,
      valid_until: formData.valid_until || null
    };

    try {
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error("Error submitting discount:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Diskon" : "Tambah Diskon Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Diskon</Label>
            <Input
              id="name"
              required
              placeholder="Misal: Promo Akhir Tahun"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Promo (Opsional)</Label>
              <Input
                id="code"
                placeholder="PROMO2024"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_type">Tipe Potongan</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: "percentage" | "fixed") => setFormData({ ...formData, discount_type: value })}
              >
                <SelectTrigger id="discount_type">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Nilai Potongan</Label>
              <Input
                id="value"
                type="number"
                required
                min={0}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_purchase">Minimal Pembelian</Label>
              <Input
                id="min_purchase"
                type="number"
                min={0}
                value={formData.min_purchase}
                onChange={(e) => setFormData({ ...formData, min_purchase: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_discount">Maksimal Potongan (Opsional)</Label>
              <Input
                id="max_discount"
                type="number"
                placeholder="Tak terbatas"
                value={formData.max_discount ?? ""}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_usage">Batas Penggunaan (Opsional)</Label>
              <Input
                id="max_usage"
                type="number"
                placeholder="Tak terbatas"
                value={formData.max_usage ?? ""}
                onChange={(e) => setFormData({ ...formData, max_usage: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Berlaku Dari</Label>
              <Input
                id="valid_from"
                type="date"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Berlaku Hingga (Opsional)</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until ?? ""}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value === "" ? null : e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Status Aktif</Label>
                <p className="text-[0.8rem] text-muted-foreground">
                  Apakah diskon ini bisa digunakan saat ini
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="is_stackable">Dapat Ditumpuk</Label>
                <p className="text-[0.8rem] text-muted-foreground">
                  Bisa digabung dengan diskon lainnya
                </p>
              </div>
              <Switch
                id="is_stackable"
                checked={formData.is_stackable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_stackable: checked })}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : (discount ? "Simpan Perubahan" : "Tambah Diskon")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
