"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Tag,
  Database,
  Users,
  UserCheck,
  Shield,
  Settings,
  Activity,
  Store,
  PieChart,
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
  disabled?: boolean;
}

interface MenuSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: MenuItem[];
}

const MenuCard = ({ href, icon: Icon, color, title, description, disabled }: MenuItem) => {
  const content = (
    <div className={`p-4 rounded-lg border transition-all duration-300 ${disabled ? 'opacity-50' : 'hover:bg-muted/50 hover:shadow-md hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer'}`}>
      <Icon className={`h-6 w-6 mb-2 transition-transform duration-200 ${disabled ? 'text-gray-400' : color} ${!disabled && 'hover:scale-110'}`} />
      <h4 className={`font-medium transition-colors duration-200 ${!disabled && 'hover:text-primary'}`}>{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  return disabled ? (
    <div>{content}</div>
  ) : (
    <Link href={href}>{content}</Link>
  );
};

export const MenuSection = ({ title, icon: Icon, iconColor, items }: MenuSectionProps) => (
  <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 hover:text-primary transition-colors duration-200">
        <Icon className={`h-5 w-5 ${iconColor} transition-transform duration-300 hover:rotate-12`} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <MenuCard key={item.title} {...item} />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const MenuNavigation = () => (
  <div className="space-y-6 mb-8">
    <div className="flex items-center gap-2 mb-4 p-4 rounded-lg bg-card border transition-all duration-300 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5">
      <Settings className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors duration-200" />
      <h2 className="text-lg font-semibold hover:text-primary transition-colors duration-200">Ringkasan Menu</h2>
    </div>

    {/* Product Management */}
    <MenuSection
      title="Manajemen Produk"
      icon={Package}
      iconColor="text-blue-600"
      items={[
        {
          href: "/dashboard/products",
          icon: Package,
          color: "text-blue-600",
          title: "Produk",
          description: "Tambah, edit, dan kelola inventaris produk",
        },
        {
          href: "/dashboard/categories",
          icon: Tag,
          color: "text-green-600",
          title: "Kategori",
          description: "Atur produk berdasarkan kategori",
        },
        {
          href: "/dashboard/stock",
          icon: Database,
          color: "text-indigo-600",
          title: "Manajemen Stok",
          description: "Lacak tingkat inventaris",
        },
      ]}
    />

    {/* User Management */}
    <MenuSection
      title="Manajemen Pengguna"
      icon={Users}
      iconColor="text-purple-600"
      items={[
        {
          href: "/dashboard/users",
          icon: UserCheck,
          color: "text-purple-600",
          title: "Semua Pengguna",
          description: "Kelola akun admin, kasir, dan pelanggan",
        },
        {
          href: "/dashboard/cashiers",
          icon: Shield,
          color: "text-orange-600",
          title: "Kasir",
          description: "Kelola izin dan PIN kasir",
        },
        {
          href: "#",
          icon: Settings,
          color: "text-gray-400",
          title: "Peran & Izin",
          description: "Konfigurasi peran pengguna (Segera Hadir)",
          disabled: true,
        },
      ]}
    />

    {/* Operations */}
    <MenuSection
      title="Operasional"
      icon={Activity}
      iconColor="text-orange-600"
      items={[
        {
          href: "/pos",
          icon: Store,
          color: "text-red-600",
          title: "Terminal POS",
          description: "Buka sistem point of sale",
        },
        {
          href: "/dashboard/reports",
          icon: PieChart,
          color: "text-indigo-600",
          title: "Laporan",
          description: "Analitik dan wawasan penjualan",
        },
        {
          href: "#",
          icon: CreditCard,
          color: "text-gray-400",
          title: "Transaksi",
          description: "Lihat semua transaksi (Segera Hadir)",
          disabled: true,
        },
        {
          href: "#",
          icon: Receipt,
          color: "text-gray-400",
          title: "Pengaturan Resit",
          description: "Konfigurasi templat resit (Segera Hadir)",
          disabled: true,
        },
      ]}
    />

    {/* System Settings */}
    <MenuSection
      title="Pengaturan Sistem"
      icon={Settings}
      iconColor="text-gray-600"
      items={[
        {
          href: "#",
          icon: FileText,
          color: "text-gray-400",
          title: "Log Sistem",
          description: "Lihat log aktivitas sistem (Segera Hadir)",
          disabled: true,
        },
        {
          href: "#",
          icon: AlertCircle,
          color: "text-gray-400",
          title: "Cadangkan & Pulihkan",
          description: "Manajemen cadangan data (Segera Hadir)",
          disabled: true,
        },
        {
          href: "#",
          icon: CheckCircle,
          color: "text-gray-400",
          title: "Kesehatan Sistem",
          description: "Pantau status sistem (Segera Hadir)",
          disabled: true,
        },
      ]}
    />
  </div>
);
