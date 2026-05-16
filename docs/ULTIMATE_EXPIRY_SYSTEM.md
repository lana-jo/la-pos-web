# Ultimate Expiration & Batch Management System (FEFO-Driven)

## 1. Executive Summary
The Expiration & Batch Management System is designed to transform the POS from a passive inventory counter into an active waste-prevention tool. By utilizing **FEFO (First Expired, First Out)** logic and **Batch-Level Tracking**, the system ensures maximum product freshness and minimum financial loss.

## 2. Core Architecture: The "Batch" Model
Instead of tracking a single expiration date per product, we implement a granular batch system.

### Database: `public.product_batches`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Unique identifier for the batch. |
| `product_id` | uuid | Reference to the main product. |
| `product_variant_id` | uuid | Reference to specific variant (if applicable). |
| `batch_code` | text | Supplier's batch number (for recalls). |
| `initial_qty` | integer | Original quantity received. |
| `current_qty` | integer | Remaining sellable quantity. |
| `expired_at` | date | The critical expiration date. |
| `status` | enum | `active`, `near_expiry`, `expired`, `disposed`. |

## 3. Business Logic: The "Safety Engine"

### A. FEFO Inventory Flow
*   The system automatically allocates stock from the batch with the **earliest expiration date**.
*   This happens transparently during checkout; the cashier simply scans the product, and the system handles the batch deduction logic in the background.

### B. The "Hard Lock" Safety Feature
*   **Preventive Blocking:** Any batch where `current_date > expired_at` is automatically flagged as `expired`.
*   **Checkout Protection:** The POS system will refuse to add expired items to a cart, displaying a "Product Expired" error message.

### C. Near-Expiry Dynamic Pricing (Optional)
*   System can trigger automatic discounts (e.g., 30% off) for items in the `near_expiry` status (e.g., < 3 days remaining) to accelerate sales.

## 4. UI/UX: Proactive Visibility

### A. Dashboard: "Expiry Watch" Widget
*   A high-priority widget showing:
    *   **Expired Today:** Items that must be removed immediately.
    *   **Expiring Soon (7 Days):** Items to be prioritized for sale or promotion.

### B. Product Table Enhancement
*   **Visual Badges:**
    *   🔴 **Expired:** Immediate action required.
    *   🟠 **Near Expiry:** Warning state.
    *   🟢 **Fresh:** Safe for sale.

## 5. Implementation Roadmap
1.  **Phase 1:** Database migration to support `product_batches`.
2.  **Phase 2:** Update Stock Entry UI to include "Expiry Date" and "Batch Code" fields.
3.  **Phase 3:** Rewrite POS deduction logic to follow the FEFO path.
4.  **Phase 4:** Deploy the "Expiry Watch" Dashboard and automated alerts.

---
*Created by Gemini CLI - Professional POS Engineering Standard.*
