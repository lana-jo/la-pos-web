import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  Store,
  CreditCard,
  FileText,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface DropdownItem {
  type: "dropdown";
  label: string;
  icon: LucideIcon;
  items: {
    href: string;
    label: string;
    description?: string;
  }[];
}

export type NavigationConfig = (NavigationItem | DropdownItem)[];

const baseItems: NavigationConfig = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Ringkasan sistem",
  },
];

const adminItems: NavigationConfig = [
  {
    type: "dropdown",
    label: "Produk",
    icon: Package,
    items: [
      {
        href: "/dashboard/products",
        label: "Daftar Produk",
        description: "Kelola semua produk",
      },
      {
        href: "/dashboard/products/variants",
        label: "Varian Produk",
        description: "Kelola varian harga produk",
      },
      {
        href: "/dashboard/categories",
        label: "Kategori",
        description: "Kelola kategori produk",
      },
      {
        href: "/dashboard/units",
        label: "Satuan",
        description: "Kelola satuan ukuran",
      },
      {
        href: "/dashboard/suppliers",
        label: "Pemasok",
        description: "Kelola data pemasok",
      },
      {
        href: "/dashboard/stock",
        label: "Manajemen Stok",
        description: "Pantau dan kelola stok",
      },
    ],
  },
  {
    type: "dropdown",
    label: "Pengguna",
    icon: Users,
    items: [
      {
        href: "/dashboard/users",
        label: "Semua Pengguna",
        description: "Kelola semua pengguna",
      },
    ],
  },
  {
    type: "dropdown",
    label: "Kasir",
    icon: CreditCard,
    items: [
      {
        href: "/dashboard/cashiers",
        label: "Akun Kasir",
        description: "Kelola akun kasir",
      },
      {
        href: "/dashboard/shifts",
        label: "Shift",
        description: "Pemantauan shift kasir",
      },
      {
        href: "/dashboard/cashier-actions",
        label: "Aksi Kasir",
        description: "Log pembatalan, pengembalian, diskon",
      },
    ],
  },
  {
    href: "/dashboard/reports",
    label: "Laporan Penjualan",
    icon: BarChart3,
    description: "Analisis penjualan",
  },
  {
    href: "/dashboard/settings",
    label: "Pengaturan",
    icon: Settings,
    description: "Konfigurasi sistem",
  },
];

const cashierItems: NavigationConfig = [
  {
    href: "/pos",
    label: "Kasir POS",
    icon: ShoppingCart,
    description: "Terminal POS",
  },
  {
    type: "dropdown",
    label: "Manajemen",
    icon: Store,
    items: [
      {
        href: "/cashier/shifts",
        label: "Shift",
        description: "Buka/tutup shift kasir",
      },
      {
        href: "/cashier/customers",
        label: "Pelanggan",
        description: "Data pelanggan & hutang",
      },
      {
        href: "/cashier/debts",
        label: "Hutang",
        description: "Kelola hutang pelanggan",
      },
    ],
  },
  {
    href: "/cashier/transactions",
    label: "Transaksi Saya",
    icon: FileText,
    description: "Riwayat transaksi",
  },
];

const customerItems: NavigationConfig = [
  {
    href: "/catalog",
    label: "Katalog Produk",
    icon: Package,
    description: "Jelajahi produk",
  },
];

export const getNavigationByRole = (
  role: "admin" | "cashier" | "customer"
): NavigationConfig => {
  switch (role) {
    case "admin":
      return [cashierItems[0], ...baseItems, ...adminItems];
    case "cashier":
      return cashierItems;
    case "customer":
      return customerItems;
    default:
      return baseItems;
  }
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  cashier: "Kasir",
  customer: "Pelanggan",
};
