'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Grid3x3, X, Package, Search } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ProductWithVariants = Product & { variants?: ProductVariant[] };

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithVariants[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: { id: string; name: string }[];
  onProductSelect: (product: ProductWithVariants, variant?: ProductVariant) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** Truncate teks panjang untuk badge kategori di card kecil */
function truncateCategoryName(name: string, maxLength = 10): string {
  return name.length > maxLength ? `${name.slice(0, maxLength)}…` : name;
}

function getPriceRange(variants: ProductVariant[]): { min: number; max: number } {
  const prices = variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function CategoryBadge({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className="text-xs px-1 py-0.5 shrink-0">
      {truncateCategoryName(name)}
    </Badge>
  );
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="pos-product-image">
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover rounded-md" />
      ) : (
        <Package className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
  );
}

// ── ProductCard ───────────────────────────────

interface ProductCardProps {
  product: ProductWithVariants;
  onSelect: (product: ProductWithVariants) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  const hasVariants = (product.variants?.length ?? 0) > 0;

  const priceDisplay = useMemo(() => {
    if (hasVariants && product.variants!.length > 0) {
      const { min, max } = getPriceRange(product.variants!);
      return min === max
        ? formatRupiah(min)
        : `${formatRupiah(min)} – ${formatRupiah(max)}`;
    }
    return formatRupiah(product.price);
  }, [hasVariants, product.variants, product.price]);

  const stockDisplay = hasVariants
    ? `${product.variants!.length} varian`
    : `Stok: ${product.stock ?? 0}`;

  return (
    // Gunakan <button> agar accessible by keyboard (Enter / Space)
    <button
      type="button"
      className="pos-product-card text-left w-full"
      onClick={() => onSelect(product)}
      aria-label={`Pilih produk ${product.name}`}
    >
      <ProductImage src={product.image_url} alt={product.name} />

      <div className="pos-product-info">
        <h3 className="pos-product-name">{product.name}</h3>
        <p className="pos-product-price">{priceDisplay}</p>

        <div className="flex items-center justify-between mt-1 gap-1">
          <p className="pos-product-stock truncate">{stockDisplay}</p>
          {product.categories && (
            <CategoryBadge name={product.categories.name} />
          )}
        </div>
      </div>
    </button>
  );
}

// ── CategoryFilter ────────────────────────────

interface CategoryFilterProps {
  categories: { id: string; name: string }[];
  selected: string;
  onChange: (id: string) => void;
}

function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <Button
        type="button"
        variant={selected === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('all')}
      >
        Semua Kategori
      </Button>

      {categories.map((cat) => (
        <Button
          key={cat.id}
          type="button"
          variant={selected === cat.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}

// ── EmptyState ────────────────────────────────

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <Package className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Produk tidak ditemukan</p>
        <p className="text-sm text-muted-foreground">
          Coba ubah kata kunci atau filter kategori
        </p>
      </div>
    </div>
  );
}

// ── LoadingState ──────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <div className="pos-loading-spinner mx-auto" />
        <p className="text-sm text-muted-foreground">Memuat produk…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ProductSelectionModal
// ─────────────────────────────────────────────

export function ProductSelectionModal({
  isOpen,
  onClose,
  products,
  loading,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onProductSelect,
}: ProductSelectionModalProps) {

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  const handleProductSelect = useCallback(
    (product: ProductWithVariants) => onProductSelect(product),
    [onProductSelect],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col pos-modal-content">

        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">
            <Grid3x3 className="h-5 w-5" />
            Pilih Produk
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col pos-modal-body">

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari produk…"
              value={searchTerm}
              onChange={handleSearchChange}
              className="pos-search-input pl-10"
            />
          </div>

          {/* Category Filter */}
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={onCategoryChange}
          />

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <LoadingState />
            ) : products.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="pos-product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleProductSelect}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="pos-modal-footer">
          <Button type="button" className="pos-button-secondary" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}