"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useTheme } from "next-themes";
import { ChartData } from "@/types/dashboard";
import { getPresetLabel } from "@/lib/dashboard/dateUtils";

interface TransactionChartProps {
  data: ChartData["dailyRevenue"];
  preset: string;
}

export const TransactionChart = ({ data, preset }: TransactionChartProps) => {
  const { theme } = useTheme();

  const getThemeColors = () => {
    const isDark = theme === "dark";
    return {
      transactions: isDark ? "hsl(var(--chart-2))" : "hsl(var(--chart-2))",
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

  return (
    <Card className="pos-modal-content border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary-brand" />
          Volume Transaksi ({getPresetLabel(preset as any)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
              {...getAxisTheme()}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              formatter={(value) => [
                value,
                "Transaksi",
              ]}
              labelFormatter={(label) => `Tanggal: ${label}`}
              contentStyle={{
                ...getTooltipTheme().contentStyle,
                fontSize: 12,
              }}
              labelStyle={getTooltipTheme().labelStyle}
            />
            <Bar
              dataKey="transactions"
              fill={getThemeColors().transactions}
              animationDuration={1200}
              animationBegin={200}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
