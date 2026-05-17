# LA-POS Web Engineering Standard

This document establishes the official engineering standard for **LA-POS**, a production-grade retail Point of Sale (POS) system. Designed for senior software engineers, database administrators, and cybersecurity professionals, this standard enforces zero-trust security, strict logical correctness, and optimized PostgreSQL query execution.

---

## 1. Database Optimization & Anti-N+1 Query Policy

N+1 query patterns degrade application performance, increase latency, and overload database connection pools. In a high-throughput retail terminal, N+1 queries are strictly prohibited.

### 1.1 The SELECT N+1 Pattern
*   **Problem:** Querying a list of records and executing a secondary query in a loop for each record.
*   **Bad Example:**
    ```typescript
    // BAD: Fetching all products, then fetching variants one-by-one in a loop
    const { data: products } = await supabase.from('products').select('*');
    for (const product of products) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id);
      product.variants = variants;
    }
    ```
*   **Standard Resolution:** Always leverage PostgreSQL joins via Supabase query nesting to retrieve all required relations in a single database trip.
*   **Good Example:**
    ```typescript
    // GOOD: Single query fetching products and their nested variants
    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_variants(*)');
    ```

### 1.2 The Write (INSERT/UPDATE) N+1 Pattern
*   **Problem:** Iterating over an array and executing separate database write operations (`insert`, `update`, `delete`) in a loop. This leads to sequential network round-trips and lacks transactional atomicity.
*   **Bad Example (N+1 Update in a Loop):**
    ```typescript
    // BAD: Multi-network-trip update inside a loop
    for (const item of items) {
      await supabase
        .from("purchase_order_items")
        .update({ received_qty: item.ordered_qty })
        .eq("id", item.id);
    }
    ```
*   **Standard Resolution:**
    1.  **Bulk Operations (`upsert` / `insert`):** Combine all database writes into a single array payload and execute a bulk `insert` or `upsert`. Supabase upserts utilize the primary key to decide between inserts and updates automatically.
    2.  **Database RPCs:** For logic requiring columns to reference other columns (e.g. `colA = colB`) or complex atomic multi-table updates, invoke a PostgreSQL stored function using `.rpc()`.

*   **Good Example (Bulk Upsert):**
    ```typescript
    // GOOD: Single-trip bulk upsert updating all rows concurrently
    const bulkUpdates = items.map((item) => ({
      id: item.id,
      po_id: item.po_id,
      product_id: item.product_id,
      ordered_qty: item.ordered_qty,
      received_qty: item.ordered_qty, // Copying column values
      unit_price: item.unit_price,
      subtotal: item.subtotal
    }));

    const { error } = await supabase
      .from("purchase_order_items")
      .upsert(bulkUpdates);
    ```

*   **Good Example (PostgreSQL RPC):**
    ```sql
    -- SQL Migration for Atomic Bulk Update
    CREATE OR REPLACE FUNCTION fn_receive_all_po_items(p_po_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE purchase_order_items
      SET received_qty = ordered_qty
      WHERE po_id = p_po_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```
    ```typescript
    // Call RPC from Server Action
    const { error } = await supabase.rpc('fn_receive_all_po_items', { p_po_id: id });
    ```

---

## 2. Zero-Trust Cybersecurity Protocol

All client-facing interfaces are insecure. Security must be checked and enforced programmatically at the API and database levels.

### 2.1 Server Action & Route Protection
1.  **Server Actions are public-facing endpoints:** Any Server Action can be invoked directly via fetch payloads. All write operations (`insert`, `update`, `delete`) must verify authentication status and roles server-side before execution.
2.  **Check Roles Instantly:** Utilize `checkRole(['owner', 'manager'])` at the beginning of each administrative Server Action.
    ```typescript
    const isAuthorized = await checkRole(['owner', 'manager']);
    if (!isAuthorized) {
      throw new Error("Akses ditolak: Privilege tidak mencukupi.");
    }
    ```

