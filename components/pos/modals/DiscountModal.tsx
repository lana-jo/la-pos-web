"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Percent, DollarSign, X, CheckCircle2, Search } from "lucide-react";
import { fetchDiscounts } from "@/lib/discounts/actions";
import { Discount } from "@/types";
import { toast } from "sonner";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartSubtotal: number;
  onApply: (discount: Discount | null) => void;
  currentDiscount: Discount | null;
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function calcDiscountAmount(subtotal: number, discount: Discount): number {
  if (subtotal < (discount.min_purchase || 0)) return 0;
  if (discount.discount_type === "percentage") {
    const raw = Math.floor(subtotal * (discount.value / 100));
    return discount.max_discount ? Math.min(raw, discount.max_discount) : raw;
  }
  return Math.min(discount.value, subtotal);
}

export function DiscountModal({
  isOpen,
  onClose,
  cartSubtotal,
  onApply,
  currentDiscount,
}: DiscountModalProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Discount | null>(currentDiscount);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load active discounts when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSelected(currentDiscount);
    setSearch("");
    setLoading(true);
    fetchDiscounts().then((res) => {
      if (res.success && res.data) {
        const now = new Date();
        const active = (res.data as Discount[]).filter(
          (d) =>
            d.is_active &&
            new Date(d.valid_from) <= now &&
            (!d.valid_until || new Date(d.valid_until) >= now) &&
            (d.max_usage == null || d.usage_count < d.max_usage)
        );
        setDiscounts(active);
      } else {
        toast.error("Gagal memuat daftar diskon");
      }
      setLoading(false);
    });
  }, [isOpen, currentDiscount]);

  const filtered = discounts.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.code?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const handleApply = () => {
    if (!selected) {
      // Remove discount
      onApply(null);
      onClose();
      return;
    }

    const discountAmt = calcDiscountAmount(cartSubtotal, selected);
    if (discountAmt <= 0 && cartSubtotal < (selected.min_purchase || 0)) {
      toast.error(
        `Min. pembelian ${formatRp(selected.min_purchase)} belum tercapai (total ${formatRp(cartSubtotal)})`
      );
      return;
    }

    onApply(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="pos-modal-content">
          {/* Header */}
          <div className="pos-modal-header px-6 py-5 flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-primary leading-none">
                Pilih Diskon
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Total keranjang: <span className="font-semibold">{formatRp(cartSubtotal)}</span>
              </DialogDescription>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border/50 bg-background/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Cari nama atau kode diskon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* List */}
          <div className="px-6 py-3 max-h-72 overflow-y-auto space-y-2">
            {/* Remove discount option */}
            {currentDiscount && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selected === null
                    ? "border-destructive bg-destructive/5"
                    : "border-border/50 hover:border-border bg-background/40"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Hapus Diskon</p>
                  <p className="text-xs text-muted-foreground">Lanjutkan tanpa potongan harga</p>
                </div>
              </button>
            )}

            {loading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Tidak ada diskon aktif{search ? ` untuk "${search}"` : ""}.
              </div>
            )}

            {!loading &&
              filtered.map((d) => {
                const eligible = cartSubtotal >= (d.min_purchase || 0);
                const discountAmt = eligible ? calcDiscountAmount(cartSubtotal, d) : 0;
                const isSelected = selected?.id === d.id;

                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!eligible}
                    onClick={() => setSelected(d)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-primary/40 bg-background/40"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.discount_type === "percentage" ? (
                        <Percent className="h-4 w-4" />
                      ) : (
                        <DollarSign className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{d.name}</p>
                        {d.code && (
                          <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0">
                            {d.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.discount_type === "percentage"
                          ? `${d.value}% potongan`
                          : `Potongan ${formatRp(d.value)}`}
                        {d.max_discount ? ` (maks. ${formatRp(d.max_discount)})` : ""}
                        {d.min_purchase > 0 ? ` · Min. ${formatRp(d.min_purchase)}` : ""}
                      </p>
                    </div>
                    {eligible && discountAmt > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Hemat</p>
                        <p className="text-sm font-bold text-green-600">−{formatRp(discountAmt)}</p>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 bg-background/30 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button
              className="flex-1 pos-button-primary font-bold"
              onClick={handleApply}
              disabled={!currentDiscount && !selected}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {selected ? "Terapkan Diskon" : "Hapus Diskon"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
