-- Migration to move barcodes to a dedicated table
CREATE TABLE IF NOT EXISTS public.barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_link CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR 
        (product_id IS NULL AND variant_id IS NOT NULL)
    )
);

-- Migrating existing product barcodes
INSERT INTO public.barcodes (product_id, barcode, created_at, updated_at)
SELECT id, barcode, created_at, updated_at
FROM public.products
WHERE barcode IS NOT NULL AND barcode != '';

-- Migrating existing variant barcodes
INSERT INTO public.barcodes (variant_id, barcode, created_at, updated_at)
SELECT id, barcode, created_at, updated_at
FROM public.product_variants
WHERE barcode IS NOT NULL AND barcode != '';

-- Remove barcode columns from existing tables (AFTER ensuring data migration is successful)
-- ALTER TABLE public.products DROP COLUMN barcode;
-- ALTER TABLE public.product_variants DROP COLUMN barcode;

-- Enable RLS
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
