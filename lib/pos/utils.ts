import type { Product, ProductVariant } from "@/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function generateManualProduct(name: string, price: number): Product {
  return {
    id: `manual-${Date.now()}`,
    category_id: null,
    unit_id: null,
    supplier_id: null,
    name,
    description: null,
    cost_price: 0,
    price,
    stock: 999999,
    cached_stock: 999999,
    track_stock: false,
    low_stock_threshold: 0,
    min_stock: 0,
    max_stock: null,
    barcode: "",
    image_url: null,
    is_active: true,
    is_consignment: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function calculateTotalStock(product: Product & { variants?: ProductVariant[] }): number {
  if (product.variants && product.variants.length > 0) {
    // For variants, we need to calculate based on the parent product's stock and conversion quantities
    return product.variants.reduce((sum, variant) => {
      const productStock = (product.cached_stock || 0) > 0 ? product.cached_stock : (product.stock || 0);
      const conversionQty = variant.conversion_qty || 1;
      const availableVariantStock = conversionQty > 1 
        ? Math.floor(productStock / conversionQty)
        : productStock;
      return sum + availableVariantStock;
    }, 0);
  }
  return (product.cached_stock || 0) > 0 ? product.cached_stock : (product.stock || 0);
}

export function isOutOfStock(product: Product & { variants?: ProductVariant[] }): boolean {
  return calculateTotalStock(product) <= 0;
}

export function getPriceRange(product: Product & { variants?: ProductVariant[] }): { min: number; max: number } {
  if (product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
  return { min: product.price, max: product.price };
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + "." : text;
}

export function validateManualProduct(name: string, price: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: "Product name is required" };
  }
  
  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum <= 0) {
    return { isValid: false, error: "Please enter a valid price" };
  }
  
  return { isValid: true };
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
