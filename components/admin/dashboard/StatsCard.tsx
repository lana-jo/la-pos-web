"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
}

const TrendBadge = ({ value }: { value: number }) => (
  <div className="flex items-center text-xs text-muted-foreground">
    {value >= 0 ? (
      <TrendingUp className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <TrendingDown className="h-3 w-3 mr-1 text-rose-600 dark:text-rose-400" />
    )}
    <span
      className={
        value >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      }
    >
      {Math.abs(value).toFixed(1)}%
    </span>
    &nbsp;dari periode sebelumnya
  </div>
);

export const StatsCard = ({ title, value, icon: Icon, trend, subtitle }: StatsCardProps) => (
  <Card className="h-full border-none shadow-lg bg-card/40 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden relative group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon className="h-24 w-24 -mr-8 -mt-8" />
    </div>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
      <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </CardHeader>
    <CardContent className="relative z-10">
      <div className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">{value}</div>
      {trend !== undefined && (
        <div className="mt-2">
          <TrendBadge value={trend} />
        </div>
      )}
      {subtitle && <div className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</div>}
    </CardContent>
  </Card>
);

interface DashboardStatsCardsProps {
  stats: DashboardStats;
  formatCurrency: (amount: number) => string;
}

export const DashboardStatsCards = ({ stats, formatCurrency }: DashboardStatsCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
    <StatsCard
      title="Pendapatan Hari Ini"
      value={formatCurrency(stats.todayRevenue)}
      icon={DollarSign}
      trend={stats.revenueChange}
    />
    <StatsCard
      title="Transaksi Hari Ini"
      value={stats.todayTransactions}
      icon={ShoppingCart}
      trend={stats.transactionChange}
    />
    <StatsCard
      title="Total Produk"
      value={stats.totalProducts}
      icon={Package}
      subtitle="Produk aktif di katalog"
    />
    <StatsCard
      title="Total Pengguna"
      value={stats.totalUsers}
      icon={Users}
      subtitle="Pengguna terdaftar"
    />
  </div>
);
