<!-- BEGIN:nextjs-agent-rules -->
# Product Requirements Document
## POS Web Application

> **Version:** 1.0.0 | **Date:** April 2026 | **Status:** Draft | **Confidential**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Objectives](#2-goals--objectives)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [Technical Architecture](#4-technical-architecture)
5. [Database Schema](#5-database-schema)
6. [Feature Requirements](#6-feature-requirements)
7. [Application Routes](#7-application-routes)
8. [Libraries & Dependencies](#8-libraries--dependencies)
9. [Async Action Patterns](#9-async-action-patterns--fixing-first-click-only-bugs)
10. [Project Structure](#10-project-directory-structure)
11. [Security Checklist](#11-security-requirements-checklist)
12. [Technical Risks](#12-technical-risks--mitigations)
13. [Open Questions](#13-open-questions)
14. [Success Metrics](#14-success-metrics)

---

## 1. Executive Summary

A web-based Point of Sale (POS) system targeting small-to-medium retail businesses in Indonesia. Built for Vercel deployment with Supabase as the managed backend — leveraging Row Level Security, real-time subscriptions, and server-side rendering to deliver a secure, production-grade retail platform.

The product covers the full retail transaction lifecycle: product catalog browsing, barcode scanning via webcam and USB scanner, dynamic QRIS payment generation (auto-populated with the exact cart total via GoPay/Midtrans), real-time payment confirmation, thermal/universal receipt printing, and a role-gated interface separating Admin, Cashier, and Customer concerns. All sensitive cashier operations are protected by PIN validation with bcrypt hashing and an immutable audit trail.

A critical engineering concern addressed in this document is the **stale-closure bug pattern** common in React-based POS UIs — where only the first click of a repeated action executes correctly. All async action handlers are designed with `useRef`-based locking, functional state updaters, and sequential barcode queuing to guarantee correctness across multiple rapid interactions.

| Meta | Value |
|---|---|
| Product Name | POS Web Application |
| Tech Stack | Next.js 14+ · Supabase · Vercel · TypeScript |
| Payment | QRIS Dynamic QR — Midtrans (GoPay acquirer) |
| Target Users | Admin · Cashier · Customer |
| Deployment | Vercel (frontend + API routes) + Supabase (DB, Auth, Realtime) |
| Region | Indonesia — Rupiah (IDR), Bahasa Indonesia UI |

---

## 2. Goals & Objectives

- Provide a fast, reliable POS terminal for cashiers: barcode scanning, cart management, and QRIS GoPay checkout.
- Generate dynamic QRIS codes automatically pre-filled with the exact cart total — no manual amount entry by the cashier.
- Deliver real-time payment confirmation to the cashier terminal the instant the customer completes payment.
- Enable Admins to fully manage products, categories, user accounts, and sales analytics.
- Enforce zero-trust security: RLS policies, JWT role claims, server-side actions, and HMAC-verified webhooks.
- Support all receipt printer types — USB thermal (ESC/POS), network thermal, standard laser/inkjet.
- Prevent stale-state bugs: every async action is lock-guarded; every state mutation uses functional updaters.
- Deploy entirely on Vercel + Supabase with zero self-hosted infrastructure.

---

## 3. Stakeholders & User Roles

| Role | Access Scope | Restrictions | Auth Required |
|---|---|---|---|
| **Admin** | Full system: product CRUD, category management, user management, sales reports, all transactions | None — highest privilege | Yes — Supabase Auth |
| **Cashier** | POS terminal, barcode scanning, QRIS checkout, own transaction history | Cannot access `/dashboard`. Sensitive actions (void, discount, refund) require PIN. Cannot create/edit products. | Yes — Supabase Auth |
| **Customer** | Read-only product catalog, category browse, product search | No POS or admin access. Cannot initiate transactions. | No — public access |

---

## 4. Technical Architecture

### 4.1 Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| Frontend Framework | Next.js 14+ (App Router) | Server Actions, RSC, edge middleware, native Vercel optimization |
| Language | TypeScript (strict mode) | Type safety across client, server, and DB schema |
| Database | Supabase (PostgreSQL) | Managed DB, Auth, Realtime, Edge Functions, Storage |
| Deployment | Vercel | Zero-config Next.js deployment, env variable management |
| Auth | Supabase Auth + JWT custom claims | Role embedded in JWT `app_metadata` for RLS consumption |
| Realtime | Supabase Realtime (WebSocket) | Instant payment status push — no polling |
| Payment | Midtrans API — QRIS (GoPay acquirer) | Most mature QRIS gateway in Indonesia, webhook support |
| UI | shadcn/ui + Tailwind CSS | Accessible headless components with utility styling |
| State | Zustand | Cart state; always read via `getState()` inside async callbacks |
| Forms | React Hook Form + Zod | Client + server schema validation |

### 4.2 Security Architecture — Three Independent Layers

Security is enforced at three distinct, independent layers. Bypassing any one layer cannot expose data because the others remain active:

| Layer | Mechanism | What It Prevents |
|---|---|---|
| **1 — Route Guard** | Next.js middleware reads JWT role before page renders | Unauthorized users never see protected UI |
| **2 — Server Actions** | All DB mutations run server-side; service role key never in browser bundle | Client-side tampering cannot affect DB |
| **3 — Row Level Security** | Supabase RLS policies on every table enforce role-based access at DB level | Even a compromised anon key cannot read/write outside role permissions |

### 4.3 JWT Custom Claims

On user creation, a Supabase Edge Function injects the assigned role into `app_metadata`. This role is embedded in the JWT and is available to RLS policies via `auth.jwt() ->> 'role'` without an additional database round-trip.

### 4.4 Stale-Closure Bug Prevention

React event handlers registered in `useEffect` with empty dependency arrays capture a stale snapshot of state — causing only the first action to execute correctly on repeated clicks. Mitigated system-wide by three patterns:

- **`useRef` escape hatch** — event listeners read from a ref kept in sync with state, never from the closed-over state value.
- **Functional `setState` updater** — all cart mutations use `setCart(prev => ...)` so each update receives the latest state regardless of closure age.
- **`useRef`-based action lock** — async handlers set a ref flag before executing and clear it in `finally`, blocking simultaneous calls without re-render latency.

---

## 5. Database Schema

### 5.1 Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `profiles` | `id` (FK auth.users), `role ENUM('admin','cashier','customer')`, `full_name`, `avatar_url`, `pin_hash` | Extends Supabase auth.users. `pin_hash` stored bcrypt-hashed, never plaintext. |
| `categories` | `id`, `name`, `slug` (unique), `is_active`, `created_at` | Product grouping. Soft-delete via `is_active`. |
| `products` | `id`, `category_id`, `name`, `barcode` (unique), `price INTEGER`, `stock INTEGER`, `image_url`, `is_active`, `created_at`, `updated_at` | `price` in smallest IDR unit. Barcode globally unique. Soft-delete. |
| `transactions` | `id`, `cashier_id`, `total INTEGER`, `payment_method DEFAULT 'qris'`, `payment_status ENUM('pending','paid','expired','cancelled')`, `midtrans_order_id`, `qris_url`, `qris_string`, `qris_expires_at`, `paid_at`, `created_at` | Transaction header. QRIS fields populated by Server Action. `paid_at` set by webhook. |
| `transaction_items` | `id`, `transaction_id`, `product_id`, `qty`, `unit_price INTEGER`, `subtotal INTEGER` | Line items. `unit_price` frozen at sale time — independent of future price changes. |
| `cashier_actions` | `id`, `cashier_id`, `action_type ENUM('void','discount','refund')`, `target_id`, `pin_verified BOOLEAN`, `notes`, `created_at` | Immutable audit log. One row per sensitive action attempt regardless of PIN outcome. |

### 5.2 Row Level Security Policy Matrix

| Table | Admin | Cashier | Customer / Anon |
|---|---|---|---|
| `profiles` | ALL (own + others) | SELECT own row only | No access |
| `categories` | ALL | SELECT where `is_active` | SELECT where `is_active` |
| `products` | ALL | SELECT where `is_active` | SELECT where `is_active` |
| `transactions` | ALL | SELECT/INSERT own `cashier_id` | No access |
| `transaction_items` | ALL | SELECT/INSERT linked to own transactions | No access |
| `cashier_actions` | ALL (read-only audit) | INSERT own `cashier_id` | No access |

---

## 6. Feature Requirements

### 6.1 Barcode Scanning

Both input methods feed into a single shared async handler via a `useRef`-based sequential queue — no scans are dropped under rapid-fire input.

#### 6.1.1 USB Scanner (Keyboard Emulation Mode)

- USB scanners fire rapid `keydown` events and send `Enter` at end of each barcode.
- Global `keydown` listener on `window` buffers characters. Keystroke intervals < 50ms classified as scanner input vs. normal typing.
- When `Enter` received and `buffer.length > 3`, barcode is enqueued for processing.
- 100ms timeout fallback auto-enqueues buffer if `Enter` never received (some scanner models).
- Listener skips events if `e.target` is a standard input without `data-scanner-input` attribute — prevents conflicts with admin search fields.

#### 6.1.2 Webcam Scanner

- Powered by `@ericblade/quagga2` — continuous video frame analysis via LiveStream.
- Supported formats: **EAN-13, EAN-8, Code128, QR Code, UPC-A**.
- 2-second debounce per barcode value — same code within 2s is suppressed.
- Live viewfinder with animated scan-line overlay rendered in POS UI.
- Graceful fallback if camera permission denied: error state shown, USB mode stays active.

#### 6.1.3 Shared Handler & Queue

- Both inputs call a single `enqueue()` function from `useBarcodeQueue` hook.
- Queue uses `useRef<string[]>` and a `useRef<boolean>` processing flag — no `useState`, no re-renders.
- Items processed strictly sequentially: next item starts only after previous Supabase lookup resolves.
- **On success:** audio beep + toast notification + item added via functional updater.
- **On failure:** error toast with raw barcode string. Out-of-stock products show warning and are not added.

---

### 6.2 QRIS Dynamic Payment (GoPay via Midtrans)

QRIS code is generated server-side with the exact cart total pre-encoded. Cashier never enters an amount manually.

| Step | Action | Responsibility |
|---|---|---|
| 1 | Cashier reviews cart, clicks **Bayar** (Pay) | Cashier UI |
| 2 | `useRef` lock activated — subsequent clicks blocked instantly | Client hook |
| 3 | Server Action creates transaction row (`status: pending`) | Next.js Server Action |
| 4 | Server Action calls Midtrans `POST /v2/charge` (`payment_type: qris`, `acquirer: gopay`, `gross_amount: <exact total>`) | Server → Midtrans API |
| 5 | Midtrans returns QR image URL, raw QRIS string, expiry time (15 min) | Midtrans → Server |
| 6 | Server Action writes `qris_url`, `qris_string`, `qris_expires_at` to transaction row | Server → Supabase |
| 7 | QRIS modal opens: QR image, formatted IDR amount, 15-min countdown timer | POS UI |
| 8 | Customer opens any QRIS-compatible app and scans the QR code | Customer |
| 9 | Midtrans fires `POST /api/payment/webhook` — signature verified with HMAC-SHA512 | Midtrans → Vercel API Route |
| 10 | Webhook updates `payment_status = 'paid'`, `paid_at = now()` in Supabase | Vercel API Route → Supabase |
| 11 | Supabase Realtime pushes `UPDATE` event to subscribed POS terminal | Supabase → POS UI |
| 12 | Modal auto-closes, receipt print triggered, cart cleared, lock released | POS UI |

**Security requirements:**
- `MIDTRANS_SERVER_KEY` stored only in Vercel server environment — never `NEXT_PUBLIC_` prefixed.
- Webhook verified with HMAC-SHA512 (`order_id + status_code + gross_amount + server_key`) before any DB write.
- Webhook handler is idempotent: if transaction already `'paid'`, subsequent calls are no-ops.
- QRIS expires after 15 minutes; cashier can regenerate a new QR with a single click.

---

### 6.3 Receipt Printing

Three-tier strategy — default is browser print for universal compatibility.

| Tier | Method | Compatible Printers | Print Dialog | Setup |
|---|---|---|---|---|
| **1 — Universal** | `react-to-print` (browser print API) | All — laser, inkjet, thermal, PDF | Yes | None |
| **2 — Thermal CSS** | `@page { size: 80mm auto; }` override | 80mm thermal as system printer | Configurable | Set as default in OS |
| **3 — ESC/POS Direct** | WebUSB API + raw ESC/POS byte commands | USB thermal (Epson, Star, generic 80mm) | None — silent | One-time WebUSB device pairing |

**Receipt content:**
- Header: store name (bold), address, phone number
- Transaction: ID (last 8 chars, uppercase), date/time `dd/MM/yy HH:mm`, cashier name
- Line items: product name, `qty × unit_price (IDR)`, subtotal right-aligned
- Totals: TOTAL (bold), payment method (QRIS GoPay), change due (Rp 0 for exact QRIS)
- Footer: QR code (64×64px) linking to transaction record for digital verification
- Font: Courier New monospace 12px — renders correctly on 80mm thermal at 203dpi
- All amounts formatted: `Rp X.XXX` using `id-ID` locale

---

### 6.4 Cashier PIN Validation

Sensitive operations require PIN re-verification before proceeding — prevents unauthorized use of an unattended logged-in terminal.

| Action | PIN Required | Audit Logged |
|---|---|---|
| Void / cancel a transaction | Yes | Yes — `action_type: void` |
| Apply manual discount to cart | Yes | Yes — `action_type: discount` |
| Process a refund | Yes | Yes — `action_type: refund` |
| Add item to cart (normal scan) | No | No |
| Process QRIS payment | No | No |
| View own transaction history | No | No |

**PIN security implementation:**
- PIN set by Admin during cashier account creation; stored as bcrypt hash in `profiles.pin_hash`.
- Verification runs in Supabase Edge Function (`verify_cashier_pin` RPC) — plaintext PIN never logged or stored.
- Rate-limited: 3 failed attempts → 5-minute lockout enforced server-side.
- All attempts (success and failure) written to `cashier_actions` audit table.

---

## 7. Application Routes

| Route | Page / Purpose | Roles Permitted |
|---|---|---|
| `/(auth)/login` | Authentication — email/password via Supabase Auth | All unauthenticated |
| `/(auth)/unauthorized` | 403 page shown on role mismatch | All |
| `/(customer)/catalog` | Public product catalog — browse, search, filter by category | All (no login) |
| `/(customer)/catalog/[slug]` | Product detail — name, image, price, stock indicator | All (no login) |
| `/(cashier)/pos` | POS terminal — barcode scanner, cart, QRIS modal, PIN modal | Cashier, Admin |
| `/(cashier)/transactions` | Own transaction history with status and receipt reprint | Cashier, Admin |
| `/(admin)/dashboard` | Analytics overview — revenue, transaction count, top products | Admin only |
| `/(admin)/dashboard/products` | Product CRUD — create, edit, assign barcode, toggle active | Admin only |
| `/(admin)/dashboard/categories` | Category management — create, reorder, toggle active | Admin only |
| `/(admin)/dashboard/users` | User management — create cashier accounts, assign PINs | Admin only |
| `/(admin)/dashboard/reports` | Sales reports — date range filter, charts, CSV export | Admin only |
| `/api/payment/webhook` | Midtrans QRIS payment notification receiver (POST) | Midtrans server only |

---

## 8. Libraries & Dependencies

| Category | Package | Purpose |
|---|---|---|
| Barcode — webcam | `@ericblade/quagga2` | Frame-by-frame barcode detection via webcam video stream |
| Barcode — USB | Native DOM `keydown` | Keyboard emulation capture — no package needed |
| Receipt print | `react-to-print` | Browser print API wrapper with CSS `@page` support |
| Receipt print — direct | WebUSB API (native) | ESC/POS byte commands to USB thermal printers |
| QR display | `qrcode.react` | SVG QR code for receipt footer and QRIS modal |
| Payment | Midtrans Node.js SDK | QRIS charge creation and webhook signature verification |
| UI Components | `shadcn/ui` | Accessible headless components (Dialog, Toast, Badge, Button) |
| Styling | Tailwind CSS | Utility-first CSS; `@page` print rules in `globals.css` |
| Global state | Zustand | Cart store; `getState()` used inside all async callbacks |
| Forms | React Hook Form + Zod | Type-safe form validation, client and server schema sharing |
| Data tables | TanStack Table v8 | Sortable, filterable, paginated tables for admin views |
| Charts | Recharts | Revenue and transaction analytics on admin dashboard |
| DB client (browser) | `@supabase/supabase-js` | Anon key client for public reads and Realtime subscriptions |
| DB client (server) | `@supabase/ssr` | Server-side client with service role key for mutations |

---

## 9. Async Action Patterns — Fixing First-Click-Only Bugs

### 9.1 Root Causes Taxonomy

| Bug Pattern | Symptom | Affected Component |
|---|---|---|
| Stale closure in `useEffect` | Handler reads initial state snapshot forever; subsequent scans use empty cart | USB scanner `keydown` listener |
| `setState` with captured value | `setCart(cart.map(...))` uses stale cart; rapid scans produce wrong quantities | Cart add/update logic |
| Async race condition | Two barcodes 300ms apart — second lookup overwrites first mid-flight | Barcode → Supabase product lookup |
| No action lock | Cashier clicks Bayar twice in 500ms — two Midtrans charges created | QRIS checkout handler |
| Zustand stale capture | `cart` captured in closure before `await`; stale value used after promise resolves | Checkout Server Action call |

### 9.2 Required Fix Patterns

| Pattern | Implementation | Applied To |
|---|---|---|
| `useRef` escape hatch | `const cartRef = useRef(cart)` + `useEffect(()=>{ cartRef.current=cart },[cart])` — listener reads `cartRef.current` | All `useEffect` listeners that need current state |
| Functional `setState` updater | `setCart(prev => ...)` — always receives latest state regardless of closure age | Every cart mutation: add, update qty, remove, clear |
| Sequential barcode queue | `useRef<string[]>` queue + `useRef<boolean>` processing flag — one barcode at a time | `useBarcodeQueue` hook — shared by USB and webcam |
| `useRef` action lock | `locked.current = true` before async fn; `finally { locked.current = false }` | Checkout, void, discount, refund, PIN verify |
| Zustand `getState()` | `useCartStore.getState().cart` inside all async functions after any `await` boundary | All Server Action calls that need current cart |

### 9.3 `usePOSAction` — Universal Handler Hook

All async POS actions use a single reusable hook combining lock, loading state, and error handling:

```typescript
// hooks/usePOSAction.ts
export function usePOSAction() {
  const locked = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void
        onError?: (err: Error) => void
      }
    ): Promise<T | null> => {
      if (locked.current) return null  // instant block — no re-render delay

      locked.current = true
      setIsLoading(true)
      setError(null)

      try {
        const result = await fn()
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error.message)
        options?.onError?.(error)
        toast.error(error.message)
        return null
      } finally {
        locked.current = false  // always release, even on error
        setIsLoading(false)
      }
    },
    []
  )

  return { execute, isLoading, error }
}
```

**Usage:**
```tsx
// Checkout button — no matter how fast cashier clicks, only ONE Midtrans charge fires
const { execute, isLoading } = usePOSAction()

<Button
  onClick={() => execute(handleCheckout)}
  disabled={isLoading}
>
  {isLoading ? <Spinner /> : 'Bayar QRIS'}
</Button>
```

| Feature | Behavior |
|---|---|
| Action lock | `useRef<boolean>` — blocks re-entry instantly, no re-render delay |
| Loading state | `useState<boolean>` — drives `disabled` prop for visual feedback |
| Error handling | `try/catch` with toast; lock always released in `finally` |
| TypeScript generic | `execute<T>(fn: () => Promise<T>)` — fully typed return |
| Concurrent safety | Second click while first runs returns `null` immediately |

---

## 10. Project Directory Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/                  # Supabase Auth email/password
│   │   └── unauthorized/           # 403 role mismatch page
│   ├── (customer)/
│   │   └── catalog/                # Public product catalog (no auth)
│   │       └── [slug]/             # Product detail page
│   ├── (cashier)/
│   │   ├── pos/                    # POS terminal — cashier + admin
│   │   └── transactions/           # Own transaction history
│   ├── (admin)/
│   │   └── dashboard/
│   │       ├── products/           # Product CRUD + barcode assignment
│   │       ├── categories/         # Category management
│   │       ├── users/              # Cashier account & PIN management
│   │       └── reports/            # Sales analytics + CSV export
│   └── api/
│       └── payment/
│           └── webhook/route.ts    # Midtrans QRIS webhook receiver
│
├── components/
│   ├── pos/
│   │   ├── BarcodeScanner.tsx      # USB + webcam scanner, mode toggle
│   │   ├── CartPanel.tsx           # Live cart — items, qty, totals
│   │   ├── QRISModal.tsx           # QR display, countdown, Realtime listener
│   │   ├── Receipt.tsx             # Print-ready receipt (forwardRef, 80mm)
│   │   └── PinModal.tsx            # PIN entry for sensitive actions
│   └── admin/
│       ├── ProductForm.tsx
│       └── DataTable.tsx
│
├── hooks/
│   ├── usePOSAction.ts             # Universal async lock + loading + error
│   ├── useBarcodeQueue.ts          # Sequential barcode queue (useRef)
│   ├── useUSBScanner.ts            # Global keydown — USB scanner capture
│   └── useWebcamScanner.ts         # Quagga2 webcam scanner lifecycle
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (anon key)
│   │   └── server.ts               # Server client (service role — server only)
│   ├── payment/
│   │   └── midtrans.ts             # Server Action: QRIS creation
│   └── printer/
│       ├── printManager.ts         # Unified dispatcher: browser vs ESC/POS
│       └── escpos.ts               # WebUSB + ESC/POS byte command builder
│
├── store/
│   └── cart.ts                     # Zustand cart store
│
├── supabase/
│   └── migrations/                 # SQL: schema, RLS policies, Edge Functions
│
└── middleware.ts                    # Route protection — role-based redirect
```

---

## 11. Security Requirements Checklist

| Requirement | Implementation | Priority |
|---|---|---|
| Service role key never in browser | Used only in `lib/supabase/server.ts` and API routes; no `NEXT_PUBLIC_` prefix | 🔴 Required |
| Midtrans server key protected | Vercel server env var only — never in client bundle | 🔴 Required |
| Webhook authenticity verified | HMAC-SHA512 signature check on every Midtrans webhook call | 🔴 Required |
| RLS enabled on all tables | `ALTER TABLE x ENABLE ROW LEVEL SECURITY` + policies per role | 🔴 Required |
| JWT role claims for RLS | Edge Function injects role into `app_metadata` on user creation | 🔴 Required |
| Route protection via middleware | `middleware.ts` checks session + role before rendering any protected page | 🔴 Required |
| PIN hashed with bcrypt | `pin_hash` column; plaintext never stored, logged, or transmitted | 🔴 Required |
| PIN rate limiting | 3 failed attempts → 5-min lockout enforced server-side | 🔴 Required |
| Cashier action audit log | Every sensitive action (success + failure) written to `cashier_actions` | 🔴 Required |
| Duplicate payment prevention | `useRef` action lock + idempotent webhook handler | 🔴 Required |
| Supabase Auth rate limiting | Configured in Supabase dashboard: max login attempts per IP | 🟡 Recommended |
| QRIS expiry handling | Expired transactions auto-cancelled; regenerate button shown after 15 min | 🟡 Recommended |

---

## 12. Technical Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Stale closure — only first click fires | 🔴 High | `useRef` escape hatch + functional `setState` + `usePOSAction` lock |
| Duplicate QRIS charges on double-click | 🔴 High | `useRef` action lock; idempotent webhook; unique Midtrans order ID per transaction |
| Scanner race condition — second scan overwrites first | 🔴 High | Sequential `useRef` queue in `useBarcodeQueue` — one lookup at a time |
| QRIS expires before customer pays | 🟡 Medium | 15-min countdown timer; one-click regenerate creates new Midtrans order |
| Supabase Realtime WebSocket drops mid-transaction | 🟡 Medium | 5-second polling fallback activates on channel disconnect; manual refresh button |
| WebUSB not supported in Safari | 🟡 Medium | Feature-detect before WebUSB call; graceful fallback to `react-to-print` |
| Webcam permission denied | 🟡 Medium | Default to USB mode; clear error instructions; no crash |
| Midtrans webhook delivery failure | 🟡 Medium | Midtrans retries for 24h; manual status reconciliation endpoint available |
| Concurrent multi-cashier stock conflict | 🟡 Medium | Stock deducted only on `payment_status = 'paid'` webhook; optimistic UI shows pending |

---

## 13. Open Questions

The following decisions are pending and will impact schema or implementation scope:

| # | Question | Technical Impact |
|---|---|---|
| 1 | **Offline mode** — if internet drops mid-transaction, is there a cash payment fallback? | Requires local IndexedDB persistence and sync-on-reconnect reconciliation |
| 2 | **Stock deduction timing** — deduct on cart add, or only when payment confirmed? | Deduct-on-confirm is safer but shows misleading stock during pending transactions |
| 3 | **Multi-cashier concurrency** — can two cashiers transact simultaneously on different devices? | Requires optimistic locking or transaction-level stock reservation to prevent overselling |
| 4 | **Digital receipt** — WhatsApp/email copy in addition to print, or print only? | Requires WhatsApp Business API or SMTP + customer contact capture at checkout |
| 5 | **Multi-branch** — single store or multiple outlets with separate inventories? | Requires `outlet_id` FK on products and transactions; RLS must scope per outlet |
| 6 | **Admin analytics** — real-time dashboard or end-of-day reports only? | Real-time requires live Supabase Realtime subscription on transactions in dashboard |

---

## 14. Success Metrics

- Transaction completion rate **> 99.5%** with zero duplicate charges across all test scenarios.
- QRIS payment confirmation delivered to cashier terminal **within 3 seconds** of customer payment.
- Barcode scan-to-cart time **under 500ms** for both USB and webcam inputs under normal network conditions.
- **Zero security incidents** — no unauthorized route access, no exposed credentials, no RLS bypass in penetration testing.
- All three printer tiers (ESC/POS USB, thermal system printer, standard browser print) successfully print receipt **without driver installation**.
- Admin dashboard loads 30-day transaction report **in under 2 seconds** on standard broadband.
- All repeated-click scenarios (barcode, checkout, void, discount) produce **exactly one server-side effect** regardless of click speed.

---

## Revision History

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | April 2026 | Product & Engineering Team | Initial PRD — full requirements capture from architecture session |

---

*This document is confidential. Distribution is restricted to authorized team members only.*
<!-- END:nextjs-agent-rules -->
