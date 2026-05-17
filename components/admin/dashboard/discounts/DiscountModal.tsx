"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const toDatetimeLocal = (iso: string | null | undefined) => {
  if (!iso) return "";
  // Convert ISO → format accepted by <input type="datetime-local">
  return iso.slice(0, 16);
};

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
    valid_from: toDatetimeLocal(new Date().toISOString()),
    valid_until: "" as string,
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
        is_active: discount.is_active,
        is_stackable: discount.is_stackable,
        valid_from: toDatetimeLocal(discount.valid_from),
        valid_until: toDatetimeLocal(discount.valid_until),
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
        valid_from: toDatetimeLocal(new Date().toISOString()),
        valid_until: "",
      });
    }
  }, [discount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...formData,
      code: formData.code.trim() || null,
      // Convert datetime-local strings back to ISO; if empty treat as null
      valid_from: formData.valid_from
        ? new Date(formData.valid_from).toISOString()
        : new Date().toISOString(),
      valid_until: formData.valid_until
        ? new Date(formData.valid_until).toISOString()
        : null,
    };
    await onSubmit(payload);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Diskon" : "Tambah Diskon Baru"}</DialogTitle>
          <DialogDescription>
            {discount
              ? "Perbarui pengaturan diskon yang sudah ada."
              : "Isi detail untuk membuat diskon baru."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disc-name">Nama Diskon</Label>
              <Input
                id="disc-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disc-code">Kode Promo (Opsional)</Label>
              <Input
                id="disc-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. DISKON20"
              />
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disc-type">Tipe Diskon</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(v: "percentage" | "fixed") =>
                  setFormData({ ...formData, discount_type: v, max_discount: null })
                }
              >
                <SelectTrigger id="disc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disc-value">
                Nilai {formData.discount_type === "percentage" ? "(%)" : "(Rp)"}
              </Label>
              <Input
                id="disc-value"
                type="number"
                required
                min={1}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Min purchase + Max discount (only for percentage) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disc-min">Min. Pembelian (Rp)</Label>
              <Input
                id="disc-min"
                type="number"
                min={0}
                value={formData.min_purchase}
                onChange={(e) =>
                  setFormData({ ...formData, min_purchase: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            {formData.discount_type === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="disc-maxd">Maks. Potongan (Rp, Opsional)</Label>
                <Input
                  id="disc-maxd"
                  type="number"
                  min={0}
                  value={formData.max_discount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_discount: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Max usage */}
          <div className="space-y-2">
            <Label htmlFor="disc-usage">Maks. Penggunaan (Opsional — kosongkan = tidak terbatas)</Label>
            <Input
              id="disc-usage"
              type="number"
              min={1}
              value={formData.max_usage ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_usage: e.target.value ? parseInt(e.target.value) : null,
                })
              }
            />
          </div>

          {/* Validity period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disc-from">Berlaku Dari</Label>
              <Input
                id="disc-from"
                type="datetime-local"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disc-until">Berlaku Sampai (Opsional)</Label>
              <Input
                id="disc-until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-8 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id="disc-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="disc-active">Status Aktif</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="disc-stackable"
                checked={formData.is_stackable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_stackable: checked })}
              />
              <Label htmlFor="disc-stackable" className="text-sm">
                Bisa Digabung
                <span className="block text-xs text-muted-foreground font-normal">
                  Izinkan dengan diskon lain
                </span>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
