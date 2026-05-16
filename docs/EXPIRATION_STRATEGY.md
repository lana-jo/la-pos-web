# Smart Batch Expiration Strategy

## Overview
This document outlines the design for implementing expiration date tracking within the `la-pos` system. We are adopting a hybrid "Smart Batch" approach to balance data integrity (using batches) with performance (denormalization).

## 1. Schema Changes

### New Table: `product_batches`
This table acts as the source of truth for stock batches with specific expiration dates.

```sql
CREATE TABLE public.product_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL,
  qty integer NOT NULL DEFAULT 0,
  expired_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_batches_pkey PRIMARY KEY (id),
  CONSTRAINT product_batches_variant_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);
```

### Modification: `product_variants`
Added to enable fast lookups of the next expiring batch.

```sql
ALTER TABLE public.product_variants 
ADD COLUMN next_expired_date date;
```

### Modification: `inventory_movements`
Added to maintain full audit traceability.

```sql
ALTER TABLE public.inventory_movements 
ADD COLUMN batch_id uuid REFERENCES public.product_batches(id);
```

## 2. Synchronization Strategy
To ensure `product_variants.next_expired_date` remains accurate without requiring heavy joins in every query:

*   **Database Trigger:** A `plpgsql` trigger will be created on `public.product_batches`.
*   **Trigger Logic:** Whenever a batch is inserted, updated, or deleted, the trigger will recalculate the minimum `expired_date` (where `qty > 0`) for that `product_variant_id` and update the `product_variants` table.

## 3. Workflow Implications

### Stock Entry (Purchase/Add)
*   When adding stock, the system will check for an existing batch with the same `expired_date`. If it exists, increment `qty`. Otherwise, create a new record in `product_batches`.

### Point of Sale (Checkout)
*   The system will prioritize reducing stock from the batch with the *earliest* `expired_date` (FIFO by expiry).
*   If a transaction spans multiple batches, the logic will iterate through batches until the required quantity is met.
*   Every decrement operation will create an entry in `inventory_movements` referencing the `batch_id`.

## 4. Maintenance
*   **Cleanup:** A scheduled task (or manual utility) should be run to identify and flag batches where `expired_date < current_date` for stock adjustment (moving stock to a 'damaged' status).
