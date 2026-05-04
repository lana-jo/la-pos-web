# POS Web Application

A comprehensive Point of Sale (POS) system for Indonesian retail businesses, built with Next.js 14+ and Supabase. Features barcode scanning, QRIS payments, receipt printing, and role-based access control.

## Features

### Core Functionality
- **Barcode Scanning**: USB scanner + webcam scanner support
- **QRIS Payments**: Dynamic QR code generation via Midtrans (GoPay)
- **Real-time Updates**: Instant payment confirmation via Supabase Realtime
- **Receipt Printing**: 3-tier strategy (ESC/POS USB, thermal system printer, browser print)
- **Role-based Access**: Admin, Cashier, and Customer roles with proper permissions

### Technical Highlights
- **Stale-closure Prevention**: `useRef`-based locks prevent first-click-only bugs
- **Sequential Processing**: Barcode queue prevents race conditions
- **Security**: Row Level Security, JWT role claims, HMAC-verified webhooks
- **Type Safety**: Full TypeScript implementation with strict mode

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Payment**: Midtrans API (QRIS GoPay integration)
- **UI**: shadcn/ui components, Lucide icons
- **State**: Zustand for cart management
- **Deployment**: Vercel + Supabase

## Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase project
- Midtrans account (for QRIS payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd pos-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_API_URL=https://api.midtrans.com

# Application Configuration
NEXT_PUBLIC_APP_NAME=POS System
NEXT_PUBLIC_STORE_NAME=POS Store
NEXT_PUBLIC_STORE_ADDRESS=123 Main St, City, Country
NEXT_PUBLIC_STORE_PHONE=+62 123 456 789
```

### Database Setup

1. Create the database schema by running the Supabase migrations:
```bash
# Apply migration files from supabase/migrations/
supabase db push
```

2. The schema includes:
   - `profiles` - User roles and authentication
   - `categories` - Product categories
   - `products` - Product catalog with barcodes
   - `transactions` - Sales transactions
   - `transaction_items` - Transaction line items
   - `cashier_actions` - Audit log for sensitive operations

3. Row Level Security (RLS) policies are automatically applied.

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Application Structure

### Routes
- `/` - Redirects to catalog
- `/catalog` - Public product catalog
- `/login` - Staff authentication
- `/pos` - Cashier POS terminal
- `/dashboard` - Admin dashboard
- `/dashboard/products` - Product management
- `/dashboard/categories` - Category management
- `/dashboard/users` - User management
- `/dashboard/reports` - Sales reports

### User Roles

**Admin**
- Full system access
- Product and category management
- User management and PIN assignment
- Sales analytics and reports

**Cashier**
- POS terminal access
- Barcode scanning and cart management
- QRIS payment processing
- Transaction history

**Customer**
- Public product catalog browsing
- Product search and filtering

## Development

### Key Components

#### Barcode Scanning
- `hooks/useUSBScanner.ts` - USB scanner keyboard emulation
- `hooks/useWebcamScanner.ts` - Webcam scanner with Quagga2
- `hooks/useBarcodeQueue.ts` - Sequential processing queue

**Camera Setup**: See [docs/camera-setup.md](docs/camera-setup.md) for detailed camera configuration and troubleshooting.

#### Payment Processing
- `lib/payment/midtrans.ts` - Midtrans QRIS integration
- `app/api/payment/webhook/route.ts` - Payment confirmation webhook

#### Receipt Printing
- `components/pos/Receipt.tsx` - Receipt component
- `lib/printer/printManager.ts` - 3-tier printing strategy

#### State Management
- `store/cart.ts` - Zustand cart store with functional updaters
- `hooks/usePOSAction.ts` - Universal async action lock

### Security Features

- **Route Protection**: Middleware-based role checking
- **RLS Policies**: Database-level access control
- **PIN Validation**: bcrypt-hashed PINs for sensitive operations
- **Webhook Security**: HMAC-SHA512 signature verification
- **Audit Trail**: Immutable cashier action logging

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary and confidential.
