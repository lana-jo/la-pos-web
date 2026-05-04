"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useChartData } from "@/hooks/useChartData";
import { DashboardStatsCards } from "@/components/admin/dashboard/StatsCard";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { TransactionChart } from "@/components/admin/dashboard/TransactionChart";
import { TopProductsChart } from "@/components/admin/dashboard/TopProductsChart";
import { PaymentMethodsChart } from "@/components/admin/dashboard/PaymentMethodsChart";
import { DateRangeFilter, AnalyticsOverview } from "@/components/admin/dashboard/DateRangeFilter";
import { MenuNavigation } from "@/components/admin/dashboard/MenuNavigation";
import { RecentActivityCard } from "@/components/admin/dashboard/RecentActivity";
import { ActivityDetailModal } from "@/components/admin/dashboard/ActivityDetailModal";
import { DateRange, PresetRange } from "@/types/dashboard";
import { getDateRangeForPreset } from "@/lib/dashboard/dateUtils";

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { userName } = useUserRole();
  
  // Set default date range to last 7 days
  const defaultRange = getDateRangeForPreset("7days");
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>("7days");
  const [mounted, setMounted] = useState(false);
  
  // Modal state for activity details
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Custom hooks for data fetching
  const { stats, loading: statsLoading } = useDashboardStats(dateRange);
  const { activities, loading: activitiesLoading } = useRecentActivities();
  const { chartData, loading: chartsLoading } = useChartData(dateRange);
  
  const loading = !mounted || statsLoading || activitiesLoading || chartsLoading;

  // ── Date handling ───────────────────────────────────────────────────────────

  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const newRange = getDateRangeForPreset(preset);
      setDateRange(newRange);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      setSelectedPreset("custom");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          DASHBOARD
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Welcome to Dashboard, {userName || 'User'}
        </p>
      </div>

      {/* ── Stats ── */}
      <DashboardStatsCards stats={stats} formatCurrency={formatCurrency} />

      {/* ── Charts Section ── */}
      <AnalyticsOverview>
        <DateRangeFilter
          dateRange={dateRange}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          onDateRangeChange={handleDateRangeChange}
        />
      </AnalyticsOverview>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={chartData.dailyRevenue}
          preset={selectedPreset}
          formatCurrency={formatCurrency}
        />
        <TransactionChart
          data={chartData.dailyRevenue}
          preset={selectedPreset}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart
          data={chartData.topProducts}
          preset={selectedPreset}
          formatCurrency={formatCurrency}
        />
        <PaymentMethodsChart
          data={chartData.paymentMethods}
          preset={selectedPreset}
        />
      </div>

      {/* ── Menu Summary ── */}
      <MenuNavigation />

      {/* ── Recent Activity ── */}
      <RecentActivityCard activities={activities} formatCurrency={formatCurrency} onActivityClick={handleActivityClick} />
      
      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
