'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Grid3x3, X, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner'; // or your toast lib: react-hot-toast / shadcn Toaster
import type { ProductWithVariants, ProductVariant } from '@/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function calcAvailableStock(productStock: number, conversionQty: number): number {
  return conversionQty > 1 ? Math.floor(productStock / conversionQty) : productStock;
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface VariantCardProps {
  variant: ProductVariant;
  productStock: number;
  currentQty: number;
  onSelect: (v: ProductVariant) => void;
}

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithVariants | null;
  variantQuantity: number;
  onVariantQuantityChange: (qty: number) => void;
  onVariantSelect: (
    product: ProductWithVariants,
    variant: ProductVariant,
    quantity: number,
  ) => void;
}

// ─────────────────────────────────────────────
// VariantCard
// ─────────────────────────────────────────────

function VariantCard({ variant, productStock, currentQty, onSelect }: VariantCardProps) {
  const conversionQty  = variant.conversion_qty || 1;
  const availableStock = calcAvailableStock(productStock, conversionQty);

  // BUG FIX: isOutOfStock saja yang men-disable tombol.
  // isBelowMinQty hanya menampilkan warning — tidak memblokir klik,
  // karena user belum tentu tahu min_qty sebelum membuka modal,
  // dan validasi final dilakukan di handleSelect (parent).
  const isOutOfStock   = availableStock <= 0;
  const isBelowMinQty  = currentQty < variant.min_qty;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => onSelect(variant)}
      aria-label={`Pilih varian ${variant.variant_name}`}
      className={`
        w-full text-left p-4 rounded-lg border transition-all duration-150
        ${isOutOfStock
          ? 'opacity-50 cursor-not-allowed bg-muted/30'
          : 'hover:bg-muted/50 hover:shadow-sm hover:scale-[1.02] active:scale-[0.99]'
        }
      `}
    >
      <div className="flex items-center justify-between gap-3">

        {/* Icon */}
        <div className={`
          shrink-0 w-10 h-10 rounded-md flex items-center justify-center border
          ${isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-muted'}
        `}>
          <Package className={`h-5 w-5 ${isOutOfStock ? 'text-red-500' : 'text-muted-foreground'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium truncate ${isOutOfStock ? 'text-muted-foreground' : ''}`}>
              {variant.variant_name}
            </h4>
            {variant.is_default && (
              <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {variant.barcode ? `Barcode: ${variant.barcode}` : 'Tidak ada barcode'}
          </p>

          {conversionQty > 1 && (
            <p className="text-xs text-muted-foreground">
              {conversionQty} pcs = 1 {variant.variant_name}
            </p>
          )}

          {/* Warning min_qty — informatif, tidak disable tombol */}
          {isBelowMinQty && !isOutOfStock && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600 font-medium">
                Min. qty: {variant.min_qty} {variant.variant_name}
              </p>
            </div>
          )}
        </div>

        {/* Price & Stock */}
        <div className="text-right shrink-0">
          <p className={`font-semibold ${isOutOfStock ? 'text-muted-foreground line-through' : 'text-primary-brand'}`}>
            {formatRupiah(variant.price)}
          </p>
          <p className={`text-xs mt-0.5 ${isOutOfStock ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {isOutOfStock
              ? 'Stok habis'
              : conversionQty > 1
                ? `Tersedia: ${availableStock} ${variant.variant_name}`
                : `Stok: ${availableStock}`}
          </p>
        </div>

      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// QuantitySelector
// ─────────────────────────────────────────────

interface QuantitySelectorProps {
  value: number;
  onChange: (qty: number) => void;
}

function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value);
    onChange(isNaN(parsed) || parsed < 1 ? 1 : parsed);
  }, [onChange]);

  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
      <label htmlFor="variant-qty" className="pos-form-label mb-2 block">
        Jumlah
      </label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="h-8 w-8 p-0"
          aria-label="Kurangi jumlah"
        >
          −
        </Button>

        <input
          id="variant-qty"
          type="number"
          min={1}
          value={value}
          onChange={handleInput}
          className="w-16 text-center font-medium text-lg border rounded-md py-1
                     focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 p-0"
          aria-label="Tambah jumlah"
        >
          +
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VariantSelectionModal
// ─────────────────────────────────────────────

export function VariantSelectionModal({
  isOpen,
  onClose,
  product,
  variantQuantity,
  onVariantQuantityChange,
  onVariantSelect,
}: VariantSelectionModalProps) {

  const productStock = useMemo(
    () => product?.cached_stock ?? product?.stock ?? 0,
    [product],
  );

  const handleClose = useCallback(() => {
    onVariantQuantityChange(1);
    onClose();
  }, [onClose, onVariantQuantityChange]);

  // BUG FIX: validasi min_qty dilakukan di sini, bukan dengan men-disable VariantCard.
  // User sudah melihat warning di card → klik → toast menjelaskan kenapa gagal.
  const handleSelect = useCallback((variant: ProductVariant) => {
    if (!product) return;

    if (variantQuantity < variant.min_qty) {
      toast.warning(
        `Minimum pembelian ${variant.min_qty} ${variant.variant_name}. Tambahkan jumlahnya terlebih dahulu.`,
      );
      return;
    }

    onVariantSelect(product, variant, variantQuantity);
    handleClose();
  }, [product, variantQuantity, onVariantSelect, handleClose]);

  // Guard: jangan render apapun kalau product null
  if (!product) return null;

  const hasVariants = (product.variants?.length ?? 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] pos-modal-content">

        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <Grid3x3 className="h-5 w-5" />
            Pilih Varian — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="pos-modal-body">
          <QuantitySelector
            value={variantQuantity}
            onChange={onVariantQuantityChange}
          />

          {hasVariants ? (
            <div className="space-y-3">
              {product.variants!.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  productStock={productStock}
                  currentQty={variantQuantity}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada varian tersedia</p>
            </div>
          )}
        </div>

        <DialogFooter className="pos-modal-footer">
          <Button type="button" className="pos-button-secondary" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Batal
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}