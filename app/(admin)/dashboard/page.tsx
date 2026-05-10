"use client";

import { useEffect, useState, useRef } from "react";
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
  
  // Refs for logging
  const renderCount = useRef(0);
  const performanceStart = useRef<number>(Date.now());

  // ─── Logging Functions ────────────────────────────────────────────────────────

  const logDashboardEvent = (event: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[DASHBOARD] ${timestamp} - ${event}`, data || '');
  };

  const logPerformance = (operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    console.log(`[DASHBOARD PERFORMANCE] ${operation}: ${duration}ms`);
  };

  const logError = (error: Error, context: string) => {
    console.error(`[DASHBOARD ERROR] ${context}:`, error);
  };

  const logUserInteraction = (action: string, details?: any) => {
    console.log(`[DASHBOARD USER] ${action} by ${userName || 'unknown'}`, details || '');
  };

  // ─── Component Lifecycle Logging ───────────────────────────────────────────────

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    logDashboardEvent('Component mounted', { userName, defaultRange });
  }, []);

  // Log render count
  renderCount.current += 1;
  if (renderCount.current === 1) {
    logDashboardEvent('First render', { renderCount: renderCount.current });
  }

  // Custom hooks for data fetching
  const { stats, loading: statsLoading } = useDashboardStats(dateRange);
  const { activities, loading: activitiesLoading } = useRecentActivities();
  const { chartData, loading: chartsLoading } = useChartData(dateRange);
  
  const loading = !mounted || statsLoading || activitiesLoading || chartsLoading;

  // ─── Data Fetching Logging ─────────────────────────────────────────────────────

  useEffect(() => {
    logDashboardEvent('Data fetching state changed', {
      statsLoading,
      activitiesLoading,
      chartsLoading,
      mounted,
      dateRange
    });
  }, [statsLoading, activitiesLoading, chartsLoading, mounted, dateRange]);

  useEffect(() => {
    if (stats) {
      logDashboardEvent('Stats data received', { 
        totalRevenue: stats.totalRevenue,
        totalTransactions: stats.totalTransactions,
        totalProducts: stats.totalProducts,
        totalUsers: stats.totalUsers,
        todayRevenue: stats.todayRevenue,
        todayTransactions: stats.todayTransactions
      });
    }
  }, [stats]);

  useEffect(() => {
    if (activities && activities.length > 0) {
      logDashboardEvent('Activities data received', { 
        count: activities.length,
        latestActivity: activities[0]?.type
      });
    }
  }, [activities]);

  useEffect(() => {
    if (chartData) {
      logDashboardEvent('Chart data received', {
        dailyRevenueCount: chartData.dailyRevenue?.length || 0,
        topProductsCount: chartData.topProducts?.length || 0,
        paymentMethodsCount: chartData.paymentMethods?.length || 0
      });
    }
  }, [chartData]);

  // ── Date handling ───────────────────────────────────────────────────────────

  const handlePresetChange = (preset: PresetRange) => {
    const startTime = Date.now();
    logUserInteraction('Date preset changed', { 
      from: selectedPreset, 
      to: preset 
    });
    
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const newRange = getDateRangeForPreset(preset);
      setDateRange(newRange);
      logPerformance('Date preset change', startTime);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      const startTime = Date.now();
      logUserInteraction('Custom date range selected', { 
        from: dateRange, 
        to: range 
      });
      
      setDateRange(range);
      setSelectedPreset("custom");
      logPerformance('Date range change', startTime);
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
    const startTime = Date.now();
    logUserInteraction('Activity clicked', { 
      activityId: activity.id, 
      activityType: activity.type,
      description: activity.description
    });
    
    setSelectedActivity(activity);
    setIsModalOpen(true);
    logPerformance('Activity click handler', startTime);
  };

  const handleModalClose = () => {
    logUserInteraction('Activity modal closed', { 
      activityId: selectedActivity?.id 
    });
    
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  // ─── Performance Logging ───────────────────────────────────────────────────────

  useEffect(() => {
    const renderTime = Date.now() - performanceStart.current;
    logPerformance('Dashboard render complete', performanceStart.current);
    logDashboardEvent('Dashboard fully loaded', { 
      renderTime,
      userName,
      dateRange,
      hasStats: !!stats,
      hasActivities: !!activities,
      hasChartData: !!chartData
    });
  }, [stats, activities, chartData, userName, dateRange]);

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

  if (!mounted) return null;

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
