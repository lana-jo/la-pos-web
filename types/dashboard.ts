export type TransactionRow = {
  total: number;
  payment_status: string;
};

export interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  totalProducts: number;
  totalUsers: number;
  todayRevenue: number;
  todayTransactions: number;
  revenueChange: number;
  transactionChange: number;
}

export interface RecentActivity {
  id: string;
  type: "transaction" | "user" | "product";
  description: string;
  user_name?: string;
  amount?: number;
  created_at: string;
}

export interface ChartData {
  dailyRevenue: Array<{ date: string; revenue: number; transactions: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  paymentMethods: Array<{ method: string; count: number; percentage: number }>;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export type PresetRange =
  | "7days"
  | "30days"
  | "90days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export const DEFAULT_STATS: DashboardStats = {
  totalRevenue: 0,
  totalTransactions: 0,
  totalProducts: 0,
  totalUsers: 0,
  todayRevenue: 0,
  todayTransactions: 0,
  revenueChange: 0,
  transactionChange: 0,
};
