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
    &nbsp;from previous period
  </div>
);

export const StatsCard = ({ title, value, icon: Icon, trend, subtitle }: StatsCardProps) => (
  <Card className="h-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
      <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-lg sm:text-xl md:text-2xl font-bold">{value}</div>
      {trend !== undefined && <TrendBadge value={trend} />}
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
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
      title="Today's Revenue"
      value={formatCurrency(stats.todayRevenue)}
      icon={DollarSign}
      trend={stats.revenueChange}
    />
    <StatsCard
      title="Today's Transactions"
      value={stats.todayTransactions}
      icon={ShoppingCart}
      trend={stats.transactionChange}
    />
    <StatsCard
      title="Total Products"
      value={stats.totalProducts}
      icon={Package}
      subtitle="Active products in catalog"
    />
    <StatsCard
      title="Total Users"
      value={stats.totalUsers}
      icon={Users}
      subtitle="Registered users"
    />
  </div>
);