### 2.2 Database-Level Security (Row Level Security)
*   **Enable RLS on EVERY table.** A table without RLS will bypass all auth controls and expose raw data via the public anon client.
*   **Enforce Role Claims:** Read the authenticated JWT's custom claims using database helper functions instead of executing subqueries.
    ```sql
    -- Example RLS Policy for Profile Access
    CREATE POLICY "Users can select own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
    ```

### 2.3 Cryptographic Payment Webhooks
Midtrans QRIS payments are handled via webhook notifications (`/api/payment/webhook`). Bypassing webhook validation allows attackers to mark transactions as paid without transferring funds.
1.  **Verify Webhook Signatures:** Verify the signature using HMAC-SHA512 (`order_id + status_code + gross_amount + server_key`).
2.  **Use Constant-Time Comparison:** Never use typical string comparison operators (e.g. `===`) for cryptographic signatures to prevent timing attacks. Use Node's `crypto.timingSafeEqual`.
3.  **Idempotence First:** Ensure that if a transaction has already been marked as `paid`, any subsequent webhook requests return a `200 OK` instantly without mutating database states.

### 2.4 Sensitive Actions & PIN Cryptography
Highly sensitive operations (e.g. voids, refunds, stock adjustments) require PIN re-verification:
1.  **Plaintext PINs are never stored or logged:** All PINs are stored as cryptographically secure bcrypt hashes (`profiles.pin_hash`).
2.  **Verify at Database Level:** Always run PIN validation in a secure database RPC using `SECURITY DEFINER` (e.g. `fn_verify_pin`) so plaintext PIN values never leave the immediate memory segment of the server action and database call.
3.  **Audit Trail:** Every PIN verification attempt—both successful and failed—must write to the immutable `cashier_actions` audit ledger.

---

## 3. Logical Correctness & Async State Management

POS terminals handle fast, sequential real-world inputs (like rapid barcode scans or fast double clicks). Classic React state closures can lead to race conditions, dropped inputs, or duplicated transactions.

### 3.1 Resolving Stale Closures (The `useRef` Escape Hatch)
React event listeners added in `useEffect` (such as the keydown listener for USB barcode scanners) capture a static closure of `state` from their registration time. Reading from this state directly will result in stale data.
*   **Standard:** Use a mutable ref (`useRef`) to capture state changes, keeping the ref synchronised in a lightweight `useEffect` loop.

```typescript
const [cart, setCart] = useState<CartItem[]>([]);
const cartRef = useRef(cart);

useEffect(() => {
  cartRef.current = cart;
}, [cart]);

// The event handler reads from cartRef.current, NOT the closed-over cart state
const handleBarcodeScan = (barcode: string) => {
  const currentCart = cartRef.current;
  // ... process barcode safely with currentCart
};
```

### 3.2 Thread-Safe UI Locks (`usePOSAction`)
Cashiers double-clicking buttons (like "Pay") can execute multiple asynchronous calls concurrently, leading to double-charging or corrupt ledgers.
*   **Standard:** All async buttons must be guarded using a `useRef`-based lock that blocks execution *instantly* upon initiation and releases only in a `finally` block.

```typescript
export function usePOSAction() {
  const locked = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (locked.current) return null; // Instant execution lock without waiting for re-render
    locked.current = true;
    setIsLoading(true);
    try {
      return await fn();
    } finally {
      locked.current = false;
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading };
}
```

### 3.3 Functional State Updaters
State modifications (like adding to cart) must never depend on state values outside of the state setter.
*   **Standard:** Always use functional state updaters: `setCart(prev => ...)` to ensure that each state modification receives the most up-to-date representation, preventing rapid successive clicks from overwriting each other.

---

## 4. Input Sanitization & Zod Validation

Never trust client inputs. Always enforce strict Zod schemas for both client-side and server-side data handling.
*   **Barcodes:** Clean barcode scanner inputs using regex (e.g. `replace(/\D/g, '')` for numeric codes) to filter out scanner-injected control characters before querying.
*   **Pricing & Quantity:** Zod schemas must enforce strict boundaries:
    *   Prices must be integers representing the smallest currency unit (e.g., Rupiah).
    *   Quantity must be strictly positive integers (`z.number().int().positive()`). Zero or negative inputs represent invalid transactions and must be rejected immediately at the endpoint.
