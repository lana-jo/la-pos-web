"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useTheme } from "next-themes";
import { ChartData } from "@/types/dashboard";
import { getPresetLabel } from "@/lib/dashboard/dateUtils";

interface RevenueChartProps {
  data: ChartData["dailyRevenue"];
  preset: string;
  formatCurrency: (amount: number) => string;
}

export const RevenueChart = ({ data, preset, formatCurrency }: RevenueChartProps) => {
  const { theme } = useTheme();

  const getThemeColors = () => {
    const isDark = theme === "dark";
    return {
      revenue: isDark ? "hsl(var(--chart-1))" : "hsl(var(--chart-1))",
    };
  };

  const getTooltipTheme = () => {
    const isDark = theme === "dark";
    return {
      contentStyle: {
        backgroundColor: isDark ? "hsl(var(--background))" : "#fff",
        border: `1px solid ${isDark ? "hsl(var(--border))" : "#e5e7eb"}`,
        borderRadius: "6px",
        color: isDark ? "hsl(var(--foreground))" : "#111827",
      },
      labelStyle: {
        color: isDark ? "hsl(var(--muted-foreground))" : "#6b7280",
      },
    };
  };

  const getAxisTheme = () => {
    const isDark = theme === "dark";
    return {
      tick: { fill: isDark ? "hsl(var(--muted-foreground))" : "#6b7280" },
      line: { stroke: isDark ? "hsl(var(--border))" : "#e5e7eb" },
    };
  };

  const getLegendTheme = () => {
    const isDark = theme === "dark";
    return {
      wrapperStyle: {
        paddingTop: "20px",
      },
      iconType: "circle" as const,
      formatter: (value: string) => (
        <span style={{ color: isDark ? "hsl(var(--foreground))" : "#111827" }}>
          {value}
        </span>
      ),
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          <span className="text-sm sm:text-base">Revenue Trend ({getPresetLabel(preset as any)})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250} minHeight={300}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "hsl(var(--border))" : "#e5e7eb"}
            />
            <XAxis 
              dataKey="date" 
              {...getAxisTheme()}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickFormatter={(value) => {
                if (value >= 1000000000) {
                  return `Rp${(value / 1000000000).toFixed(1)}M`;
                } else if (value >= 1000000) {
                  return `Rp${(value / 1000000).toFixed(1)}jt`;
                } else if (value >= 1000) {
                  return `Rp${(value / 1000).toFixed(0)}rb`;
                } else {
                  return `Rp${value}`;
                }
              }}
              {...getAxisTheme()}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value)),
                "Revenue",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
              {...getTooltipTheme()}
              contentStyle={{
                fontSize: 12
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={getThemeColors().revenue}
              strokeWidth={1.5}
              dot={{ fill: getThemeColors().revenue, strokeWidth: 3, r: 4 }}
              activeDot={{ r: 5 }}
              {...getLegendTheme()}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
