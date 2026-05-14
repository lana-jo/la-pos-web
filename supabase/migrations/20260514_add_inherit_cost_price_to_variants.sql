-- Migration: Add inherit_cost_price to product_variants
-- Description: Allows variant cost price to be inherited from product cost price * conversion_qty

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS inherit_cost_price BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.product_variants.inherit_cost_price IS 
'Jika true, harga beli varian akan dihitung otomatis dari (harga beli produk * conversion_qty)';
