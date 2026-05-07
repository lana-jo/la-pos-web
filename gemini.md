# Panduan Proyek untuk Gemini (la-pos-web)

## 📌 Deskripsi Proyek
Sistem Point of Sale (POS) berbasis web modern yang dirancang untuk toko kelontong atau ritel. Aplikasi ini memiliki fitur manajemen operasional dan inventaris, antarmuka kasir yang responsif, serta dukungan perangkat keras (pemindai kode bar dan pencetak resit). Sistem ini menyokong pelbagai peranan pengguna (Admin, Kasir, dan Pelanggan).

## 🛠️ Teknologi Utama (Tech Stack)
- **Rangka Kerja (Framework):** Next.js (App Router)
- **Bahasa Pengaturcaraan:** TypeScript
- **Reka Bentuk (Styling):** Tailwind CSS & komponen `shadcn/ui`
- **Pangkalan Data & Pengesahan:** Supabase (PostgreSQL, Auth, RLS, Storage)
- **Pengurusan Keadaan (State Management):** Zustand (khususnya untuk troli POS)
- **Gerbang Pembayaran:** Midtrans
- **Integrasi Perkakasan:** USB/Webcam Barcode Scanner & ESC/POS Thermal Printer

## 📂 Struktur Direktori Utama
- `app/`: Menggunakan sistem penghalaan Next.js App Router dengan *Route Groups*:
  - `(admin)/`: Papan pemuka (dashboard) untuk pengurusan inventori, syif, staf, dan laporan.
  - `(cashier)/`: Antarmuka POS utama untuk memproses transaksi.
  - `(customer)/`: Halaman katalog produk awam.
  - `(auth)/`: Pengesahan log masuk dan pendaftaran pengguna.
- `components/`: Komponen UI React yang dibahagikan mengikut domain (`admin/`, `pos/`, `layout/`, `ui/`).
- `hooks/`: *Custom React Hooks* untuk logik POS, pengurusan syif, dan peranti keras (misalnya `useUSBScanner`, `useWebcamScanner`).
- `lib/`: Fungsi utiliti, konfigurasi Supabase (`client.ts`, `server.ts`), dan **Server Actions** untuk interaksi pangkalan data (`actions.ts`).
- `store/`: Konfigurasi *global state* Zustand (`store/cart.ts`).
- `types/`: Definisi jenis TypeScript (`.ts`).
- `supabase/migrations/`: Fail migrasi SQL untuk skema pangkalan data dan dasar RLS.

## ✍️ Konvensyen Pengekodan (Coding Conventions)
1. **Diutamakan TypeScript:** Gunakan jenis data yang ketat (strict typing). Elakkan penggunaan `any`. Rujuk atau tambah antara muka (interfaces) baharu di dalam folder `types/`.
2. **Seni Bina Next.js App Router:**
   - Jadikan **React Server Components (RSC)** sebagai pilihan lalai.
   - Gunakan arahan `"use client"` HANYA apabila komponen memerlukan API pelayar, *state* (useState), atau *lifecycle hooks* (useEffect).
   - Segala operasi pangkalan data (CRUD) mesti menggunakan **Server Actions** (`"use server"`) yang diasingkan mengikut fungsi di dalam folder `lib/[domain]/actions.ts`.
3. **Penggayaan (Styling):** Sentiasa gunakan kelas utiliti Tailwind CSS. Manfaatkan komponen sedia ada daripada `components/ui/` (shadcn) sebelum membina komponen baharu.
4. **Keselamatan & Pangkalan Data (Supabase):**
   - Hormati dasar Keselamatan Peringkat Baris (Row Level Security - RLS).
   - Pastikan penggunaan klien Supabase yang betul:
     - `createClient()` dari `lib/supabase/client.ts` untuk komponen klien.
     - `createClient()` dari `lib/supabase/server.ts` untuk Server Components/Actions.

## 🤖 Arahan Khas untuk AI (Gemini)
- **Konteks Perkakasan:** Jika anda diminta untuk mengemas kini bahagian Kasir (`(cashier)`), perhatikan kebergantungan pada fungsi pengimbas (scanner) dan pencetak resit (printer). Jangan ubah *hooks* perkakasan yang sedia berfungsi dengan baik tanpa arahan eksplisit.
- **Penyelesaian Lengkap:** Sediakan kod penyelesaian yang komprehensif termasuk pengendalian ralat (*error handling*), terutamanya bagi fungsi `try/catch` pada Server Actions.
- **Pengurusan Skema SQL:** Sekiranya terdapat arahan untuk mengubah struktur pangkalan data atau dasar RLS, hasilkan kod tersebut sebagai **fail migrasi SQL baharu** (untuk diletakkan di `supabase/migrations/`), dan BUKAN skrip log penyahpepijatan (debugging script) generik.
- Sentiasa pastikan gaya jawapan mencerminkan tahap kepakaran jurutera perisian kanan (senior software engineer).
